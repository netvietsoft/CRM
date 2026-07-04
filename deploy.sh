#!/usr/bin/env bash
# =============================================================================
# CRM unified staging deploy (frontend + backend-nestjs) via PM2.
#
# Model: build ON server. Local sanity + env selection, then the server does
# git fetch + reset --hard origin/main, corepack yarn install (dev+prod),
# build BOTH apps, verify artifacts, THEN prisma migrate/seed, then pm2, then
# an HTTP health gate. All under fnm node 24.16.0 + yarn 4.15.0.
#
# Selected env files are scp'd to the server as .env (never committed, never
# parsed/echoed). Interactive: pick BE env, FE env, server IP, SSH user.
#
# Design + red-team notes:
#   plans/260704-0942-crm-staging-deploy-pm2/
#
# Usage:
#   ./deploy.sh              interactive deploy
#   ./deploy.sh --dry-run    print the ordered plan; perform NO side effects
#
# Non-interactive overrides (used by tests/CI): BE_ENV FE_ENV SERVER_IP SSH_USER
# =============================================================================

# Enable strict mode only when executed, not when sourced (so the test harness
# can source this file to unit-test the pure helpers without inheriting `set -e`).
if ! (return 0 2>/dev/null); then
  set -euo pipefail
fi

readonly REQUIRED_NODE="24.16.0"
readonly REQUIRED_YARN="4.15.0"
readonly SERVER_DIR="/home/netviet/projects-deploy/CRM"
readonly REPO_URL="git@github.com:netvietsoft/CRM.git"
readonly FE_DIR="frontend"
readonly BE_DIR="backend-nestjs"
readonly BE_PORT=3070
readonly FE_PORT=3069

# Required env keys — must be present AND non-empty (red-team H6/H9).
readonly BE_REQUIRED_KEYS=(DATABASE_URL JWT_SECRET FRONTEND_URL)
# BACKEND_API_URL: server-side proxy target (src/proxy.ts). NEXT_PUBLIC_API_URL:
# read by client components (inlined at build) — must be present or the prod
# bundle silently falls back to localhost (red-team code-review H1).
readonly FE_REQUIRED_KEYS=(BACKEND_API_URL NEXT_PUBLIC_API_URL)

DRY_RUN="${DRY_RUN:-0}"

# --------------------------------------------------------------------------- #
# Pure helpers (unit-tested by tests/deploy.test.sh)                          #
# --------------------------------------------------------------------------- #

# env_has_key <file> <key> : true if key is present with a non-empty value.
# Rejects `KEY=` (blank), leading-whitespace, and `# KEY=` comments.
env_has_key() {
  grep -qE "^[[:space:]]*${2}=[[:space:]]*[^[:space:]#]" "$1"
}

# validate_env_file <label> <file> <key...> : 0 ok / 1 + stderr message.
validate_env_file() {
  local label="$1" file="$2"
  shift 2
  if [[ ! -f "$file" ]]; then
    echo "❌ [$label] env file not found: $file" >&2
    return 1
  fi
  if [[ ! -s "$file" ]]; then
    echo "❌ [$label] env file is empty: $file" >&2
    return 1
  fi
  local key
  local -a missing=()
  for key in "$@"; do
    env_has_key "$file" "$key" || missing+=("$key")
  done
  if ((${#missing[@]} > 0)); then
    echo "❌ [$label] $file missing/blank required key(s): ${missing[*]}" >&2
    return 1
  fi
  return 0
}

# node_version_ok <observed> <required> : exact match, ignoring a leading 'v'.
node_version_ok() { [[ "${1#v}" == "${2#v}" ]]; }

# worktree_is_dirty <porcelain-output> : true (0) if non-empty.
worktree_is_dirty() { [[ -n "${1//[[:space:]]/}" ]]; }

# parse_args : set DRY_RUN from flags; unknown flag -> exit 2.
parse_args() {
  DRY_RUN=0
  local a
  for a in "$@"; do
    case "$a" in
      --dry-run) DRY_RUN=1 ;;
      *)
        echo "Unknown argument: $a" >&2
        exit 2
        ;;
    esac
  done
}

# run <cmd...> : execute, or in dry-run print the plan line (never execute).
run() {
  if [[ "$DRY_RUN" == 1 ]]; then
    printf '+ %s\n' "$*"
  else
    "$@"
  fi
}

# --------------------------------------------------------------------------- #
# Interactive helper (not unit-tested; side-effecting prompt)                 #
# --------------------------------------------------------------------------- #

# select_env_file <project_dir> <preset_var_name> : echo chosen env path.
# If the preset var (e.g. BE_ENV) is set, use it verbatim (may be absolute).
# Otherwise present a numbered menu of <dir>/.env*, defaulting to .env.prod.
select_env_file() {
  local dir="$1" preset="${!2:-}"
  if [[ -n "$preset" ]]; then
    echo "$preset"
    return 0
  fi
  local -a files=()
  local f
  while IFS= read -r f; do files+=("$f"); done < <(cd "$dir" && ls -1 .env* 2>/dev/null || true)
  if ((${#files[@]} == 0)); then
    echo "❌ no .env* files found in $dir/" >&2
    return 1
  fi
  local default_idx=1 i
  for i in "${!files[@]}"; do
    [[ "${files[$i]}" == ".env.prod" ]] && default_idx=$((i + 1))
  done
  {
    echo "Select env file for $dir/:"
    for i in "${!files[@]}"; do printf '  %d) %s\n' "$((i + 1))" "${files[$i]}"; done
  } >&2
  local choice
  read -rp "Choice [${default_idx}]: " choice
  choice="${choice:-$default_idx}"
  local sel="${files[$((choice - 1))]:-}"
  [[ -n "$sel" ]] || {
    echo "❌ invalid choice" >&2
    return 1
  }
  echo "$dir/$sel"
}

# --------------------------------------------------------------------------- #
# Remote scripts (values baked in locally; \$… stays literal for the server)  #
# --------------------------------------------------------------------------- #

fnm_preamble() {
  cat <<PREAMBLE
export PATH="\$HOME/.local/share/fnm:\$HOME/.fnm:\$PATH"
command -v fnm >/dev/null || { echo "fnm not found on server"; exit 1; }
eval "\$(fnm env)"; fnm use "${REQUIRED_NODE}"
PREAMBLE
}

remote_gate_script() {
  cat <<GATE
set -euo pipefail
$(fnm_preamble)
corepack enable >/dev/null 2>&1 || true
echo "NODE=\$(node -v)"
echo "YARN=\$(corepack yarn -v 2>/dev/null || echo none)"
command -v pm2 >/dev/null || { echo "MISSING_PM2"; exit 1; }
command -v git >/dev/null || { echo "MISSING_GIT"; exit 1; }
GATE
}

remote_sync_script() {
  cat <<SYNC
set -euo pipefail
$(fnm_preamble)
mkdir -p "${SERVER_DIR}"
cd "${SERVER_DIR}"
[ -d .git ] || git clone "${REPO_URL}" .
git fetch origin
git reset --hard origin/main
SYNC
}

remote_build_script() {
  cat <<BUILD
set -euo pipefail
$(fnm_preamble)
corepack enable
# Yarn Berry installs devDeps by default regardless of NODE_ENV, so @nestjs/cli,
# prisma, and ts-node are present for build/generate/seed (red-team C3). Build
# under production: `next build` breaks under NODE_ENV=development (React
# prerender "Cannot read properties of null (reading 'useContext')").
export NODE_ENV=production
# ---- build FIRST; DB is touched only after both artifacts exist (C1) ----
cd "${SERVER_DIR}/${BE_DIR}" && mkdir -p logs
corepack yarn install --immutable
npx prisma generate
corepack yarn build
[ -f dist/src/main.js ] || { echo "BE build produced no dist/src/main.js"; exit 1; }
cd "${SERVER_DIR}/${FE_DIR}" && mkdir -p logs
for i in 1 2 3; do corepack yarn install --immutable && break || { echo "FE install retry \$i"; sleep 5; }; done
corepack yarn build
[ -d .next ] || { echo "FE build produced no .next"; exit 1; }
# ---- DB changes (only reached if both builds succeeded) ----
cd "${SERVER_DIR}/${BE_DIR}"
npx prisma migrate status || true
npx prisma migrate deploy
npx prisma db seed
# ---- pm2: delete stale app on the cluster->fork / port cutover, then start (H11) ----
pm2 describe chy_crm_backend >/dev/null 2>&1 && pm2 delete chy_crm_backend || true
pm2 describe chy_crm_fe >/dev/null 2>&1 && pm2 delete chy_crm_fe || true
pm2 start "${SERVER_DIR}/${BE_DIR}/ecosystem.config.js"
pm2 start "${SERVER_DIR}/${FE_DIR}/ecosystem.config.js"
pm2 save
# ---- health gate: pm2 "online" != healthy (H7/M12) ----
healthy=0
for i in \$(seq 1 15); do
  if curl -fsS "http://127.0.0.1:${BE_PORT}/api/docs" >/dev/null 2>&1 \
    && curl -fsS "http://127.0.0.1:${FE_PORT}/" >/dev/null 2>&1; then healthy=1; break; fi
  sleep 2
done
[ "\$healthy" = 1 ] || { echo "HEALTH CHECK FAILED"; pm2 logs chy_crm_backend chy_crm_fe --lines 50 --nostream || true; exit 1; }
pm2 list
BUILD
}

# --------------------------------------------------------------------------- #
# Orchestration                                                               #
# --------------------------------------------------------------------------- #

main() {
  # Re-exec from a stable copy so a later git reset can't corrupt the running
  # script mid-execution (red-team H8). Preserve the original dir + args + env.
  if [[ "${DEPLOY_REEXEC:-}" != 1 ]]; then
    local orig_dir tmp
    orig_dir="$(cd "$(dirname "$0")" && pwd)"
    tmp="$(mktemp)"
    cp "$0" "$tmp"
    export DEPLOY_ORIG_DIR="$orig_dir" DEPLOY_REEXEC=1
    exec bash "$tmp" "$@"
  fi

  # We are the re-exec'd copy ($0 is the mktemp file); remove it on exit (M1).
  trap 'rm -f "$0"' EXIT

  parse_args "$@"

  local repo_root
  repo_root="${DEPLOY_ORIG_DIR:-$(cd "$(dirname "$0")" && pwd)}"
  cd "$repo_root"

  # --- prompts ---
  local be_env fe_env server_ip ssh_user
  be_env="$(select_env_file "$BE_DIR" BE_ENV)"
  fe_env="$(select_env_file "$FE_DIR" FE_ENV)"
  server_ip="${SERVER_IP:-}"
  [[ -n "$server_ip" ]] || read -rp "Server IP: " server_ip
  ssh_user="${SSH_USER:-}"
  [[ -n "$ssh_user" ]] || read -rp "SSH user: " ssh_user
  local remote="${ssh_user}@${server_ip}"

  echo "──────────────────────────────────────────────"
  echo " CRM deploy  →  ${remote}:${SERVER_DIR}"
  echo "   BE env: ${be_env}  (→ ${BE_DIR}/.env,  :${BE_PORT})"
  echo "   FE env: ${fe_env}  (→ ${FE_DIR}/.env,  :${FE_PORT})"
  echo "   node ${REQUIRED_NODE} · yarn ${REQUIRED_YARN} · build-on-server"
  echo "──────────────────────────────────────────────"
  if [[ "$DRY_RUN" == 0 ]]; then
    local confirm
    read -rp "Proceed? [y/N]: " confirm
    [[ "$confirm" == "y" || "$confirm" == "Y" ]] || {
      echo "Aborted."
      exit 1
    }
  fi

  # --- local preflight: env validation (read-only, runs in dry-run too) ---
  validate_env_file "BE" "$be_env" "${BE_REQUIRED_KEYS[@]}"
  validate_env_file "FE" "$fe_env" "${FE_REQUIRED_KEYS[@]}"

  # --- remote gate: node/yarn/pm2/git (real run parses output; dry prints intent) ---
  if [[ "$DRY_RUN" == 1 ]]; then
    run ssh "$remote" "remote gate: assert node ${REQUIRED_NODE}, yarn ${REQUIRED_YARN}, pm2, git"
  else
    ssh -o BatchMode=yes -o ConnectTimeout=8 "$remote" true ||
      { echo "❌ SSH to $remote failed (pre-seed known_hosts with ssh-keyscan?)"; exit 1; }
    local gate rnode ryarn
    gate="$(ssh -o BatchMode=yes "$remote" "$(remote_gate_script)")" ||
      { echo "❌ remote gate failed:"; echo "$gate"; exit 1; }
    rnode="$(printf '%s\n' "$gate" | sed -n 's/^NODE=//p' | head -1)"
    ryarn="$(printf '%s\n' "$gate" | sed -n 's/^YARN=//p' | head -1)"
    node_version_ok "$rnode" "$REQUIRED_NODE" ||
      { echo "❌ server node ${rnode:-?} != v${REQUIRED_NODE}"; exit 1; }
    node_version_ok "$ryarn" "$REQUIRED_YARN" ||
      { echo "❌ server yarn ${ryarn:-?} != ${REQUIRED_YARN} (add packageManager + corepack)"; exit 1; }
  fi

  # --- local clean: never destroy the working tree; refuse if dirty (H8) ---
  run git -C "$repo_root" fetch origin
  if [[ "$DRY_RUN" == 0 ]]; then
    if worktree_is_dirty "$(git -C "$repo_root" status --porcelain)"; then
      echo "❌ local worktree is dirty — commit/stash before deploying:" >&2
      git -C "$repo_root" status --short >&2
      exit 1
    fi
  fi

  # --- session A: sync server source to origin/main ---
  run ssh "$remote" "$(remote_sync_script)"

  # --- ship env AFTER reset, BEFORE install/build (paths only; never contents) ---
  run scp "$be_env" "${remote}:${SERVER_DIR}/${BE_DIR}/.env"
  run scp "$fe_env" "${remote}:${SERVER_DIR}/${FE_DIR}/.env"
  if [[ "$DRY_RUN" == 1 ]]; then
    run ssh "$remote" "assert ${BE_DIR}/.env and ${FE_DIR}/.env present and non-empty"
  else
    ssh -o BatchMode=yes "$remote" \
      "[ -s '${SERVER_DIR}/${BE_DIR}/.env' ] && [ -s '${SERVER_DIR}/${FE_DIR}/.env' ]" ||
      { echo "❌ env not present on server after scp"; exit 1; }
  fi

  # --- session B: build → migrate → seed → pm2 → health ---
  run ssh "$remote" "$(remote_build_script)"

  echo "✅ Deploy complete."
}

# Run main only when executed directly (not when sourced by the test harness).
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi

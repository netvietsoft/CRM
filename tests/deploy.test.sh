#!/usr/bin/env bash
# Zero-dependency test harness for deploy.sh (no bats required).
# Sources deploy.sh (main guard prevents execution), tests pure helpers,
# then runs deploy.sh --dry-run to assert the emitted plan ordering.
#
# Usage: bash tests/deploy.test.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY="$REPO_ROOT/deploy.sh"

PASS=0
FAIL=0
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAIL=$((FAIL + 1)); }
ok()   { printf '  \033[32mPASS\033[0m %s\n' "$1"; PASS=$((PASS + 1)); }

assert_ok()   { if "$@"; then ok "$DESC"; else fail "$DESC (expected success)"; fi; }
assert_fail() { if "$@"; then fail "$DESC (expected failure)"; else ok "$DESC"; fi; }

# ---- source deploy.sh for pure-helper testing (must not run main) ----
# shellcheck disable=SC1090
source "$DEPLOY"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "== env_has_key =="
printf 'DATABASE_URL=mysql://u:p@h/db\nBLANK=\nSPACED =x\n# COMMENT=y\n' >"$TMP/e1"
DESC="present+valued key -> ok";            assert_ok   env_has_key "$TMP/e1" DATABASE_URL
DESC="absent key -> fail";                  assert_fail env_has_key "$TMP/e1" NOPE
DESC="blank value (KEY=) -> fail";          assert_fail env_has_key "$TMP/e1" BLANK
DESC="commented key -> fail";               assert_fail env_has_key "$TMP/e1" COMMENT

echo "== validate_env_file =="
DESC="missing file -> fail";                assert_fail validate_env_file BE "$TMP/nope" DATABASE_URL
: >"$TMP/empty"
DESC="empty file -> fail";                  assert_fail validate_env_file BE "$TMP/empty" DATABASE_URL
printf 'FOO=bar\n' >"$TMP/partial"
DESC="missing required key -> fail";        assert_fail validate_env_file BE "$TMP/partial" DATABASE_URL
printf 'DATABASE_URL=x\nJWT_SECRET=\nFRONTEND_URL=y\n' >"$TMP/blankkey"
DESC="blank required key -> fail";          assert_fail validate_env_file BE "$TMP/blankkey" DATABASE_URL JWT_SECRET FRONTEND_URL
printf 'DATABASE_URL=mysql://x\nJWT_SECRET=s\nFRONTEND_URL=https://f\n' >"$TMP/be.env"
DESC="complete BE env -> ok";               assert_ok   validate_env_file BE "$TMP/be.env" DATABASE_URL JWT_SECRET FRONTEND_URL
printf 'BACKEND_API_URL=http://127.0.0.1:3070/api\nNEXT_PUBLIC_API_URL=https://crm.example/api\n' >"$TMP/fe.env"
DESC="complete FE env -> ok";               assert_ok   validate_env_file FE "$TMP/fe.env" BACKEND_API_URL NEXT_PUBLIC_API_URL

echo "== node_version_ok =="
DESC="v-prefixed vs bare exact -> ok";      assert_ok   node_version_ok "v24.16.0" "24.16.0"
DESC="bare vs bare exact -> ok";            assert_ok   node_version_ok "24.16.0" "24.16.0"
DESC="patch mismatch -> fail";              assert_fail node_version_ok "v24.15.0" "24.16.0"
DESC="major mismatch -> fail";              assert_fail node_version_ok "v22.9.0" "24.16.0"

echo "== worktree_is_dirty =="
DESC="non-empty status -> dirty";           assert_ok   worktree_is_dirty $' M deploy.sh'
DESC="empty status -> clean";               assert_fail worktree_is_dirty ''

echo "== parse_args =="
# Capture $? immediately after each subshell (a later var assignment resets it).
( parse_args --dry-run; [[ "$DRY_RUN" == 1 ]] ); rc=$?; DESC="--dry-run sets DRY_RUN=1"; [[ $rc -eq 0 ]] && ok "$DESC" || fail "$DESC"
( parse_args; [[ "$DRY_RUN" == 0 ]] ); rc=$?;            DESC="no flag -> DRY_RUN=0";   [[ $rc -eq 0 ]] && ok "$DESC" || fail "$DESC"
( parse_args --bogus ) >/dev/null 2>&1; rc=$?;          DESC="unknown flag -> exit 2"; [[ $rc -eq 2 ]] && ok "$DESC" || fail "$DESC"

echo "== run (dry-run) =="
DRY_RUN=1
marker="$TMP/should_not_exist"
run touch "$marker" >/dev/null
DESC="DRY_RUN=1 does not execute";           [[ ! -e "$marker" ]] && ok "$DESC" || fail "$DESC"
out="$(run echo hello)"
DESC="DRY_RUN=1 prints plan line";           [[ "$out" == "+ echo hello" ]] && ok "$DESC" || fail "$DESC"
DRY_RUN=0
run touch "$marker" >/dev/null
DESC="DRY_RUN=0 executes";                   [[ -e "$marker" ]] && ok "$DESC" || fail "$DESC"

echo "== ecosystem configs (Phase 2) =="
node -e 'const a=require(process.argv[1]).apps[0];process.exit(a.name==="chy_crm_backend"&&a.exec_mode==="fork"&&a.instances===1&&a.env.PORT===3070?0:1)' "$REPO_ROOT/backend-nestjs/ecosystem.config.js" 2>/dev/null
DESC="BE ecosystem: chy_crm_backend fork/1 :3070"; [[ $? -eq 0 ]] && ok "$DESC" || fail "$DESC"
node -e 'const a=require(process.argv[1]).apps[0];process.exit(a.name==="chy_crm_fe"&&a.exec_mode==="fork"&&a.instances===1&&a.env.PORT===3069&&/3069/.test(a.args)?0:1)' "$REPO_ROOT/frontend/ecosystem.config.js" 2>/dev/null
DESC="FE ecosystem: chy_crm_fe fork/1 :3069"; [[ $? -eq 0 ]] && ok "$DESC" || fail "$DESC"
node -e 'const p=require(process.argv[1]);process.exit(p.packageManager==="yarn@4.15.0"?0:1)' "$REPO_ROOT/backend-nestjs/package.json" 2>/dev/null
DESC="BE packageManager yarn@4.15.0"; [[ $? -eq 0 ]] && ok "$DESC" || fail "$DESC"
node -e 'const p=require(process.argv[1]);process.exit(p.packageManager==="yarn@4.15.0"?0:1)' "$REPO_ROOT/frontend/package.json" 2>/dev/null
DESC="FE packageManager yarn@4.15.0"; [[ $? -eq 0 ]] && ok "$DESC" || fail "$DESC"

echo "== old per-project deploy.sh removed =="
DESC="frontend/deploy.sh removed";  [[ ! -f "$REPO_ROOT/frontend/deploy.sh" ]] && ok "$DESC" || fail "$DESC"
DESC="backend-nestjs/deploy.sh removed"; [[ ! -f "$REPO_ROOT/backend-nestjs/deploy.sh" ]] && ok "$DESC" || fail "$DESC"

echo "== dry-run plan ordering (Phase 3) =="
printf 'DATABASE_URL=mysql://x\nJWT_SECRET=s\nFRONTEND_URL=https://f\n' >"$TMP/be.prod"
printf 'BACKEND_API_URL=http://127.0.0.1:3070/api\nNEXT_PUBLIC_API_URL=https://crm.example/api\n' >"$TMP/fe.prod"
plan="$(BE_ENV="$TMP/be.prod" FE_ENV="$TMP/fe.prod" SERVER_IP="203.0.113.9" SSH_USER="deploy" DRY_RUN=1 bash "$DEPLOY" --dry-run 2>&1)"

line_of() { printf '%s\n' "$plan" | grep -nE "$1" | head -1 | cut -d: -f1; }
b_build=$(line_of 'yarn build'); b_migrate=$(line_of 'prisma migrate deploy'); b_seed=$(line_of 'prisma db seed')
b_scp=$(line_of 'scp .*\.env'); b_install=$(line_of 'yarn install'); b_health=$(line_of '/api/docs'); b_reset=$(line_of 'reset --hard origin/main')

DESC="plan emitted (non-empty)"; [[ -n "$plan" ]] && ok "$DESC" || fail "$DESC"
DESC="build precedes migrate deploy"; { [[ -n "$b_build" && -n "$b_migrate" && "$b_build" -lt "$b_migrate" ]]; } && ok "$DESC" || fail "$DESC"
DESC="migrate precedes seed"; { [[ -n "$b_migrate" && -n "$b_seed" && "$b_migrate" -lt "$b_seed" ]]; } && ok "$DESC" || fail "$DESC"
DESC="server reset precedes env scp"; { [[ -n "$b_reset" && -n "$b_scp" && "$b_reset" -lt "$b_scp" ]]; } && ok "$DESC" || fail "$DESC"
DESC="env scp precedes install"; { [[ -n "$b_scp" && -n "$b_install" && "$b_scp" -lt "$b_install" ]]; } && ok "$DESC" || fail "$DESC"
DESC="health check present in plan"; [[ -n "$b_health" ]] && ok "$DESC" || fail "$DESC"
DESC="no secret VALUE leaked in plan"; ! printf '%s' "$plan" | grep -qE 'mysql://x|JWT_SECRET=s' && ok "$DESC" || fail "$DESC"
# Regression: builds must run under production — NODE_ENV=development breaks `next build`
# (React prerender "useContext of null"). Yarn Berry installs devDeps regardless of NODE_ENV.
DESC="build session exports NODE_ENV=production, not development"; { printf '%s' "$plan" | grep -q 'export NODE_ENV=production' && ! printf '%s' "$plan" | grep -q 'export NODE_ENV=development'; } && ok "$DESC" || fail "$DESC"

echo "== dry-run aborts on bad env =="
: >"$TMP/empty.prod"
rc=0; BE_ENV="$TMP/empty.prod" FE_ENV="$TMP/fe.prod" SERVER_IP="203.0.113.9" SSH_USER="deploy" DRY_RUN=1 bash "$DEPLOY" --dry-run >/dev/null 2>&1 || rc=$?
DESC="empty BE env -> non-zero exit"; [[ "$rc" -ne 0 ]] && ok "$DESC" || fail "$DESC"

echo ""
printf 'Total: %d passed, %d failed\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]]

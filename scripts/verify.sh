#!/usr/bin/env bash
# ==============================================================================
# scripts/verify.sh — Quality Gate Verification Script (Bash)
# Development Workspace Standard v1.1 (§19)
# ==============================================================================

set -euo pipefail

echo "=========================================="
echo "🚀 RUNNING QUALITY GATE VERIFICATION PIPELINE"
echo "=========================================="

echo -e "\n[1/4] Checking Backend Build..."
(cd backend-nestjs && npm run build)

echo -e "\n[2/4] Running Backend Unit Tests..."
(cd backend-nestjs && npm test -- --passWithNoTests)

echo -e "\n[3/4] Checking Frontend Typecheck..."
(cd frontend && npx tsc --noEmit)

echo -e "\n[4/4] Checking Frontend Build..."
(cd frontend && npm run build)

echo -e "\n[5/5] Synchronizing AI Task Dashboard..."
python3 scripts/update-todos.py || python scripts/update-todos.py

echo "=========================================="
echo "🎉 ALL QUALITY GATES PASSED SUCCESSFULLY!"
echo "=========================================="


#!/usr/bin/env bash
# ============================================================================
# CRM netvietsoft — DEPLOY LẠI (mỗi lần cập nhật code). KHÔNG seed lại.
#   bash deploy/deploy.sh
# ============================================================================
set -euo pipefail

APP_DIR="/home/netviet/projects-deploy/CRM"
cd "$APP_DIR"
corepack enable

echo "==> 1/5  Lấy code mới"
git pull --ff-only

echo "==> 2/5  Backend: deps + prisma + build"
cd "$APP_DIR/backend-nestjs"
yarn install --immutable
npx prisma generate
npx prisma migrate deploy          # áp migration mới (nếu có). KHÔNG reset.
yarn build

echo "==> 3/5  Frontend: deps + build"
cd "$APP_DIR/frontend"
yarn install --immutable
[ -f prisma/schema.prisma ] && npx prisma generate || true
yarn build

echo "==> 4/5  PM2 reload (zero-downtime) + lưu"
cd "$APP_DIR"
pm2 reload ecosystem.config.js --update-env
pm2 save

echo "==> 5/5  XONG. pm2 status"
pm2 status

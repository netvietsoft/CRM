#!/usr/bin/env bash
# ============================================================================
# CRM netvietsoft — KHỞI TẠO LẦN ĐẦU trên server
#   Path : /home/netviet/projects-deploy/CRM
#   BE   : api.lestgoai.com   :8070   FE: lestgoai.com :3069   Admin: admin.lestgoai.com :3070
#
# Yêu cầu đã cài sẵn: Node 20+, corepack, MySQL 8, Redis, pm2, Nginx.
# Chạy 1 lần khi setup mới:   bash deploy/init-server.sh
# ============================================================================
set -euo pipefail

APP_DIR="/home/netviet/projects-deploy/CRM"
DB_NAME="customer_crm"
DB_USER="${DB_USER:-root}"          # export DB_USER/DB_PASS nếu khác
DB_PASS="${DB_PASS:-}"

cd "$APP_DIR"
corepack enable

echo "==> 0/6  Kiểm tra .env"
[ -f backend-nestjs/.env ]        || { echo "❌ Thiếu backend-nestjs/.env (DATABASE_URL, JWT_SECRET, META_ADS_*, VIETTELPOST_*, GOOGLE_*, REDIS_*, SMTP_* ...)"; exit 1; }
[ -f frontend/.env.production ]   || { echo "❌ Thiếu frontend/.env.production (NEXT_PUBLIC_API_URL=https://api.lestgoai.com/api ...)"; exit 1; }

echo "==> 1/6  Tạo database MySQL ($DB_NAME)"
MYSQL_PWD="$DB_PASS" mysql -u "$DB_USER" -e \
  "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "==> 2/6  Backend: cài đặt + Prisma"
cd "$APP_DIR/backend-nestjs"
yarn install --immutable
npx prisma generate
npx prisma migrate deploy          # tạo toàn bộ bảng từ prisma/migrations (KHÔNG reset dữ liệu)
npx prisma migrate status || true
npx prisma db seed                 # seed dữ liệu khởi tạo — CHỈ chạy lần đầu (prisma.seed = ts-node prisma/seed.ts)
yarn build                         # → dist/

echo "==> 3/6  Frontend: cài đặt + build"
cd "$APP_DIR/frontend"
yarn install --immutable
[ -f prisma/schema.prisma ] && npx prisma generate || true
yarn build                         # NEXT_PUBLIC_API_URL được "nướng" vào build từ .env.production

echo "==> 4/6  PM2: khởi động 3 tiến trình"
cd "$APP_DIR"
pm2 start ecosystem.config.js
pm2 save

echo "==> 5/6  PM2 tự chạy khi reboot"
pm2 startup systemd -u "$(whoami)" --hp "$HOME" || true
echo "   ↑ Nếu in ra 1 lệnh 'sudo env PATH=...', copy chạy lệnh đó rồi 'pm2 save' lại."

echo "==> 6/6  XONG. Kiểm: pm2 status ; pm2 logs crm-backend"
echo "   Nginx: dùng deploy/nginx.conf.example cho 3 domain."

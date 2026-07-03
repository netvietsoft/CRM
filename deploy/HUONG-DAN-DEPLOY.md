# HƯỚNG DẪN BUILD & DEPLOY CRM LÊN SERVER

Máy hiện tại = **PC cá nhân (dev)**. Server = **production**. Quy trình: sửa code ở PC → đẩy Git → trên server kéo về, build, chạy PM2.

```
┌───────────────┐   git push    ┌────────────┐   git pull + build + pm2   ┌──────────────────────────┐
│  PC cá nhân   │ ────────────► │  Git repo  │ ─────────────────────────► │  Server (production)     │
│  (code, test) │               │            │                            │  /home/netviet/.../CRM   │
└───────────────┘               └────────────┘                            └──────────────────────────┘
```

| App | Domain | Cổng | Thư mục |
|---|---|---|---|
| Backend (NestJS) | api.lestgoai.com | 8070 | `backend-nestjs` |
| Frontend khách (Next) | lestgoai.com | 3069 | `frontend` |
| Admin (Next, cùng build) | admin.lestgoai.com | 3070 | `frontend` |

Server path: **`/home/netviet/projects-deploy/CRM`**. DB do backend-nestjs sở hữu (FE gọi qua API).
File hỗ trợ (đã có trong repo): `ecosystem.config.js`, `deploy/init-server.sh`, `deploy/deploy.sh`, `deploy/nginx.conf.example`.

---

## PHẦN A — LÀM MỘT LẦN (setup server mới)

### A1. Cài phần mềm nền (trên server)
```bash
# Node 20 (qua nvm hoặc nodesource) + bật corepack (đi kèm Node)
corepack enable
# MySQL 8, Redis, Nginx, Certbot
sudo apt install -y mysql-server redis-server nginx certbot python3-certbot-nginx
# PM2 toàn cục
sudo npm i -g pm2
```
Kiểm: `node -v` (≥20), `mysql --version`, `redis-cli ping` → PONG, `pm2 -v`.

### A2. Lấy code về server
Repo: **https://github.com/netvietsoft/CRM** (remote `origin`).
```bash
mkdir -p /home/netviet/projects-deploy
cd /home/netviet/projects-deploy
# HTTPS (repo private → cần Personal Access Token khi được hỏi mật khẩu):
git clone https://github.com/netvietsoft/CRM.git CRM
# hoặc SSH (đã cài deploy key cho server):
#   git clone git@github.com:netvietsoft/crm.git CRM
cd CRM
```
> Không dùng Git thì đẩy bằng: `rsync -avz --exclude node_modules --exclude .next --exclude dist ./ user@server:/home/netviet/projects-deploy/CRM/` — nhưng Git là khuyến nghị.

### A3. Tạo file `.env` (KHÔNG commit — tự tạo trên server)

**`backend-nestjs/.env`**
```env
DATABASE_URL="mysql://root:MẬT_KHẨU@localhost:3306/customer_crm"
NODE_ENV=production
PORT=8070
CORS=https://lestgoai.com,https://admin.lestgoai.com
FRONTEND_URL=https://lestgoai.com,https://admin.lestgoai.com
JWT_SECRET=chuỗi_ngẫu_nhiên_dài
JWT_REFRESH_SECRET=chuỗi_ngẫu_nhiên_khác
GOOGLE_CLIENT_ID=...          # phải có giá trị (dù giả) kẻo NestJS boot lỗi GoogleStrategy
GOOGLE_CLIENT_SECRET=...
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
# Tích hợp (điền khi dùng):
META_ADS_ACCESS_TOKEN=...     META_ADS_BUSINESS_ID=...     # hoặc cấu hình ở trang Kết nối
VIETTELPOST_USERNAME=...      VIETTELPOST_PASSWORD=...     VIETTELPOST_API_URL=https://partner.viettelpost.vn/v2
SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=...
```

**`frontend/.env.production`**  ⚠ Next "nướng" `NEXT_PUBLIC_*` vào lúc BUILD → đổi là phải build lại.
```env
NEXT_PUBLIC_API_URL=https://api.lestgoai.com/api
NODE_ENV=production
```

### A4. Khởi tạo (DB + build + chạy) — cách NHANH
```bash
cd /home/netviet/projects-deploy/CRM
bash deploy/init-server.sh
```

### A4'. …hoặc chạy TỪNG LỆNH thủ công (nếu muốn kiểm soát)
```bash
# 1) Tạo database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS customer_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2) Backend
cd /home/netviet/projects-deploy/CRM/backend-nestjs
corepack enable
yarn install --immutable        # cài dependencies
npx prisma generate             # sinh Prisma Client
npx prisma migrate deploy       # TẠO BẢNG từ prisma/migrations (KHÔNG xoá dữ liệu)
npx prisma db seed              # SEED dữ liệu khởi tạo (chỉ lần đầu)
yarn build                      # biên dịch → dist/

# 3) Frontend
cd ../frontend
yarn install --immutable
npx prisma generate             # nếu FE có prisma (bỏ qua nếu báo không cần)
yarn build                      # build Next (đọc frontend/.env.production)

# 4) PM2
cd ..
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME   # chạy lệnh 'sudo env PATH=...' nó in ra, rồi 'pm2 save'
```

### A5. Nginx + HTTPS
```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/crm.conf
sudo ln -s /etc/nginx/sites-available/crm.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lestgoai.com -d www.lestgoai.com -d admin.lestgoai.com -d api.lestgoai.com
```
> Trỏ DNS 3 domain (lestgoai.com, admin., api.) về IP server TRƯỚC khi chạy certbot.

Kiểm cuối: `pm2 status` (3 app `online`), mở https://api.lestgoai.com/api/docs , https://lestgoai.com , https://admin.lestgoai.com/admin.

---

## PHẦN B — CẬP NHẬT (mỗi lần sửa code)

### B1. Trên PC cá nhân
```bash
# ở D:\SetupC\WWW\crm
git add -A
git commit -m "mô tả thay đổi"
git push
```

### B2. Trên server
```bash
cd /home/netviet/projects-deploy/CRM
bash deploy/deploy.sh
```
`deploy.sh` = git pull → yarn install → `prisma generate` → **`prisma migrate deploy`** (áp migration mới nếu có) → `yarn build` (BE+FE) → `pm2 reload` (zero-downtime) → `pm2 save`. **Không** seed lại.

> Nếu chỉ sửa Backend: có thể chỉ build BE rồi `pm2 reload crm-backend`. Chỉ sửa Frontend: build FE rồi `pm2 reload crm-frontend crm-admin`.

---

## PHẦN C — TRA CỨU LỆNH

### Database / Prisma (trong `backend-nestjs/`)
```bash
npx prisma generate                       # sinh client (sau đổi schema/cài deps)
npx prisma migrate deploy                 # PROD: áp migration đã commit, KHÔNG reset
npx prisma migrate status                 # migration nào đã/chưa áp
npx prisma db seed                        # seed dữ liệu (prisma/seed.ts)
npx prisma studio                         # GUI xem/sửa dữ liệu (cổng 5555)
npx prisma migrate resolve --applied <ten>  # đánh dấu 1 migration đã áp (khi sửa DB tay/lệch)
# CHỈ DEV — không dùng trên prod:
npx prisma migrate dev --name <ten>       # tạo migration mới từ thay đổi schema
npx prisma migrate reset                  # ⚠ XOÁ SẠCH DB rồi dựng lại + seed
```

### PM2
```bash
pm2 status                                # xem 3 app
pm2 logs crm-backend                       # log realtime (Ctrl+C thoát)
pm2 reload ecosystem.config.js --update-env  # nạp lại sau khi build
pm2 restart crm-backend                    # restart 1 app
pm2 save                                   # lưu để tự chạy khi reboot
pm2 delete all                             # gỡ hết (làm lại từ đầu)
```

### Sao lưu / phục hồi DB
```bash
mysqldump -u root -p customer_crm > backup_$(date +%F).sql      # sao lưu
mysql -u root -p customer_crm < backup_2026-06-30.sql           # phục hồi
```

---

## PHẦN D — SỰ CỐ THƯỜNG GẶP
- **BE boot crash** → `pm2 logs crm-backend`. Hay gặp: thiếu `GOOGLE_CLIENT_ID/SECRET`, `DATABASE_URL` sai, MySQL/Redis chưa chạy.
- **FE gọi API sai domain** → sai `NEXT_PUBLIC_API_URL` lúc build → sửa `frontend/.env.production` rồi **build lại** FE.
- **Đăng nhập không giữ phiên** → cookie prod cần `secure+sameSite=none` → bắt buộc **HTTPS** đủ cả 3 domain (chạy certbot).
- **CORS blocked** → thêm domain vào `CORS`/`FRONTEND_URL` trong `backend-nestjs/.env` rồi `pm2 restart crm-backend`.
- **`migrate deploy` báo lệch (drift)** → `npx prisma migrate status`; nếu đã sửa DB tay thì `migrate resolve --applied <ten>`. KHÔNG chạy `migrate reset` trên prod.
- **Upload ảnh lỗi 413** → tăng `client_max_body_size` trong Nginx.
- **Đổi code không thấy cập nhật** → chưa build lại hoặc chưa `pm2 reload`. FE phải `yarn build` mới ăn.

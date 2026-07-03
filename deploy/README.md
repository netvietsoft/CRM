# Deploy CRM netvietsoft (PM2)

| App | Domain | Cổng | Thư mục |
|---|---|---|---|
| Backend (NestJS) | api.lestgoai.com | 8070 | `backend-nestjs` |
| Frontend khách (Next) | lestgoai.com | 3069 | `frontend` |
| Admin (Next, cùng build) | admin.lestgoai.com | 3070 | `frontend` |

Server path: `/home/netviet/projects-deploy/CRM`. DB do **backend-nestjs** sở hữu (FE gọi qua API).

---

## 0. Yêu cầu cài sẵn
Node 20+, `corepack enable`, MySQL 8, Redis (cho BullMQ — thiếu thì queue tự tắt), PM2 (`npm i -g pm2`), Nginx, Certbot.

## 1. Biến môi trường (bắt buộc trước khi build)

**`backend-nestjs/.env`** (NestJS ConfigModule tự nạp — chứa secrets):
```
DATABASE_URL="mysql://root:MẬT_KHẨU@localhost:3306/customer_crm"
NODE_ENV=production
PORT=8070
CORS=https://lestgoai.com,https://admin.lestgoai.com
FRONTEND_URL=https://lestgoai.com,https://admin.lestgoai.com
JWT_SECRET=... (đổi, KHÔNG để mặc định)
JWT_REFRESH_SECRET=...
# Tích hợp (điền khi dùng):
GOOGLE_CLIENT_ID=...        GOOGLE_CLIENT_SECRET=...       # bắt buộc có giá trị (dù giả) kẻo boot lỗi
REDIS_HOST=127.0.0.1        REDIS_PORT=6379
META_ADS_ACCESS_TOKEN=...   META_ADS_BUSINESS_ID=...        # hoặc cấu hình qua trang Kết nối
VIETTELPOST_USERNAME=...    VIETTELPOST_PASSWORD=...        VIETTELPOST_API_URL=https://partner.viettelpost.vn/v2
SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=...
```

**`frontend/.env.production`** (Next "nướng" `NEXT_PUBLIC_*` vào lúc BUILD):
```
NEXT_PUBLIC_API_URL=https://api.lestgoai.com/api
NODE_ENV=production
```
> Đổi `NEXT_PUBLIC_API_URL` → phải **build lại** frontend.

## 2. Khởi tạo lần đầu
```bash
cd /home/netviet/projects-deploy/CRM
bash deploy/init-server.sh
```
Script làm: tạo DB → cài deps → `prisma generate` → `prisma migrate deploy` (tạo bảng) → `prisma db seed` → build BE+FE → `pm2 start ecosystem.config.js` → `pm2 save` → `pm2 startup`.

## 3. Deploy lại (mỗi lần cập nhật)
```bash
bash deploy/deploy.sh
```
Pull → deps → `prisma generate` → `prisma migrate deploy` → build → `pm2 reload` → `pm2 save`. **Không** seed lại.

## 4. Nginx + HTTPS
```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/crm.conf
sudo ln -s /etc/nginx/sites-available/crm.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lestgoai.com -d www.lestgoai.com -d admin.lestgoai.com -d api.lestgoai.com
```

---

## Lệnh Database / Prisma (chạy trong `backend-nestjs/`)

```bash
# Tạo database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS customer_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

npx prisma generate            # sinh Prisma Client (sau khi đổi schema / cài deps)
npx prisma migrate deploy      # PROD: áp mọi migration đã commit, KHÔNG reset dữ liệu
npx prisma migrate status      # xem migration nào đã/chưa áp
npx prisma db seed             # seed dữ liệu khởi tạo (prisma/seed.ts) — chỉ lần đầu / khi cần
npx prisma studio              # xem/sửa dữ liệu (GUI, cổng 5555)

# Khi migrate deploy báo lệch (đã sửa DB tay): đánh dấu 1 migration là đã áp
npx prisma migrate resolve --applied <TÊN_MIGRATION>
# (CHỈ MÔI TRƯỜNG DEV) tạo migration mới từ thay đổi schema:
npx prisma migrate dev --name <ten>
# (NGUY HIỂM — XOÁ SẠCH DỮ LIỆU, chỉ dev) dựng lại DB từ đầu + seed:
npx prisma migrate reset
```

## Lệnh PM2
```bash
pm2 start ecosystem.config.js      # khởi động 3 app
pm2 reload ecosystem.config.js --update-env   # nạp lại (zero-downtime) sau khi build
pm2 restart crm-backend            # restart 1 app
pm2 status                         # trạng thái
pm2 logs crm-backend               # log realtime
pm2 save                           # lưu danh sách app (để tự chạy khi reboot)
pm2 startup                        # tạo service systemd cho pm2
pm2 delete all                     # gỡ hết (khi cần làm lại)
```

## Ghi chú
- **crm-admin** là instance thứ 2 của cùng build frontend. Muốn tiết kiệm RAM: xoá app `crm-admin` trong `ecosystem.config.js` và trỏ cả `admin.lestgoai.com` lẫn `lestgoai.com` vào cổng 3069 ở Nginx.
- Cookie đăng nhập ở production dùng `secure + sameSite=none` (FE và BE khác domain) — bắt buộc chạy **HTTPS** cho cả 3 domain.
- Redis khuyến nghị bật để BullMQ (đồng bộ Ads/queue) chạy nền; thiếu Redis thì các job chạy inline/bỏ qua.

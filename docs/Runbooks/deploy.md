# 📖 HƯỚNG DẪN TRIỂN KHAI PRODUCTION & STAGING (docs/Runbooks/deploy.md)

---

## 1. Lệnh Triển khai

```bash
# Chạy triển khai tương tác (chọn server, file env)
./deploy.sh

# Chạy kiểm thử kế hoạch triển khai (không thực thi thay đổi)
./deploy.sh --dry-run
```

---

## 2. Các Bước Chuẩn bị Trước khi Deploy
1. **Kiểm tra File Môi trường**:
   - Đảm bảo `backend-nestjs/.env.prod` và `frontend/.env.prod` có đầy đủ các biến môi trường bắt buộc (DB, JWT_SECRET, URL).
2. **Kiểm tra Git**:
   - Mọi thay đổi đã được merge vào nhánh `main` và push lên `origin/main`.
   - Worktree local phải sạch sẽ (`git status`).
3. **Backup Cơ sở Dữ liệu**:
   - Luôn chạy `mysqldump` trước khi chạy deploy có chứa migration schema mới:
   ```bash
   mysqldump -u root -p customer_crm > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

---

## 3. Xử lý Lỗi Khi Deploy Thất bại
- Nếu `prisma migrate deploy` bị lỗi: Kiểm tra log migration, chạy `npx prisma migrate resolve --rolled-back <migration-name>` và phục hồi lại dump database nếu cần.
- Nếu Health Check thất bại: Kiểm tra log PM2 bằng lệnh `pm2 logs chy_crm_backend --lines 100`.

---

## 4. Khắc phục Lỗi `ChunkLoadError: Failed to load chunk /_next/static/chunks/*.js (500)` trên Next.js 16 Production
- **Nguyên nhân gốc rễ (`router-server.js`)**:
  - Khi `next start` khởi chạy, `next-server` lưu danh sách các file trong `.next/static/chunks/*` vào bộ nhớ RAM (`fsChecker`).
  - Nếu chạy `rm -rf .next && yarn build` trong khi tiến trình `next-server` cũ vẫn đang giữ cổng `3069` (hoặc `pm2 restart` không kill sạch worker child process), `fsChecker` trong RAM vẫn nghĩ file chunk cũ còn tồn tại nhưng khi `serveStatic` đọc đĩa thì báo `ENOENT`. Next.js catch lỗi và đổi thành `400 -> 500 Internal Server Error` thay vì `404`.
  - Đồng thời, nếu Cloudflare bật cache cho HTML trang `/admin/*`, trình duyệt sẽ nhận HTML chứa mã hash chunk của bản build cũ.
- **Quy trình chuẩn khi rebuild Frontend trên VPS (`lestgoai.com`)**:
  ```bash
  cd ~/projects-deploy/CRM
  git pull origin main

  # 1. Dừng hẳn PM2 và giải phóng triệt để cổng 3069 / 8070 trước khi xóa .next
  pm2 delete chy_crm_fe chy_crm_backend || true
  fuser -k 3069/tcp 8070/tcp || true

  # 2. Build Backend
  cd ~/projects-deploy/CRM/backend-nestjs
  corepack yarn build

  # 3. Xóa sạch .next cũ và Build mới hoàn toàn Frontend
  cd ~/projects-deploy/CRM/frontend
  rm -rf .next
  corepack yarn build

  # 4. Khởi động lại PM2 từ đầu để nạp fsChecker mới
  cd ~/projects-deploy/CRM
  pm2 start ecosystem.config.js --env production
  pm2 save
  ```
- **Sau khi khởi động PM2**: Vào **Cloudflare Dashboard (`lestgoai.com`) -> Caching -> Configuration -> bấm `Purge Everything`** để xóa sạch HTML cũ lưu trên Edge CDN.


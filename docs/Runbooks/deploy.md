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


# 🔄 QUY TRÌNH ROLLBACK HỆ THỐNG (docs/Runbooks/rollback.md)

> Hướng dẫn xử lý khẩn cấp và hoàn tác phiên bản khi triển khai phát sinh lỗi nghiêm trọng.

---

## 1. Phân loại Sự cố & Mức độ Rollback

| Mức độ | Tình huống | Hành động khắc phục |
|---|---|---|
| **Code Regression (Mức 1)** | Code mới có bug logic / lỗi giao diện, schema DB không đổi. | Rollback Git commit & Restart PM2. |
| **Database Failure (Mức 2)** | Migration DB bị lỗi hoặc làm hỏng dữ liệu. | Rollback migration hoặc Restore DB Dump + Rollback Code. |
| **Complete Outage (Mức 3)** | Sập toàn bộ dịch vụ server / không thể khởi động. | Kích hoạt Server Disaster Recovery từ snapshot backup. |

---

## 2. Quy trình Rollback Code Nhanh (Mức 1)

```bash
# 1. SSH vào server production
ssh netviet@72.62.198.196

# 2. Di chuyển vào thư mục dự án
cd /home/netviet/projects-deploy/CRM

# 3. Reset về commit ổn định gần nhất (Last Known Good Commit)
git log -n 5 --oneline
git reset --hard <GOOD_COMMIT_HASH>

# 4. Biên dịch lại code
cd backend-nestjs && npm run build
cd ../frontend && npm run build

# 5. Khởi động lại ứng dụng PM2
pm2 restart chy_crm_backend chy_crm_fe --update-env
pm2 save

# 6. Kiểm tra lại health check
curl -I http://127.0.0.1:3070/api/docs
curl -I http://127.0.0.1:3069/
```

---

## 3. Quy trình Rollback Cơ sở Dữ liệu (Mức 2)

### A. Nếu chỉ cần hoàn tác trạng thái Migration Prisma:
```bash
cd /home/netviet/projects-deploy/CRM/backend-nestjs
npx prisma migrate resolve --rolled-back <migration_name>
```

### B. Nếu cần khôi phục lại toàn bộ Dump Database:
```bash
# 1. Tạm dừng backend để ngăn ghi dữ liệu mới
pm2 stop chy_crm_backend

# 2. Khôi phục dữ liệu từ bản sao lưu trước khi deploy
mysql -u root -p customer_crm < /path/to/backup_YYYYMMDD_HHMMSS.sql

# 3. Khởi động lại backend
pm2 start chy_crm_backend
```


# 🚀 KIẾN TRÚC TRIỂN KHAI & HẠ TẦNG (docs/Architecture/deployment.md)

---

## 1. Mô hình Hạ tầng Production & Staging
- **Quản lý Process**: PM2 (Process Manager 2).
  - Frontend: `chy_crm_fe` (Port `3069` Staging / `3900` Dev / `8069` Prod).
  - Backend: `chy_crm_backend` (Port `3070` Staging / `3901` Dev / `8070` Prod) — Chế độ **Fork mode (1 instance)** để đảm bảo cron job `@nestjs/schedule` và WebSocket Socket.io không bị phân mảnh.
- **Reverse Proxy & TLS**: Nginx + Cloudflare SSL (chặn truy cập trực tiếp port 3069/3070 từ bên ngoài).
- **Node.js Environment**: Node v24.16.0 (fnm), Yarn Berry v4.15.0 (Corepack).

---

## 2. Quy trình Triển khai Tự động (`deploy.sh`)
1. **Preflight Check**: Kiểm tra file biến môi trường, định dạng key bắt buộc.
2. **Server Gate**: Kiểm tra phiên bản Node, Yarn, PM2, Git trên server.
3. **Pull & Reset**: `git fetch origin` → `git reset --hard origin/main`.
4. **Deploy Environment**: Đẩy file `.env` qua SSH SCP an toàn (không lưu trong git).
5. **Build & Generate**: Cài đặt dependencies, chạy `prisma generate`, biên dịch NestJS (`dist/src/main.js`) và Next.js (`.next/`).
6. **Database Migration**: Chạy `prisma migrate deploy` và `prisma db seed`.
7. **Process Reload**: `pm2 startOrReload` và `pm2 save`.
8. **Health Check Gate**: Thăm dò endpoint `http://127.0.0.1:3070/api/docs` và `http://127.0.0.1:3069/` đảm bảo phản hồi 200 OK trước khi kết thúc.


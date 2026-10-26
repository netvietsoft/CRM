# 🏗️ KIẾN TRÚC TỔNG THỂ HỆ THỐNG (docs/Architecture/overview.md)

## 1. Tổng quan
Hệ thống CRM Netvietsoft bao gồm E-commerce + CSKH đa kênh (SMS-first, Messenger, Zalo). Kiến trúc gồm 2 ứng dụng độc lập:

```
Người dùng (Admin/NV/Khách hàng)
        │
        ▼
┌───────────────────────┐      REST (Cookie JWT)      ┌──────────────────────────┐
│  frontend (Next.js 16) │ ───────────────────────────▶│ backend-nestjs (NestJS)  │
│  App Router, RSC + CSR │ ◀───────────────────────────│ prefix /api, Swagger     │
└───────────────────────┘                              └────────────┬─────────────┘
        │ Upload Cloudflare R2 / SigV4                              │ Prisma ORM
        │ /internal-api/address (JSON tĩnh)                          ▼
        ▼                                                     ┌──────────────┐
  Cloudflare R2 Bucket                                        │ MySQL 8      │
                                                              │ customer_crm │
WebSocket /admin (Realtime Notification/Chat) ◀── backend    └──────────────┘
                                                       BullMQ (Redis, tuỳ chọn) ─ job nền
Webhook ngoài → backend: Pancake, ViettelPost, Casso
```

- **Frontend KHÔNG truy cập DB**. Mọi dữ liệu lấy qua API backend (`NEXT_PUBLIC_API_URL`, mặc định `http://localhost:3901/api`).
- **Backend** là nguồn sự thật duy nhất về dữ liệu + nghiệp vụ.

---

## 2. Backend — Bootstrap (`src/main.ts`)
- **Global prefix**: `/api` → mọi route có dạng `http://localhost:3901/api/...`.
- **ValidationPipe global**: `{ whitelist: true, transform: true, forbidNonWhitelisted: true }` → Field không khai báo trong DTO sẽ bị từ chối 400 Bad Request.
- **cookie-parser**: Đọc và giải mã `crm_access_token`, `crm_refresh_token`.
- **CORS**: Cấu hình theo env `CORS` + `FRONTEND_URL`; dev fallback `http://localhost:3900`.
- **Swagger**: Cung cấp tài liệu API tại `/api/docs` (hỗ trợ Bearer Auth + Cookie Auth).
- **Port**: Cấu hình qua biến môi trường `PORT`, mặc định **3901** (Prod: **8070**).

---

## 3. Backend — Module gốc (`src/app.module.ts`)
- `ConfigModule.forRoot()` global (đọc `.env`).
- `ScheduleModule.forRoot()` → Cho phép chạy cron ngầm `@Cron`.
- `BullModule` + BullBoard (dashboard `/admin/queues`) — **CHỈ bật nếu có `REDIS_HOST`/`REDIS_URL`**. Nếu không có Redis, hệ thống ghi log cảnh báo và queue chạy fallback inline.
- `PrismaModule` là `@Global()` → `PrismaService` inject ở mọi nơi mà không cần import lại.

---

## 4. Phân quyền Hệ thống (Role & Permissions)
4 vai trò (enum `Role`): **ADMIN, MODERATOR, STAFF, CUSTOMER**.

Hai lớp guard kết hợp: `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)`:
1. **RolesGuard**: Đọc metadata `@Roles('ADMIN', 'STAFF', ...)` → So khớp `request.user.role`.
2. **PermissionsGuard**: Đọc metadata `@Permissions(Permission.X)`:
   - **ADMIN**: Luôn vượt qua, `effectiveStoreId = null` (toàn quyền hệ thống).
   - **MODERATOR**: Chỉ thao tác trong cửa hàng của mình, `effectiveStoreId = user.store.id`.
   - **STAFF**: Bắt buộc thuộc 1 store; kiểm tra ma trận quyền `staffPermissions[]`.
   - **CUSTOMER**: Chỉ truy cập được các route không yêu cầu permission.

**effectiveStoreId**: Lấy qua decorator `@GetEffectiveStoreId()`. Bắt buộc dùng để scope dữ liệu theo cửa hàng cho non-admin.

---

## 5. Luồng Xác thực (Authentication Flow)
- **Đăng nhập**: `POST /api/auth/login` — trường `phone` chấp nhận cả số ĐT lẫn email (phân biệt bằng ký tự `@`).
- **Cookie options**:
  - Production: `secure: true, sameSite: 'none'` (hỗ trợ FE/BE khác domain).
  - Development: `secure: false, sameSite: 'lax'` (FE `3900` ↔ BE `3901` trên `localhost`).
- **Token Expiry**: Access Token (15 phút), Refresh Token (30 ngày, lưu hash bcrypt trong DB).
- **Refresh Token**: `POST /api/auth/refresh` (JwtRefreshGuard).
- **Google OAuth**: `GET /api/auth/google` → callback `/api/auth/google/callback`. Tham số `state` (base64url JSON) mang `returnTo` và `referralCode`.


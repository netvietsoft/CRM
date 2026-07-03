# 01 — KIẾN TRÚC TỔNG THỂ

## Tổng quan
CRM e-commerce + CSKH đa kênh. Hai ứng dụng độc lập:

```
Người dùng (Admin/NV/Khách)
        │
        ▼
┌───────────────────────┐      REST (cookie JWT)      ┌──────────────────────────┐
│  frontend (Next.js 16) │ ───────────────────────────▶│ backend-nestjs (NestJS)  │
│  App Router, RSC + CSR │ ◀───────────────────────────│ prefix /api, Swagger     │
└───────────────────────┘                              └────────────┬─────────────┘
        │ UploadThing (ảnh)                                          │ Prisma
        │ /internal-api/address (JSON tĩnh)                          ▼
        ▼                                                     ┌──────────────┐
   CDN ảnh                                                    │ MySQL        │
                                                              │ customer_crm │
WebSocket /admin (thông báo realtime) ◀── backend            └──────────────┘
                                                       BullMQ (Redis, tuỳ chọn) ─ job nền
Webhook ngoài → backend: Pancake, ViettelPost, Casso
```

- **Frontend KHÔNG truy cập DB**. Mọi dữ liệu lấy qua API backend (`NEXT_PUBLIC_API_URL`,
  mặc định `http://localhost:3901/api`). (Frontend có `prisma/seed.ts` chỉ để chạy script,
  không dùng trong runtime app.)
- **Backend** là nguồn sự thật về dữ liệu + nghiệp vụ.

## Backend — bootstrap (src/main.ts)
- Global prefix: **`api`** → mọi route thành `/api/...`.
- `ValidationPipe` global: `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`
  → DTO loại field lạ; field không khai báo trong DTO sẽ bị từ chối.
- `cookie-parser`: đọc `crm_access_token`, `crm_refresh_token`.
- CORS: theo env `CORS` + `FRONTEND_URL`; dev fallback localhost:3900/3002.
- Swagger ở **`/api/docs`** (bearer auth + cookie auth).
- Port: `PORT` env, mặc định **3901**.

## Backend — module gốc (src/app.module.ts)
- `ConfigModule.forRoot()` global (đọc .env).
- `ScheduleModule.forRoot()` → cho phép @Cron (nhiều nơi dùng).
- `BullModule` + BullBoard (dashboard `/admin/queues`) — **CHỈ bật nếu có REDIS_HOST/REDIS_URL**.
  Không có Redis → log cảnh báo, queue tắt, job nền chạy fallback/bỏ qua.
- `PrismaModule` là `@Global()` → `PrismaService` inject ở mọi nơi không cần import lại.
- Danh sách feature module (đầy đủ ở docs/02): Auth, Users, Admin, AdminNotifications,
  Products, Categories, ProductTags, Colors, Sizes, Units, Materials, Suppliers,
  Cart, Wishlist, Orders, Reviews, Stores, Vouchers, Commissions, CommissionConfig,
  RankConfig, Spin, Notifications, Messaging, Support, Address, Integrations, Webhooks.

## Phân quyền (RẤT QUAN TRỌNG)
4 vai trò (enum `Role`): **ADMIN, MODERATOR, STAFF, CUSTOMER**.

Hai lớp guard, dùng kèm `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)`:
1. **RolesGuard** đọc `@Roles('ADMIN','STAFF',...)` → so khớp `request.user.role`.
   Không khai báo @Roles → không hạn chế role.
2. **PermissionsGuard** đọc `@Permissions(Permission.X)`:
   - ADMIN: luôn pass, `effectiveStoreId = null` (toàn hệ thống).
   - MODERATOR: chỉ store của mình, `effectiveStoreId = store.id` (bắt buộc có store).
   - STAFF: bắt buộc có store; kiểm tra `staffPermissions[]` (có alias).
   - CUSTOMER/khác: chỉ qua được nếu route KHÔNG yêu cầu @Permissions.

**effectiveStoreId**: lấy bằng decorator `@GetEffectiveStoreId()`. Dùng để scope dữ liệu
theo cửa hàng cho non-admin. **Luôn nhớ scope** khi viết query list/detail cho admin panel.

**Decorator**: `@GetUser()` (lấy user, hoặc field cụ thể `@GetUser('id')`), `@Roles(...)`,
`@Permissions(...)`, `@Public()` (bỏ qua JWT + role), `@GetEffectiveStoreId()`.

Danh sách Permission đầy đủ — xem docs/02 mục Auth.

## Luồng xác thực (auth)
- **Đăng nhập**: `POST /api/auth/login` — field `phone` chấp nhận cả số ĐT lẫn email
  (phân biệt bằng ký tự `@`). Trả token set vào cookie.
- **Cookie options theo NODE_ENV** (`auth.controller.ts` helper `cookieOptions(maxAge?)`):
  prod `secure:true, sameSite:'none'` (FE/BE khác domain); dev `secure:false, sameSite:'lax'`
  (FE 3900 ↔ BE 3901 cùng site `localhost`, port không tính) → chạy http mọi trình duyệt.
- **Access token** ~15 phút, **refresh token** ~30 ngày
  (lưu DB dạng **hash bcrypt**, so khớp khi refresh).
- **Refresh**: `POST /api/auth/refresh` (JwtRefreshGuard, đọc cookie refresh).
- **JWT extraction**: ưu tiên cookie `crm_access_token`, fallback `Authorization: Bearer`.
- **Google OAuth**: `GET /api/auth/google` → callback `/api/auth/google/callback`; `state` (base64url JSON)
  giữ `returnTo` (redirect đúng chỗ) + `referralCode` (ghi nhận người giới thiệu khi đăng ký qua Google).
  Strategy fallback chuỗi `returnTo` cũ nếu `state` không phải JSON.
- Khách mới (CUSTOMER chưa onboarding) → luôn ép sang `/onboarding`. Admin/staff → `/admin`.

## Tầng & quy ước (đặt code đúng chỗ)
Mỗi feature là 1 thư mục dưới `backend-nestjs/src/<feature>/`:
```
<feature>/
  <feature>.module.ts       # khai báo module
  <feature>.controller.ts   # HTTP endpoint (mỏng — chỉ điều phối)
  <feature>.service.ts      # nghiệp vụ (chính)
  <feature>.processor.ts    # (nếu có) consumer BullMQ
  dto/*.dto.ts              # DTO + class-validator
```
- Nghiệp vụ nằm ở **service**, controller chỉ mỏng.
- DTO + `class-validator` cho mọi input.
- Lỗi: dùng exception NestJS (`NotFoundException`, `BadRequestException`, `UnauthorizedException`...).
- Swagger: thêm `@ApiTags`, `@ApiOperation` cho endpoint mới.

## Frontend — kiến trúc ngắn
- Next.js App Router: RSC (mặc định) + client component khi cần tương tác.
- Hai vùng chính: `app/admin/*` (bảng điều khiển) và `app/portal/*` (cửa hàng cho khách).
- Hai API client: `apiClient` (server, đọc cookie) và `apiClientClient` (client, tự refresh 401/403).
- CÓ middleware `frontend/src/proxy.ts` (Next 16 đổi tên `middleware.ts` → `proxy.ts`): vừa refresh token vừa gating /portal,/admin. NGOÀI RA còn gating bằng redirect trong layout RSC. ⚠ Hai cơ chế refresh (proxy.ts + apiClientClient) đang chồng nhau — xem docs/audit-report.md #12.
Chi tiết: docs/03-frontend.md.

## Triển khai (deploy)
- PM2: `ecosystem.config.js`. App backend tên `chy_crm_backend`, chạy port **8070** (prod).
- `deploy.sh`: đóng gói src+prisma, scp lên server, cài deps, prisma generate, (tuỳ chọn)
  reset DB, build, `pm2 startOrReload`. Có hỏi xác nhận trước khi reset DB.
- Server (theo script): 72.62.198.196.

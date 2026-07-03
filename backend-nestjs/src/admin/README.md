# admin — Dashboard quản trị, quản lý khách hàng, nhân viên (STAFF), system config
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: xem ../../../first_readme.txt + docs/.

## File chính
- `admin.controller.ts` — endpoint `/admin/*`: dashboard, dashboard-meta, customers (GET/POST/:id, soft/hard delete), system-config/:key (GET/PUT). Gắn sẵn `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles('ADMIN','STAFF','MODERATOR')` ở cấp class.
- `staff.controller.ts` — endpoint `/admin/staff/*`: tạo STAFF, assign (nâng user thành STAFF + gán store), list theo store, members (dropdown NV xử lý đơn), xoá khỏi store.
- `admin.service.ts` — nghiệp vụ: getDashboardStats, getCustomers (search/filter/sort/phân trang), CRUD customer, system-config key-value, quản lý staff. Scope theo `effectiveStoreId`.
- `admin.module.ts` — wiring.
- `dto/create-customer.dto.ts`, `dto/create-staff.dto.ts`, `dto/assign-staff.dto.ts` — input validate.

## Luồng / logic quan trọng (gotcha)
- Tạo STAFF tự gán quyền mặc định CUSTOMERS/ORDERS/PRODUCTS/CATEGORIES (VIEW+MANAGE).
- MODERATOR/STAFF CHỈ thấy/sửa khách có đơn trong store của mình (lọc theo `effectiveStoreId`); ADMIN nhận `null` = toàn hệ thống.
- soft delete = ban (`isActive=false`); hard delete = xoá vĩnh viễn cascade — chỉ ADMIN/MOD.
- system-config là key-value (lưu token Zalo, lockDurationDays voucher, v.v.) — đụng vào ảnh hưởng nhiều module.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟢 `admin.service.ts:200-314` (`getCustomers`) — tải HẾT id rồi slice trong RAM thay vì `take/skip` ở DB → tốn bộ nhớ khi nhiều khách. Hướng sửa: phân trang ở tầng DB.
- 🟢 `generateUniqueReferralCode` trùng với bản trong auth → gộp helper dùng chung.
- 🟢 Vài endpoint admin nhận `data:any` (system-config) → nên tạo DTO + class-validator.

## Quy ước khi sửa
- Endpoint admin LUÔN giữ `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles(...)` + `@Permissions(...)` (docs/07 B.3).
- Non-admin (STAFF/MOD): LUÔN `@GetEffectiveStoreId()` và scope mọi query theo store — quên = lộ dữ liệu store khác (docs/07 B.4).
- Input qua DTO + class-validator (ValidationPipe `forbidNonWhitelisted`, docs/07 B.2).
- Nghiệp vụ ở service, controller mỏng (docs/07 B.1).

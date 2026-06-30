# 07 — QUY TẮC & CẠM BẪY KHI SỬA CODE

> Đọc file này TRƯỚC khi sửa. Mục tiêu: tránh sửa sai, viết bậy, trùng lặp, vỡ ngữ cảnh.

## A. Quy tắc chung
1. **Đọc trước, sửa sau**: trước khi đụng 1 module → đọc mục của nó trong docs/02 (BE) hoặc docs/03 (FE),
   và docs/04 nếu liên quan dữ liệu.
2. **Code là sự thật**: nếu tài liệu lệch code → tin code, rồi cập nhật lại tài liệu cho khớp.
3. **Cập nhật tài liệu**: nếu thêm/sửa endpoint, model, enum, env, quy tắc → sửa file docs tương ứng + first_readme.txt nếu là điều cốt lõi.
4. **Không tự ý đổi**: applicationId, port (3901 BE/3900 FE — cổng 3000/3001 dành cho web khác trên máy này), tên DB (customer_crm), cấu trúc thư mục,
   tên cookie (crm_access_token/crm_refresh_token), prefix /api — nếu cần đổi PHẢI hỏi.
5. **Không commit secret**. .env không lên git (chỉ liệt kê key trong docs/05).
6. Giữ phong cách code quanh chỗ sửa (đặt tên, comment, idiom). Tiếng Việt trong message/UI là bình thường ở dự án này.

## B. Backend (NestJS)
1. **Đặt code đúng tầng**: nghiệp vụ ở *.service.ts (controller chỉ mỏng). Input qua DTO + class-validator.
2. **ValidationPipe global** bật `forbidNonWhitelisted` → field không khai báo trong DTO sẽ bị 400.
   Thêm field mới PHẢI khai báo trong DTO.
3. **Phân quyền**: endpoint admin LUÔN gắn `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)`
   + `@Roles(...)` + `@Permissions(...)`. Endpoint public PHẢI có `@Public()`.
4. **Multi-store**: với non-admin, LUÔN lấy `@GetEffectiveStoreId()` và scope query theo store.
   Quên = lộ dữ liệu store khác. ADMIN nhận null = toàn hệ thống.
5. **Tiền tệ**: VND, số nguyên đồng. Cẩn thận khi nhân % (hoa hồng/discount) — xem cách làm trong
   commissions.service / orders.service, đừng tự chế công thức.
6. **Trạng thái**: dùng đúng enum (docs/04). OrderStatus có 13 giá trị — đừng hardcode chuỗi sai.
7. **BullMQ/Redis**: job nền có thể KHÔNG chạy ở local (không Redis). Code phải có nhánh fallback
   (nhiều service đã làm). Đừng giả định queue luôn sống.
8. **Cron**: nhiều @Cron chạy ngầm (VietQR huỷ đơn/phút, voucher verify 00:00, messaging 8:00/8:05/8:10,
   Zalo token 20h). Sửa logic liên quan nhớ kiểm tra cron tương ứng.
9. **Prisma**: KHÔNG chạy `prisma migrate dev` bừa trên DB local (đã import dump, có _prisma_migrations).
   Đổi schema → bàn trước; thường chỉ `prisma generate`. Quan hệ referral PHẢI cập nhật ReferralClosure khi tạo user có referrer.
10. **Webhook**: giữ verify chữ ký + idempotency (Pancake/ViettelPost/Casso). Đừng bỏ check trùng.

## C. Frontend (Next.js)
1. **Không gọi DB**. Mọi dữ liệu qua `apiClient` (server) / `apiClientClient` (client) → backend.
2. **Server vs Client**: mặc định RSC. Cần tương tác/`useState`/event → thêm `'use client'`.
   Đọc cookie/secret CHỈ ở server (Server Action / RSC), không lộ ra client.
3. **Auth gating** bằng middleware `src/proxy.ts` + redirect trong layout RSC (⚠ đang trùng cơ chế refresh — audit #12). Trang admin phải kiểm role
   ADMIN/STAFF/MODERATOR; portal đẩy admin ra.
4. **Refresh token tự động** đã có trong apiClientClient (401/403). Đừng tự viết lại vòng refresh.
   Client component gọi backend dùng `apiClientClient` (endpoint relative), KHÔNG `fetch` trần — trừ
   upload FormData (apiClientClient ép `Content-Type: application/json`) và route `/internal-api/*` của Next.
5. **Upload ảnh** qua UploadThing (endpoint trong app/api/uploadthing). Có middleware auth theo role.
6. **Tailwind 4** + component tự viết (không shadcn). Tái dùng components/ui sẵn có (Select, Skeleton…).
7. **Form** viết tay + Server Action (không form lib). Toast bằng react-toastify.
8. **Định dạng số/tiền**: LUÔN dùng `lib/format.ts` (`formatNumber` → `1.234.567`, `formatVnd` → `… đ`, `formatVndTight` → `…đ`, `formatVndText` → `… VND`, `formatVndSymbol` → `… ₫`, `formatCompact`). KHÔNG tự viết `new Intl.NumberFormat` hay `toLocaleString()` cục bộ (thiếu locale → SSR hiện sai dấu nghìn). Tất cả dùng locale `vi-VN` (dấu CHẤM ngăn nghìn). `toLocaleString('vi-VN')` cho NGÀY thì vẫn ok.

## D. Khi THÊM 1 MODULE backend mới (checklist)
1. Tạo `src/<feature>/` với module/controller/service + dto/.
2. Khai báo trong `app.module.ts` (imports).
3. Thêm Permission mới (nếu cần) vào `auth/enums/permissions.enum.ts` + alias trong PermissionsGuard.
4. Gắn guard + @ApiTags/@ApiOperation (Swagger).
5. Nếu có model mới → sửa schema.prisma + `prisma generate` (bàn về migrate).
6. Scope theo effectiveStoreId nếu là dữ liệu của store.
7. Cập nhật docs/02 (+ docs/04 nếu thêm model/enum).

## E. Khi THÊM trang admin/portal mới (FE)
1. Tạo route dưới `app/admin/<x>` hoặc `app/portal/<x>`.
2. Component list/form đặt trong `components/admin` hoặc `components/customer` (đặt tên `<X>Client.tsx` cho client component).
3. Gọi backend qua apiClient/apiClientClient; thêm type vào `types/`.
4. Cập nhật sidebar (AdminSidebar) nếu là trang admin.
5. Cập nhật docs/03.

## F. Kiểm thử / verify trước khi báo "xong"
- Backend build/chạy: `corepack yarn@stable start:dev` (xem log boot, không crash GoogleStrategy).
- Có test: `orders.service.spec.ts`, `casso.service.spec.ts` → chạy `yarn test` cho phần đụng tới.
- Đổi schema → `prisma generate` rồi mới chạy.
- FE: `corepack yarn@stable dev`, mở trang liên quan kiểm thật, xem Network gọi đúng endpoint.
- Báo cáo trung thực: test fail thì nói rõ + dán output; bước nào skip thì nói.

## G. Môi trường local (nhắc lại)
- Ổ C gần đầy → LUÔN `$env:TMP="D:\yarn-temp"` trước yarn; `.yarnrc.yml` đã `enableGlobalCache:false`.
- MySQL qua Laragon (root không mật khẩu, DB customer_crm). Redis chưa có → queue tắt.
- Google OAuth client id/secret trong .env phải có giá trị (dù giả) nếu không backend crash khi boot.

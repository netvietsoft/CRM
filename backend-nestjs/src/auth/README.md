# auth — Xác thực JWT (cookie) + Google OAuth, đăng ký, refresh, phân quyền
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: xem ../../../first_readme.txt + docs/.

## File chính
- `auth.controller.ts` — endpoint `/auth/*`: register, login, refresh, logout, google, google/callback. Set/clear cookie `crm_access_token` (15') + `crm_refresh_token` (30 ngày) qua helper `cookieOptions(maxAge?)` theo NODE_ENV (prod secure:true/sameSite:'none'; dev secure:false/sameSite:'lax').
- `auth.service.ts` — nghiệp vụ: register (hash bcrypt 12, sinh referralCode 8 ký tự, gán đơn khách vãng lai theo SĐT, cấp voucher welcome, báo admin), login (theo phone/email), refreshTokens, logout, googleLogin.
- `strategies/jwt.strategy.ts` — đọc access token từ cookie; **truy DB kiểm `isActive` mỗi request** (không tin role trong token).
- `strategies/jwt-refresh.strategy.ts` — validate refresh token (so hash bcrypt trong bảng `refresh_tokens`).
- `strategies/google.strategy.ts` — Google OAuth (cần client id/secret trong .env dù giả, không thì crash boot).
- `guards/` — `jwt-auth.guard.ts`, `jwt-refresh.guard.ts`, `google-auth.guard.ts`, `roles.guard.ts`, `permissions.guard.ts` (phân tầng + effectiveStoreId + alias messaging).
- `decorators/` — `@Public()`, `@GetUser()`, `@GetEffectiveStoreId()`, `@Roles()`, `@Permissions()`.
- `enums/permissions.enum.ts` — danh sách Permission đầy đủ (ORDERS_*, PRODUCTS_*, MESSAGING_* ...). Thêm module mới phải thêm permission + alias trong PermissionsGuard.
- `dto/login.dto.ts`, `dto/register.dto.ts` — input validate qua class-validator.

## Luồng / logic quan trọng (gotcha)
- Refresh token lưu DB dạng **hash bcrypt**; access token KHÔNG lưu.
- Tên cookie cố định `crm_access_token` / `crm_refresh_token` — KHÔNG đổi (xem docs/07 mục A.4).
- JwtStrategy đọc DB mỗi request → đổi `isActive`/role có hiệu lực ngay (không cần đợi token hết hạn).
- Register: sinh referralCode duy nhất + nếu có referrer → PHẢI cập nhật `ReferralClosure` (closure table hoa hồng).
- `googleLogin` quyết định redirect: ADMIN/STAFF/MODERATOR → `/admin`; CUSTOMER chưa onboarding → `/onboarding`.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟡 `auth.service.ts:193-230, 351-363` — refresh token CHƯA xoay vòng đầy đủ (mới chỉ dọn token hết hạn). Token cũ vẫn dùng được 30 ngày. Rotation đầy đủ cần GỘP 1 nơi refresh (proxy.ts vs apiClientClient) trước, nếu không 2 nơi đua nhau xoá token đang dùng → mất phiên.
- 🟢 `generateUniqueReferralCode` trùng lặp (auth + admin), kiểu trả về không chắc → gộp thành helper dùng chung.

### ✅ Đã xử lý
- ✅ Email chuẩn hoá lowercase ở register/login/google (`.toLowerCase().trim()`).
- ✅ `logout` clearCookie truyền cùng option (qua `cookieOptions()`); cookie register maxAge 45'→15' (khớp JWT).
- ✅ Cookie `secure/sameSite` đặt theo `NODE_ENV` (helper `cookieOptions`) — không còn hardcode (2026-06-29).
- ✅ Google OAuth truyền `referralCode` qua `state` base64url(JSON {returnTo, referralCode}); strategy fallback chuỗi `returnTo` cũ (2026-06-29).

## Quy ước khi sửa
- Endpoint public PHẢI gắn `@Public()`; endpoint admin LUÔN `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles(...)` + `@Permissions(...)` (docs/07 B.3).
- Input qua DTO + class-validator; ValidationPipe global bật `forbidNonWhitelisted` → thêm field mới phải khai báo trong DTO (docs/07 B.2).
- KHÔNG đổi tên cookie, prefix `/api`, port (docs/07 A.4).
- Thêm Permission mới → thêm vào `enums/permissions.enum.ts` + alias trong PermissionsGuard (docs/07 D.3).
- Tạo user có referrer → cập nhật `ReferralClosure` (docs/07 B.9).

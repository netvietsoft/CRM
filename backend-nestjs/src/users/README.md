# users — Hồ sơ người dùng + dashboard portal + onboarding
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: xem ../../../first_readme.txt + docs/.

## File chính
- `users.controller.ts` — endpoint `/users/*` (toàn bộ gắn `JwtAuthGuard`): me, profile (GET/PUT), password, onboarding, dashboard, portal-layout-meta, `:userId/sync-pancake-orders`.
- `users.service.ts` — nghiệp vụ: findById, getProfile, updateProfile (validate trùng email/phone), updatePassword (cần mật khẩu cũ, tối thiểu 6 ký tự), completeOnboarding (kích hoạt sync Pancake theo SĐT), dashboard tổng hợp, `updateUserRank()`.
- `users.module.ts` — wiring; import PancakeService (auto-sync đơn theo SĐT khi đổi phone/onboarding).

## Luồng / logic quan trọng (gotcha)
- `updateUserRank()`: tính lại rank từ `totalSpent` qua RankConfig; `points = floor(totalSpent/10000)`.
- Đổi phone (PUT /profile) hoặc onboarding → kích hoạt `pancakeService.syncOrdersForUser` (chạy nền, nuốt lỗi log).
- Dashboard gom: voucher chưa dùng, đơn, referee, tiến độ rank — đọc nhiều quan hệ, cẩn thận N+1.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟢 `users.controller.ts:32, 56` (`updateProfile`, `completeOnboarding`) nhận `@Body() data: any` → bỏ qua ValidationPipe, client ghi đè field tuỳ ý. Hướng sửa: tạo DTO + class-validator.
- 🟢 `POST /users/:userId/sync-pancake-orders` chỉ có `JwtAuthGuard`, KHÔNG kiểm chủ sở hữu (IDOR nhẹ) → user A sync hộ user B. Hướng sửa: kiểm `userId === req.user.id` hoặc role admin.

## Quy ước khi sửa
- Nghiệp vụ ở `users.service.ts`, controller chỉ mỏng (docs/07 B.1).
- Thêm/đổi input → DTO + class-validator (ValidationPipe `forbidNonWhitelisted`, docs/07 B.2). Tránh `@Body() data: any`.
- Tiền tệ VND số nguyên đồng; tính rank/points đừng tự chế công thức — theo `updateUserRank` + RankConfig (docs/07 B.5).
- Endpoint user thường thuộc về chính chủ → luôn dùng `@GetUser('id')`, không tin id từ body/param khi nhạy cảm.

# actions — Server Actions dùng chung
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/03.

## File / thành phần chính
- `qrClaimActions.ts` — `sendOtpAction(phone, orderCode)` → `POST /vouchers/send-otp`; `claimQrRewardAction(orderCode, phone, otp)` → `POST /vouchers/claim-qr`. Dùng cho luồng QR claim (QrClaimModal).

## Quy ước (gotcha)
- File Server Action: phải có `'use server'` đầu file; chạy SERVER (gọi backend qua `apiClient`, đọc cookie an toàn).
- Gọi backend qua apiClient/apiClientClient (KHÔNG fetch trần — mất auto-refresh). Base URL phải có `/api`.
- Không lộ secret ra client. Server Action nhận input từ client → validate, đừng tin dữ liệu vào.
- Server Action cục bộ theo route nằm ngay cạnh page (vd `app/admin/orders/actions.ts`), không gom hết vào đây — thư mục này chỉ cho action dùng chung.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

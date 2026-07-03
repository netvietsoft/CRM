# vouchers — Mã giảm giá đa loại + flow QR-claim có OTP + tự cấp voucher loyalty
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (đặc biệt docs/02 mục VOUCHERS, docs/05).

## File chính
- `vouchers.controller.ts` — endpoint: GET /vouchers, /vouchers/user/my-vouchers, GET/POST/PATCH/DELETE /:id, POST /send-otp, /claim-qr, /create-order-voucher, /referral-voucher, /manual-verify, GET /admin...
- `vouchers.service.ts` — toàn bộ nghiệp vụ: validate điều kiện voucher, OTP, claim QR, khoá/mở khoá, tự cấp voucher (đơn đầu ≥500k, VIP GOLD quay lại).
- `voucher.processor.ts` — BullMQ queue `voucher-queue`: job `verify-qr-vouchers-job` (cron 00:00 hỏi ViettelPost, activate/reject theo batch 50) + `unlock-voucher-task` (mở 1 voucher sau 7 ngày).
- `dto/claim-qr-voucher.dto.ts` — DTO claim QR.

## Luồng / logic quan trọng (gotcha)
- **Flow QR-claim**: send-otp (validate đơn + SĐT, OTP 5 phút, giới hạn 1 lần/60s) → claim-qr → voucher tạo PENDING khoá 7 ngày (`lockDurationDays` trong systemConfig). Tự mở khoá qua BullMQ, hoặc mở ngay nếu đơn đã giao ≥7 ngày. Tối đa 5 lần claim/bậc.
- **Voucher QR-ORDER** kiểm tra trạng thái đơn nguồn: ACTIVE nếu giao ≥7 ngày, PENDING nếu chưa giao, LOCKED nếu huỷ/hoàn.
- **Áp voucher khi tạo đơn nằm ở `orders.service.ts`** (không ở đây): cap maxDiscount + cap 25% subtotal — mẫu chuẩn, đừng tự chế công thức.
- **Loại voucher** (enum VoucherType): PERCENT, FIXED_AMOUNT, FREESHIP, STACK. Phân loại campaign qua `CampaignCategory`.
- **BullMQ fallback**: không có Redis ở local → queue tắt. Code phải có nhánh mở voucher ngay (đừng giả định queue luôn sống).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟢 `vouchers.service.ts:807-845` — voucher unlock trong GET `getUserVouchers` là N+1 ghi (ghi trong vòng GET). Cân nhắc tách ra job/batch.
- 🟢 `voucher.processor.ts` (`getMockShippingStatus`) — dùng dữ liệu giả ngẫu nhiên activate/reject voucher THẬT khi thiếu `VIETTELPOST_TOKEN`. Nguy hiểm ở production — nên fail-safe thay vì random.
- 🟢 Nhiều handler nhận `data:any` — nên tạo DTO + class-validator (docs/07 B.1-B.2).

## Quy ước khi sửa
- Tiền tệ VND số nguyên đồng; cap discount đã có sẵn — tái dùng, không viết lại.
- Thêm field mới PHẢI khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
- Guard `voucherQueue` là Optional — luôn kiểm tra tồn tại trước khi `.add()` (xem audit webhooks #7 cùng pattern).
- Endpoint admin gắn đủ guard + @Roles + @Permissions(VOUCHERS_*); endpoint public gắn @Public().

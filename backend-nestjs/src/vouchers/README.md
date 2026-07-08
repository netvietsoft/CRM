# vouchers — Mã giảm giá đa loại + flow QR-claim có OTP + tự cấp voucher loyalty
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (đặc biệt docs/02 mục VOUCHERS, docs/05).

## File chính
- `vouchers.controller.ts` — endpoint: GET /vouchers, /vouchers/user/my-vouchers, GET/POST/PATCH/DELETE /:id, POST /send-otp, /claim-qr, /create-order-voucher (+`approvalMode`), GET /order-voucher/:orderCode (kèm `userVoucher`), POST /order-voucher/:userVoucherId/approve (duyệt manual), GET /order-voucher-status/:orderCode (scoped theo user), /referral-voucher, /manual-verify, GET /admin...
- `vouchers.service.ts` — nghiệp vụ: validate điều kiện voucher, OTP, claim QR, khoá/mở khoá, tự cấp voucher (đơn đầu ≥500k, VIP GOLD quay lại). **Vòng đời order-voucher (2026-07-08):** `syncOrderVoucherActivation(order)` (state machine), `getCodActivationThreshold()` (SystemConfig `order_voucher_config`, default 100k), `createOrderVoucher` (tạo Voucher + UserVoucher PENDING theo `order.userId`, unlockAt=now), `approveOrderVoucher`, `getOrderVoucherStatus`, `sendLoginOtp`/`verifyLoginOtp` (định danh SĐT).
- `voucher.processor.ts` — BullMQ queue `voucher-queue`: job verify (cron) giờ **delegate sang `syncOrderVoucherActivation`** (lưới an toàn) + `unlock-voucher-task`.
- `dto/claim-qr-voucher.dto.ts` — DTO claim QR.

## Luồng / logic quan trọng (gotcha)
- **Flow QR-claim**: send-otp (validate đơn + SĐT, OTP 5 phút, giới hạn 1 lần/60s) → claim-qr → voucher tạo PENDING khoá 7 ngày (`lockDurationDays` trong systemConfig). Tự mở khoá qua BullMQ, hoặc mở ngay nếu đơn đã giao ≥7 ngày. Tối đa 5 lần claim/bậc.
- **Vòng đời VOUCHER ĐƠN (order-voucher, 2026-07-08)** — thay cơ chế "ACTIVE nếu giao ≥7 ngày" cũ:
  - NV tạo voucher qua form dưới đơn → `createOrderVoucher` tạo `Voucher` (QR-ORDER-{code}, `approvalMode` AUTO/MANUAL) + `UserVoucher` **PENDING** (ví khách hiện "chờ kích hoạt").
  - Kích hoạt do `syncOrderVoucherActivation(order)` gọi tại **3 điểm ghi status**: `orders.service.updateStatus`, `webhooks.service` (webhook VTP), `viettelpost-sync.reconcileOpenOrders` (cron). Điều kiện: `status ∈ {DELIVERED,PAYMENT_COLLECTED,COMPLETED}` + `totalAmount ≥ codThreshold` + `!order.isExchange` → AUTO=ACTIVE / MANUAL=WAITING_APPROVAL (admin `approve` → ACTIVE). `{CANCELLED,REFUNDED,RETURNING,EXCHANGING}` | isExchange | COD<ngưỡng → **REJECTED** (chốt). Idempotent: chỉ re-eval PENDING/WAITING_APPROVAL.
  - QR trên đơn = link `/portal/voucher-status` (không claim); status endpoint scoped theo user đăng nhập.
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

# webhooks — Webhook ViettelPost (vận chuyển) + Casso/VietQR (thanh toán)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (docs/05 mục 2 & 3).

## File chính
- `webhooks.controller.ts` — **1 endpoint** `POST /viettelpost/webhook` (@Public, @HttpCode 200). Orchestrate qua `handleViettelWebhook`.
- `webhooks.service.ts` — `handleViettelWebhook` (orchestrator): verify secret per-store → capture mẫu → `processViettelPostWebhook`. `matchViettelWebhookStore(token)` → duyệt `StoreIntegration[platform=VIETTELPOST]`, so khớp `metadata.webhookSecret` bằng `crypto.timingSafeEqual` → trả `{integration, anySecret}`. `captureViettelOrderWebhook` → lưu 5 payload mẫu mới nhất vào SystemConfig key `viettel_order_webhook_samples`. `processViettelPostWebhook(payload, storeId?)` → khớp đơn → cập nhật HOẶC tạo mới. `updateOrderFromWebhook` → map mã→status, voucher, messaging.
- `casso.controller.ts` — POST /webhooks/casso (Public).
- `casso.service.ts` — verify HMAC-SHA512, khớp đơn theo regex mô tả + dung sai 1%, đánh dấu PAID.
- `casso.service.spec.ts` — test verify chữ ký (chạy `yarn test` khi đụng tới).
- `dto/viettelpost-webhook.dto.ts` — DTO payload VTP (ORDER_NUMBER, ORDER_STATUS, STATUS_NAME, ORDER_STATUSDATE, LOCATION_CURRENTLY, MONEY_COLLECTION, ORDER_REFERENCE, DATA.token...).

## Luồng / logic quan trọng (gotcha)
- **ViettelPost — xác thực secret per-store**: `DATA.token` trong payload được so sánh bằng `crypto.timingSafeEqual` với `StoreIntegration.metadata.webhookSecret` (platform VIETTELPOST) của từng store. Store khớp cung cấp `storeId` để định tuyến xử lý. Nếu có store nào cấu hình secret nhưng token không khớp → bỏ qua xử lý, vẫn trả `{success:true, skipped:'invalid_secret'}` HTTP 200. Nếu KHÔNG store nào cấu hình secret → tiếp tục (fallback dev / chưa cấu hình). Dev (`NODE_ENV!=='production'`) luôn tiếp tục.
- **ViettelPost — luồng endpoint duy nhất**: VTP POST `POST /api/viettelpost/webhook` → `handleViettelWebhook` → (1) match secret per-store, (2) capture mẫu vào SystemConfig, (3) `processViettelPostWebhook(payload, storeId?)`. Endpoint LUÔN trả HTTP 200 (lỗi xử lý bị nuốt để VTP không retry vô hạn — VTP retry tối đa 5 lần khi nhận non-200).
- **ViettelPost — không khớp đơn → tạo mới**: Khớp đơn theo trackingCode / metadata `$.partner.trackingCode` / ORDER_REFERENCE / `PCK-{id}`. Nếu không tìm thấy → TẠO ĐƠN MỚI: `source='VIETTEL'`, userId=null (khách vãng lai), orderCode=ORDER_NUMBER, totalAmount=MONEY_COLLECTION (COD), status map từ ORDER_STATUS (100/101→null, fallback PENDING khi tạo mới; 102/200/201/300/301→SHIPPED; 500/505→PAYMENT_COLLECTED; 501/515→DELIVERED; 502/510→RETURNING; 503/504/107→CANCELLED; còn lại→null), trackingCode lưu vào metadata.
- **ViettelPost — capture mẫu**: `captureViettelOrderWebhook` lưu 5 payload mẫu mới nhất (kèm headers) vào `SystemConfig.viettel_order_webhook_samples`. Gọi từ bên trong `handleViettelWebhook` (không còn endpoint riêng).
- **Voucher VTP**: giao thành công (501/515) → hẹn mở voucher sau 7 ngày (BullMQ) hoặc mở ngay nếu queue tắt; hoàn hàng (502/510) hoặc huỷ (503/504/107) → reject. Giao 1 phần → tính lại discount theo tỷ lệ.
- **Casso**: HMAC-SHA512 header `x-casso-signature` `t={ts},s={hash}` (thử 3 cách ghép payload), secret `CASSO_SECURE_TOKEN`. Khớp đơn regex `/ORDER:([A-Z0-9]+)/i`, dung sai 1%. Đơn đã CANCELLED (VietQR hết hạn) mà tiền về muộn → chỉ log, KHÔNG khôi phục. Đơn đã PAID → bỏ qua (idempotent).
- **BullMQ fallback**: không Redis → mở voucher ngay thay vì hẹn lịch.
- **Env lỗi thời (inbound VTP)**: `VIETTELPOST_WEBHOOK_TOKEN` và `VIETTELPOST_WEBHOOK_SECRET` đã được thay bằng `StoreIntegration.metadata.webhookSecret` (per-store). Không còn dùng cho xác thực inbound; có thể giữ lại nhưng không có hiệu lực.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- ✅ ~~`webhooks.service.ts:43-63` — ViettelPost webhook **fail-open**~~ **ĐÃ SỬA (2026-06-29)**: secret per-store (`metadata.webhookSecret`) + `timingSafeEqual`; production fail-closed khi có secret; dev fallback cho phép tiếp tục. Route cũ `POST /order-webhook` đã bị xoá.
- 🔴 `casso.service.ts:79-165` — thiếu idempotency theo giao dịch (chỉ chống trùng qua `paymentStatus==='PAID'`, không lưu `transaction.id`). Retry/song song chạy rules 2 lần. **Sửa:** lưu transaction id (unique) đã xử lý.
- 🟡 `webhooks.service.ts` — `rejectVoucherImmediately` không guard `voucherQueue` (Optional) → crash khi không Redis. **Sửa:** kiểm tra queue tồn tại trước khi dùng.
- 🟡 `casso.service.ts:45-77` — `verifySignature` thử 3 format + so sánh `===` (không `timingSafeEqual`). **Sửa:** dùng `crypto.timingSafeEqual`.

## Quy ước khi sửa
- **Verify chữ ký + idempotency** là bắt buộc cho mọi webhook (docs/07 B.10). Fail-closed ở production.
- So sánh chữ ký bằng `timingSafeEqual`, không `===`.
- Guard `voucherQueue` Optional trước khi `.add()`.
- `$transaction` cho thao tác đụng tiền/đơn (đánh dấu PAID, hoàn kho, nhả voucher).
- ViettelPost webhook LUÔN trả HTTP 200 — lỗi xử lý bị nuốt trong `handleViettelWebhook`. Không bao giờ throw ra ngoài controller (VTP retry ≤5× khi non-200).
- Tạo đơn mới khi không khớp (`source='VIETTEL'`) dùng `createOrderFromViettel(payload, storeId)` — có idempotency qua `orderCode` unique (P2002 được bắt, không throw).
- Secret per-store cấu hình tại `/admin/integrations/viettelpost` → lưu `StoreIntegration.metadata.webhookSecret`; URL webhook hiển thị cùng trang để copy dán vào cổng VTP.

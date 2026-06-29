# 05 — TÍCH HỢP NGOÀI, WEBHOOK, MAIL, ENV

## Bảng tổng quan
| Hệ thống | Loại | Chiều | Xác thực | Idempotency |
|---|---|---|---|---|
| Pancake POS | Sync + Webhook | 2 chiều | apiKey(DB) + header signature | dedup theo order ID |
| ViettelPost | Webhook vận chuyển | Vào | secret per-store (timingSafeEqual) | orderCode unique |
| Casso (VietQR) | Webhook thanh toán | Vào | HMAC-SHA512 | match mã đơn + số tiền |
| SMS (NetViet) | Service | Ra | env/DB config | không |
| Mail (SMTP) | Service | Ra | env config | không |
| Zalo ZNS | Service | Ra | OAuth token (systemConfig) | — |
| Address | Tiện ích | Vào | public, JSON tĩnh | — |

---

## 1. Pancake POS (`src/integrations/pancake`)
Đồng bộ đơn/khách/danh mục/sản phẩm từ Pancake + nhận webhook.

Endpoint (đều có prefix /api):
- POST /integrations/pancake/sync-orders — sync đơn 1 user theo SĐT (ADMIN)
- POST /integrations/pancake/sync-categories — kéo danh mục
- POST /integrations/pancake/sync-products — kéo SP + biến thể
- POST /integrations/pancake/sync-all-orders — sync hàng loạt theo khoảng ngày
- POST /integrations/pancake/backfill-order-customers — gán đơn mồ côi vào khách
- **POST /integrations/pancake/webhook** — Pancake GỌI VÀO (order/customer/inventory)
- POST /integrations/pancake/configure-webhook | POST /integrations/pancake/webhook-config

Config: `shopId`, `apiKey` lưu bảng **StoreIntegration**. Header: `x-pancake-signature` (chưa ép),
`x-pancake-shop-id`.
**Gotcha**: chuẩn hoá SĐT (0/84), dedup đơn theo ID, tự tạo khách (ưu tiên phone→email),
map mã trạng thái số của Pancake → OrderStatus, phát hiện giao 1 phần qua COD vs tổng, tính lại rank/totalSpent sau sync.

## 2. ViettelPost (`src/webhooks`)
Nhận webhook từ ViettelPost để cập nhật trạng thái vận chuyển và kéo đơn hàng từ VTP vào CRM.

### Endpoint duy nhất
- **POST /api/viettelpost/webhook** — ViettelPost GỌI VÀO (@Public, @HttpCode 200). DTO: `ViettelPostWebhookDto`
  (ORDER_NUMBER, ORDER_STATUS số, STATUS_NAME, ORDER_STATUSDATE, LOCATION_CURRENTLY, MONEY_COLLECTION, ORDER_REFERENCE, DATA.token...).
- Endpoint LUÔN trả HTTP 200 (`{success:true}` hoặc `{success:true,skipped:'invalid_secret'}`). Lỗi xử lý bị nuốt trong orchestrator. VTP retry tối đa 5 lần khi nhận non-200 → không bao giờ để controller throw.
- Đăng ký URL tại cổng VTP: `https://<domain>/api/viettelpost/webhook`. Cấu hình + copy URL tại `/admin/integrations/viettelpost`.

### Luồng xử lý (handleViettelWebhook)
1. **Verify secret per-store**: `DATA.token` trong payload so sánh bằng `crypto.timingSafeEqual` với `StoreIntegration.metadata.webhookSecret` (platform VIETTELPOST) của từng store. Store khớp cung cấp `storeId`.
   - Có secret cấu hình + token không khớp → trả `{success:true, skipped:'invalid_secret'}` (không xử lý tiếp).
   - Không store nào cấu hình secret → tiếp tục (fallback dev / chưa cấu hình).
   - `NODE_ENV !== 'production'` → luôn tiếp tục bất kể secret.
2. **Capture mẫu**: lưu 5 payload mẫu mới nhất (kèm headers) vào `SystemConfig.viettel_order_webhook_samples`.
3. **Khớp/tạo đơn** (`processViettelPostWebhook`):
   - Khớp theo: trackingCode / metadata `$.partner.trackingCode` / ORDER_REFERENCE / `PCK-{id}`.
   - **Khớp** → `updateOrderFromWebhook`: map mã→status, mở/reject voucher, bắn automation messaging + AdminNotification.
   - **Không khớp** → `createOrderFromViettel`: TẠO ĐƠN MỚI `source='VIETTEL'`, userId=null (khách vãng lai), orderCode=ORDER_NUMBER, totalAmount=MONEY_COLLECTION (COD), status map từ ORDER_STATUS, trackingCode lưu vào metadata. Idempotency: orderCode unique (P2002 bắt im lặng).

### Map mã trạng thái VTP → OrderStatus
| ORDER_STATUS | OrderStatus CRM | Ghi chú |
|---|---|---|
| 100, 101 | _(không đổi)_ | Khi TẠO đơn mới (không khớp CRM) thì fallback PENDING |
| 102, 200, 201, 300, 301 | SHIPPED | |
| 500, 505 | PAYMENT_COLLECTED | Khi tạo đơn còn set paymentStatus=PAID |
| 501, 515 | DELIVERED | |
| 502, 510 | RETURNING | |
| 503, 504, 107 | CANCELLED | |
| còn lại | _(không đổi)_ | |

### Voucher & messaging
- Giao thành công (501/515) → hẹn mở voucher sau 7 ngày (BullMQ) hoặc mở ngay nếu queue tắt.
- Hoàn hàng (502/510) hoặc huỷ (503/504/107) → reject voucher. Giao 1 phần → tính lại discount theo tỷ lệ.
- Bắn `messagingAutomationService.handleOrderStateChange()` + tạo AdminNotification.

### ENV (inbound VTP)
- `VIETTELPOST_WEBHOOK_TOKEN` + `VIETTELPOST_WEBHOOK_SECRET` — **lỗi thời** (legacy), không còn dùng cho xác thực inbound. Secret inbound nay lưu tại `StoreIntegration.metadata.webhookSecret` (per-store, cấu hình qua admin UI).

## 3. Casso / VietQR (`src/webhooks/casso.*`)
Đối soát chuyển khoản ngân hàng → đánh dấu đơn PAID.

- **POST /webhooks/casso** — Casso GỌI VÀO.
- Xác thực: HMAC-SHA512 header `x-casso-signature` dạng `t={ts},s={hash}` (thử 3 cách ghép payload),
  secret `CASSO_SECURE_TOKEN`.
- Khớp đơn: regex mô tả giao dịch `/ORDER:([A-Z0-9]+)/i`; dung sai số tiền 1%.
- Xử lý: paymentStatus=PAID, status PENDING→CONFIRMED, paidAt=now, bắn automation messaging,
  chạy voucher success rules.
- **Gotcha**: nếu đơn đã CANCELLED (VietQR hết hạn) mà tiền về muộn → chỉ log cảnh báo, KHÔNG khôi phục đơn.
  Đơn đã PAID → bỏ qua (idempotent).
- ⚠ Lưu ý: tạo QR đơn (vietqr.io) làm trong **orders.service** lúc tạo đơn (hạn 30 phút). Cron mỗi phút huỷ đơn quá hạn.

## 4. SMS (`src/integrations/sms`)
Service nội bộ (không có endpoint public). Provider: **NetViet SMS HTTP API**
(mặc định `http://125.212.226.79:9020/service/sms_api`), key `NETVIET_SMS_HTTP`.
- Resolve config: DB (`MessageProviderConfig`) trước, fallback env.
- Chuẩn hoá SĐT về 84; validate ≥9 số; log che user/pass.
- Dùng cho OTP + fallback của Zalo ZNS + kênh SMS của Messaging.

## 5. Zalo ZNS — xem docs/02 mục NOTIFICATIONS
Token trong systemConfig, cron 20h refresh, gửi qua BullMQ `zalo-zns`, fallback SMS.

## 6. Mail (`src/mail`)
Nodemailer/SMTP. Hiện dùng `sendModeratorCredentials()` (gửi thông tin đăng nhập store đã duyệt).
Config: SMTP_HOST, SMTP_PORT(587), SMTP_USER, SMTP_PASS, SMTP_SECURE, MAIL_FROM.
⚠ Không retry; `rejectUnauthorized:false` (production nên bật verify cert).

## 7. Address (`src/address`)
GET /address?type=provinces | wards&provinceCode= . districts → [] (bỏ 2025-07-01).
JSON tĩnh `address/data/{tinh_tp,quan_huyen,xa_phuong}.json`, cache RAM.

---

## ENV VARS (chỉ liệt kê KEY — giá trị xem .env, KHÔNG commit secret)

### backend-nestjs/.env (đang có)
```
NODE_ENV, PORT, APP_TIMEZONE, CORS, FRONTEND_URL
DATABASE_URL
JWT_SECRET, JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
SMS_API_URL, SMS_API_USER, SMS_API_PASS, SMS_API_BRANDNAME, SMS_PROVIDER_KEY
```
**Chưa cấu hình (thêm khi cần)**: REDIS_HOST/PORT/PASSWORD/DB (bật BullMQ),
VIETTELPOST_TOKEN (outbound gọi VTP API), CASSO_SECURE_TOKEN,
ZALO_APP_ID/ZALO_APP_SECRET, VIETQR_*, SMTP_* + MAIL_FROM.
**Lỗi thời (inbound VTP)**: `VIETTELPOST_WEBHOOK_TOKEN` + `VIETTELPOST_WEBHOOK_SECRET` — thay bằng `StoreIntegration.metadata.webhookSecret` (per-store). Không còn hiệu lực cho xác thực inbound.
**Lưu ý local**: GOOGLE_CLIENT_ID/SECRET phải có giá trị (dù giả) nếu không GoogleStrategy crash khi boot.
Redis để trống = queue tắt (app vẫn chạy).

### frontend/.env (đang có)
```
NODE_ENV
NEXT_PUBLIC_API_URL          # PHẢI có /api ở cuối: http://localhost:3901/api (apiClient ghép thẳng `${API_URL}/orders`, KHÔNG tự thêm /api → thiếu /api là 404 toàn bộ)
BACKEND_API_URL
JWT_SECRET                   # khớp backend (uploadthing verify)
NEXT_PUBLIC_SUPPORT_EMAIL, _HOTLINE, _ADDRESS, _OFFICE_HOURS, _MESSENGER_URL, _ZALO_URL
```

---

## Triển khai
- **ecosystem.config.js** (PM2): app `chy_crm_backend`, port 8070, cluster 1 instance, log ở logs/.
- **deploy.sh**: hỏi env (DEV/PROD = 72.62.198.196), đóng gói src+prisma, scp + .env, cài deps,
  prisma generate, (tuỳ chọn) reset DB (cần gõ CONFIRM), build, `pm2 startOrReload`.
- **test-pancake-order.ts**: script test tạo/đọc đơn Pancake (chạy thủ công bằng ts-node).

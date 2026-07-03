# Thiết kế: Kéo dữ liệu ViettelPost về CRM (Webhook + Secret)

> Ngày: 2026-06-29 · Phạm vi: backend-nestjs + frontend (admin integrations) · Trạng thái: chờ duyệt
> Đọc kèm: `first_readme.txt`, `docs/05-integrations-webhooks.md`, `backend-nestjs/src/webhooks/README.md`

## 1. Mục tiêu

Cho phép ViettelPost (VTP) **đổ dữ liệu hành trình đơn về CRM theo thời gian thực** qua một webhook endpoint duy nhất, có **xác thực bằng Secret parameter**. Khi webhook báo một đơn:
- **Khớp** đơn trong CRM → cập nhật trạng thái + hành trình (đã có).
- **Không khớp** → **tạo đơn mới `source='VIETTEL'`** để phân tích bán hàng (phần mới).

Ngoài phạm vi lần này (làm sau): auto-login token VTP, refactor getPrice/getOrderInfo, push đơn (`createOrder`).

## 2. Ràng buộc từ tài liệu VTP (partner2)

Trích từ `partner2.viettelpost.vn/document/webhook` + `/general`:
- VTP gửi **HTTP POST** tới **1 URL** đối tác cấu hình. **Mỗi tài khoản chỉ cấu hình ĐƯỢC 1 webhook endpoint** → CRM phải gộp về một endpoint.
- Payload chứa **toàn bộ chi tiết đơn + trạng thái** trong `DATA`.
- Đối tác phải trả **HTTP 200 trong < 1 giây**; nếu không VTP **retry tối đa 5 lần**.
- Hành trình **có thể trùng/thừa** → log + trả 200 để bypass (idempotency).
- Trạng thái cuối: **101/107/201/501/503/504** (không phát sinh thêm).
- **Secret**: `payload.DATA.token` = "Token bảo mật (Secret Key) do đối tác cung cấp để VTP xác thực nguồn gốc webhook". Đối tác tự đặt secret, khai báo cho VTP qua mục *Cấu hình tài khoản → Tham số bí mật*.

Các trường `DATA` dùng đến: `ORDER_NUMBER` (mã vận đơn VTP), `ORDER_REFERENCE` (mã tham chiếu đối tác), `ORDER_STATUS` (int), `ORDER_STATUSDATE`, `STATUS_NAME`, `MONEY_COLLECTION` (COD), `MONEY_TOTAL`, `RECEIVER_FULLNAME`, `IS_RETURNING`, `REASON_CODE`, `NOTE`, `LOCATION_CURRENTLY`, `token` (secret).

> Lưu ý: `DETAIL[]` trong payload là **dịch vụ cộng thêm**, KHÔNG phải sản phẩm. ⇒ Đơn `source='VIETTEL'` tạo từ webhook **không có line-item sản phẩm**; phân tích ở cấp đơn (COD/tổng tiền/trạng thái/khách).

## 3. Kiến trúc

### 3.1 Một webhook endpoint thống nhất

`POST /api/viettelpost/webhook` (`@Public`, `@HttpCode(200)`), luồng:

```
1. Verify Secret      → đối chiếu payload.DATA.token với StoreIntegration (timingSafeEqual)
                        → xác định storeId của integration khớp; sai secret (prod) → 200 + log, KHÔNG xử lý
2. Lưu raw log mẫu    → SystemConfig 'viettel_order_webhook_samples' (giữ 5 payload gần nhất, để soi cấu trúc)
3. Khớp đơn           → orderCode / metadata $.partner.trackingCode / ORDER_REFERENCE / PCK-{id}
     ├─ TÌM THẤY      → updateOrderFromWebhook(...) (ĐÃ CÓ: map status, courierUpdates, voucher, automation)
     └─ KHÔNG THẤY    → createOrderFromViettel(payload, storeId)  (MỚI)
4. Luôn trả { success:true } HTTP 200 trong <1s; mọi lỗi map → log + 200 (tránh VTP retry vô ích)
```

Endpoint `POST /api/viettelpost/order-webhook` (capture stub hiện tại) **gỡ bỏ**; phần capture-log gộp vào bước 2. (Hệ quả: cập nhật `webhooks.controller.ts`, `webhooks.service.ts`, docs.)

### 3.2 Xác thực Secret (per-store, lưu trong StoreIntegration)

- Secret lưu tại `StoreIntegration.metadata.webhookSecret` (platform `VIETTELPOST`). **Tách biệt** với `accessToken` (accessToken = token VTP cho outbound; webhookSecret = secret cho inbound).
- `validateWebhookToken` đổi thành: tìm `StoreIntegration` platform=VIETTELPOST, isActive, so `metadata.webhookSecret` với `payload.DATA.token` bằng `crypto.timingSafeEqual`. Trả về integration khớp (để lấy `storeId`) hoặc null.
- Fallback dev: nếu chưa cấu hình secret nào → cho qua + cảnh báo (giữ hành vi dev hiện tại). Production: không khớp secret → từ chối xử lý (vẫn trả 200 để VTP không retry, nhưng KHÔNG tạo/sửa đơn).
- Secret là **store router**: integration khớp xác định `storeId` cho đơn tạo mới.

### 3.3 Tạo đơn `source='VIETTEL'` — `createOrderFromViettel(payload, storeId)`

Map payload → `Order` (userId=null, đơn khách vãng lai):

| Order field | Nguồn từ payload |
|---|---|
| `orderCode` | `ORDER_NUMBER` (mã vận đơn VTP) — unique |
| `source` | `'VIETTEL'` (gọi `OrderSourcesService.ensureExists('VIETTEL','Viettel')`) |
| `storeId` | từ integration khớp secret |
| `shippingName` | `RECEIVER_FULLNAME` |
| `shippingPhone` | (payload nếu có; thường không có ở webhook hành trình → null) |
| `subtotal` / `totalAmount` | `MONEY_TOTAL` ?? `MONEY_COLLECTION` ?? 0 |
| `status` | `mapVtpStatusToOrderStatus(ORDER_STATUS)` (bảng map dùng chung) |
| `paymentStatus` | PAID nếu `ORDER_STATUS` ∈ {500,505} hoặc IS đã thu COD; else UNPAID |
| `metadata.partner` | `{ provider:'VIETTELPOST', trackingCode:ORDER_NUMBER, cod, courierUpdates:[...], reference:ORDER_REFERENCE }` |
| `note` | `STATUS_NAME` / `NOTE` |

- Sau khi tạo: chạy đúng nhánh hậu xử lý mà `updateOrderFromWebhook` đang làm cho đơn khớp (notif admin type 'VTP', messaging automation) — gom dùng chung để không lặp.
- **Idempotency tạo đơn**: trước khi tạo, kiểm tra lại theo `orderCode=ORDER_NUMBER` (transaction) để 2 webhook trùng không tạo 2 đơn. Dùng `upsert` theo `orderCode` hoặc `create` bắt lỗi P2002 → chuyển sang nhánh update.

### 3.4 Bảng map trạng thái dùng chung

Gộp `mapVtpStatusToOrderStatus` (webhooks.service) và `mapViettelPostStatus` (voucher.processor) về **một** hàm/hằng số trong `webhooks.service` (hoặc helper chung) để không phân kỳ. (Chỉ gộp, không đổi logic mapping hiện có.)

## 4. Frontend (admin integrations)

Trang `/admin/integrations/viettelpost` ([platform]/page.tsx) bổ sung cho platform VIETTELPOST:
- **Hiển thị Webhook URL** (read-only + nút copy): `${NEXT_PUBLIC_API_URL}/viettelpost/webhook` để admin dán sang VTP. Kèm ghi chú: phải là domain CÔNG KHAI (localhost không nhận được webhook); nếu `NEXT_PUBLIC_API_URL` đang trỏ localhost thì hiển thị cảnh báo.
- **Ô nhập "Tham số bí mật (Secret)"** → lưu vào `metadata.webhookSecret` của StoreIntegration (qua API integrations sẵn có). Có nút sinh secret ngẫu nhiên gợi ý.
- Giữ ô Token (accessToken) hiện có (dùng cho outbound sau này).

## 5. Xử lý lỗi

- Sai/thiếu secret (prod): log cảnh báo, **trả 200**, không xử lý đơn.
- Map payload lỗi / DB lỗi: bắt try/catch, log, **trả 200** (tránh VTP retry 5 lần vô ích vào lỗi không tự khỏi).
- Webhook trùng: dedup `courierUpdates` theo `(key, update_at)` (đã có) → trả 200.
- Đơn tạo mới đua nhau: bắt P2002 trên `orderCode` → fallback update.

## 6. Kiểm thử (TDD)

Unit test `webhooks.service`:
1. Secret đúng → trả integration + storeId; secret sai (prod) → null/từ chối; dev thiếu secret → cho qua.
2. `timingSafeEqual` không sai khi độ dài secret khác nhau (không throw).
3. Webhook khớp đơn → gọi nhánh update (không tạo đơn mới).
4. Webhook không khớp → tạo đúng 1 đơn `source='VIETTEL'` với orderCode=ORDER_NUMBER, status map đúng, storeId đúng.
5. Webhook không khớp gửi 2 lần (cùng ORDER_NUMBER) → chỉ 1 đơn (idempotency P2002).
6. Map trạng thái: 501→DELIVERED, 500/505→PAYMENT_COLLECTED, 502/510→RETURNING, 503/504/107→CANCELLED, 100/101→null.

Mọi nhánh đều assert response = HTTP 200.

## 7. Tài liệu cập nhật sau khi xong

- `docs/05-integrations-webhooks.md` (luồng webhook VTP + secret + tạo đơn VIETTEL).
- `backend-nestjs/src/webhooks/README.md` (gộp endpoint, secret per-store, map dùng chung).
- `docs/changelog.md`.

## 8. Quyết định đã chốt

- Auth/token outbound: auto-login + refresh — **để sau**, không thuộc lần này.
- Đơn không khớp → **tạo `source='VIETTEL'`** (đã chốt).
- Secret → **lưu StoreIntegration** per-store, verify `timingSafeEqual` (đã chốt).
- Gộp 2 endpoint webhook thành 1 (vì VTP chỉ cho 1 URL).

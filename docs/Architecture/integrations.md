# 🔌 TÍCH HỢP BÊN THỨ 3 & WEBHOOK (docs/Architecture/integrations.md)

---

## 1. Bảng Tổng quan Tích hợp

| Hệ thống | Loại tích hợp | Chiều | Cơ chế xác thực | Idempotency |
|---|---|---|---|---|
| **Pancake POS** | Sync + Webhook | 2 chiều | API Key (DB) + Header `x-pancake-signature` | Dedup theo Order ID |
| **ViettelPost** | Webhook Vận chuyển | Vào (Inbound) | Webhook Secret per-store (`timingSafeEqual`) | `orderCode` unique |
| **ViettelPost Outbound** | Tạo đơn & Tra cứu | Ra (Outbound) | Partner Token (v2/v3 API) | `trackingCode` / `draftCode` |
| **Meta Ads** | Pull Ingestion | Vào | User/System User Token (`ads_read`) | Upsert (platform, level, entity, date) |
| **Messenger Live Chat** | Webhook + Send API | 2 chiều | App Secret HMAC-SHA256 (`X-Hub-Signature-256`) | Message ID `mid` unique |
| **Casso (VietQR)** | Webhook Thanh toán | Vào | HMAC-SHA512 (`x-casso-signature`) | Match mã đơn trong memo |
| **SMS Gateway** | HTTP Service | Ra | NetViet SMS Provider Key | Ghi nhận `MessageLog.idempotencyKey` |
| **Zalo ZNS** | Official Account API | Ra | OAuth Token (tự refresh 20h) + BullMQ | Template ID mapping |

---

## 2. Chi tiết Tích hợp Pancake POS (`src/integrations/pancake`)
- Đồng bộ sản phẩm, biến thể, danh mục và đơn hàng 2 chiều giữa CRM và Pancake POS.
- Webhook nhận thông báo đơn hàng mới, cập nhật trạng thái giao hàng và thay đổi tồn kho kho hàng.
- Chuẩn hóa số điện thoại khách hàng (định dạng `84` / `0`), tự động tạo hồ sơ khách hàng và tính toán lại Rank khách hàng sau khi đồng bộ.

---

## 3. Chi tiết Tích hợp ViettelPost (`src/integrations/viettelpost` & `src/webhooks`)
- **Webhook Inbound**: Nhận sự kiện thay đổi trạng thái bưu gửi từ ViettelPost (`ORDER_STATUS`), cập nhật trạng thái đơn hàng CRM:
  - `501`, `515` (Giao thành công) → `DELIVERED` (kích hoạt mở khóa Voucher thưởng sau 7 ngày).
  - `500`, `505` (Thu tiền COD) → `PAYMENT_COLLECTED` & `PAID`.
  - `502`, `510` (Chuyển hoàn) → `RETURNING` (từ chối voucher).
- **Outbound API**: Tạo đơn vận chuyển ViettelPost trực tiếp từ CRM, hỗ trợ danh mục địa danh hành chính 2 cấp mới (sau 1/7/2025: Tỉnh/Thành phố và Xã/Phường trực thuộc).
- **Đối soát COD (`ViettelpostCodService`)**: Đồng bộ trạng thái chuyển tiền COD từ cổng web ViettelPost định kỳ mỗi giờ.

---

## 4. Chi tiết Tích hợp Meta Ads & Facebook OAuth (`src/integrations/facebook` & `src/integrations/ads`)
- **Facebook OAuth & Token Vault**: Quản trị viên đăng nhập Facebook, CRM tự động lấy Long-Lived Token (mã hóa chuẩn AES-256-GCM lưu trong `fb_connections`), tự động quét và liên kết toàn bộ Business Manager, Ad Account và Fanpage.
- **Meta Ads Ingestion**: Kéo dữ liệu chiến dịch, nhóm quảng cáo, bài quảng cáo và chỉ số hiệu suất chi tiêu (`spend`, `impressions`, `clicks`, `results`) định kỳ mỗi 3 giờ.
- **Messenger Live Chat**: Nhận và trả lời tin nhắn Fanpage trực tiếp qua Meta Messenger Platform.

---

## 5. Chi tiết Thanh toán VietQR & Casso (`src/webhooks/casso.*`)
- Sinh mã QR động (chuẩn VietQR) có nhúng mã đơn hàng `ORDER:<code>` và số tiền chính xác khi khách đặt hàng.
- Webhook Casso tự động khớp giao dịch chuyển khoản ngân hàng qua nội dung thanh toán (memo), tự động chuyển đơn sang `PAID` và kích hoạt luồng đóng gói.


# 06 — MESSAGING / CHĂM SÓC KHÁCH HÀNG (SMS-first)

Vị trí: `backend-nestjs/src/messaging` (+ `src/modules/admin-notifications`, `src/integrations/sms`).
Đây là HỆ THỐNG TRUNG TÂM của CRM. FE: `app/admin/customer-care/*`.
Tài liệu nghiệp vụ gốc: `customer-care-technical-backlog.md`.

> Phân biệt: module **messaging** = nhắn tin hàng loạt/tự động (SMS/Zalo/…); module
> **notifications** (docs/02) = thông báo cá nhân + Zalo ZNS. Đừng nhầm.

## Luồng end-to-end
```
Template  ─┐
           ├─▶ Campaign ─▶ Audience(người nhận) ─▶ Schedule/Automation ─▶ Provider ─▶ MessageLog
Filter/Import┘                                       (BullMQ queue)        (SMS API)
```
1. Tạo **template** (nội dung có biến `{{ var }}`).
2. Tạo **campaign** từ audience lọc (KH/đơn) hoặc danh sách import.
3. **Audience** resolve người nhận theo điều kiện.
4. Gửi ngay (IMMEDIATE) hoặc hẹn giờ (SCHEDULED) hoặc tự động (AUTOMATED qua trigger).
5. **Provider** (SMS NetViet) gửi, ghi **MessageLog** (trạng thái + lỗi).

## Các service (vai trò)
- **MessagingService** — điều phối gửi: enqueue/dequeue, check opt-out, cooldown, idempotency (SHA256),
  auto-stop campaign khi tỷ lệ lỗi cao, fallback gửi inline khi không có Redis.
- **MessagingAdminService** — CRUD template/campaign/schedule/automation; gửi-ngay; query + export CSV log; dashboard/health.
- **MessagingAdminController** — REST `/admin/messaging/*` (bảng endpoint dưới).
- **MessagingSchedulerService** — @Cron mỗi phút: chạy schedule tới hạn.
- **MessagingAudienceService** — resolve người nhận từ CUSTOMERS/ORDERS theo filter (rank, trạng thái đơn, chi tiêu, ngày…).
- **MessagingAutomationService** — xử lý trigger sự kiện + 3 cron sáng (8:00 sinh nhật, 8:05 voucher, 8:10 inactivity).
- **MessagingProviderRegistryService** — registry adapter theo kênh (hiện chỉ SMS).
- **MessagingRendererService** — thay biến `{{ }}`, trả nội dung + biến chưa resolve.
- **MessagingValidatorService** — validate người nhận, nội dung, độ dài SMS (≤ SMS_MESSAGE_MAX_LENGTH, mặc định 1000).
- **MessagingProcessor** — worker BullMQ xử lý job dispatch.
- **SmsMessagingProvider** + **SmsService** — gửi SMS thật (chuẩn hoá phone 84, gọi NetViet API).

## Endpoint `/admin/messaging/*` (đều cần guard role + permission MESSAGING_*)
**Templates**: GET /templates · POST /templates · GET/PATCH/DELETE /templates/:id
**Campaigns**: POST /campaigns · POST /campaigns/import · GET /campaigns · GET /campaigns/:id · POST /campaigns/:id/send-now
**Schedules**: GET /schedules · PATCH /schedules/:id · PATCH /schedules/:id/cancel
**Gửi/preview**: POST /send-single · POST /preview
**Audience**: POST /audience-preview (trả tối đa `limit`, mặc định 200)
**Logs**: GET /logs · GET /logs/:id · POST /logs/:id/retry · GET /logs/export/csv
**Automation**: GET /automation-rules · GET /automation-rules/:id · GET /automation-rules/:id/executions ·
  POST /automation-rules · PATCH/DELETE /automation-rules/:id
**Provider config**: GET /sms-provider-config · PUT /sms-provider-config
**Operations**: GET /operations/dashboard · GET /operations/health

Quyền: MESSAGING_VIEW (xem) · COMPOSE (tạo/sửa template/campaign/config) · SEND (gửi/retry) ·
SCHEDULE (lịch) · RULE_MANAGE (automation) · LOG_VIEW (log/dashboard). MANAGE = tất cả.

## Khái niệm then chốt (enum chính xác xem docs/04)
- **Kênh** (MessageChannelCode): SMS (đang dùng), ZALO/MESSENGER/WHATSAPP/TIKTOK/SHOPEE (thiết kế sẵn).
- **Template kind**: PRESET / CUSTOM.
- **Audience source**: MANUAL / FILTER / IMPORT.
- **Send mode**: IMMEDIATE / SCHEDULED / AUTOMATED.
- **Purpose + cooldown**: TRANSACTIONAL, OTP (cooldown 0 mặc định), MARKETING (mặc định 1 tin/ngày).
- **Opt-out**: bảng MessageOptOut (unique channelId+recipientValue) — trúng thì log status=SKIPPED.
- **Automation trigger**: theo đơn (ORDER_*), thanh toán (PAYMENT_*), khách (CUSTOMER_CREATED/INACTIVE_30D/60D),
  voucher (VOUCHER_*), sinh nhật (BIRTHDAY_TODAY).

## BullMQ
- Queue `message-dispatch`, job `dispatch-message`, dead-letter `message-dead-letter`.
- Retry: backoff mũ (mặc định 3 lần, 5s). Rate-limit mặc định 5 tin / 1000ms.
- **Không Redis** → processor không đăng ký → fallback gửi inline đồng bộ.

## An toàn campaign (tự dừng)
Auto-stop nếu `failedCount ≥ STOP_FAILURE_COUNT` (mặc định 5) VÀ `failureRate ≥ STOP_FAILURE_RATE`
(mặc định 0.5): campaign→FAILED, schedule→CANCELLED, audience chờ→SKIPPED. Lý do lưu campaign.metadata.

## Biến template (tự điền từ userId/orderId/storeId)
customer_name, phone, email, order_code, order_amount, total_amount, subtotal, discount_amount,
shipping_fee, voucher_value, shipping_name/phone/address, customer_rank, order_count, last_order_date,
store_name, product_names, product_summary. (Biến PHẢI khai báo trong `template.variables[]` để validate.)

## admin-notifications (WebSocket realtime)
Namespace `/admin`, emit `new_admin_notification`. Service `createNotification()` được webhook/order/user
gọi để đẩy cảnh báo (đơn mới, campaign xong/lỗi, cảnh báo SMS provider…). ⚠ Chưa verify JWT trên socket.

## Cạm bẫy khi sửa
1. **Idempotency**: MessageLog.idempotencyKey (hash channel+recipient+template+content+campaign+vars) →
   gửi trùng trả về log cũ (deduplicated). Đừng phá hash này.
2. **Opt-out vs cooldown** đều chặn ở khâu enqueue, tạo log SKIPPED — không phải lỗi.
3. **Cron automation giờ cứng** (8:00/8:05/8:10, TZ APP_TIMEZONE mặc định Asia/Bangkok) — không tuỳ chỉnh/rule.
4. **Provider config scope**: storeId=null = global mặc định; storeId=<id> = riêng store (ưu tiên).
   pass bị che trong log.
5. **Chuẩn hoá phone**: 0→84, giữ 84, khác thì thêm 84; cuối cùng `84\d{8,11}`.
6. **Giới hạn SMS** 1000 ký tự ép ở validator trước khi enqueue (không ép lúc tạo template).
7. Campaign lớn tạo nhiều **MessageAudience** (1 dòng/người) + snapshotData (ngữ cảnh bất biến).

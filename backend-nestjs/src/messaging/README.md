# messaging — Hệ CSKH SMS-first (template→campaign→audience→gửi→log)
> Context cho AI — đọc trước khi sửa. Toàn cục: `../../../first_readme.txt` + `docs/06-messaging-customer-care.md` + `docs/07-quy-tac-code.md`.
> Đây là HỆ TRUNG TÂM của CRM. FE: `frontend/src/app/admin/customer-care/*`. Nghiệp vụ gốc: `customer-care-technical-backlog.md`.
> ⚠ Đừng nhầm với module **notifications** (docs/02 — thông báo cá nhân + Zalo ZNS). messaging = nhắn tin hàng loạt/tự động.

## Luồng end-to-end
```
Template ─┐
          ├─▶ Campaign ─▶ Audience(người nhận) ─▶ Schedule/Automation ─▶ Provider(SMS) ─▶ MessageLog
Filter/Import┘                                    (BullMQ queue, fallback inline)
```
IMMEDIATE (gửi ngay) / SCHEDULED (hẹn giờ) / AUTOMATED (trigger sự kiện hoặc cron sáng).

## File chính (nhóm theo vai trò service)
- `messaging.service.ts` — **MessagingService**: lõi điều phối gửi. `queueMessage()` chuẩn bị msg → check opt-out → check cooldown → tạo MessageLog (idempotency) → enqueue BullMQ hoặc **fallback inline** khi không Redis. `previewMessage()`, `processDispatchJob()`, `retryFailedLog()`, auto-stop campaign.
- `messaging-admin.service.ts` — **MessagingAdminService**: CRUD template/campaign/schedule/automation; gửi-ngay (`send-now`); import campaign từ CSV; query + export CSV log; dashboard/health; `upsertSmsProviderConfig()`.
- `messaging-admin.controller.ts` — **MessagingAdminController**: REST `/admin/messaging/*` (mọi endpoint gắn JwtAuthGuard + RolesGuard + PermissionsGuard + `@Permissions(MESSAGING_*)`).
- `messaging-scheduler.service.ts` — **MessagingSchedulerService**: `@Cron` mỗi phút, chạy schedule tới hạn (khoá lạc quan chống chạy chồng).
- `messaging-automation.service.ts` — **MessagingAutomationService**: xử lý trigger sự kiện (ORDER_*/PAYMENT_*/CUSTOMER_*/VOUCHER_*/BIRTHDAY_TODAY) + 3 cron sáng cứng giờ (8:00 sinh nhật, 8:05 voucher, 8:10 inactivity) theo TZ `APP_TIMEZONE` (mặc định Asia/Bangkok).
- `messaging-audience.service.ts` — **MessagingAudienceService**: resolve người nhận từ CUSTOMERS/ORDERS theo filter (rank, trạng thái đơn, chi tiêu, ngày…). `audience-preview` trả tối đa `limit` (mặc định 200).
- `messaging-renderer.service.ts` — **MessagingRendererService**: thay biến `{{ var }}`, trả `content` + `renderedVariables` + `unresolvedVariables`.
- `messaging-validator.service.ts` — **MessagingValidatorService**: `validatePayload()` — validate người nhận + nội dung + độ dài SMS (≤ `SMS_MESSAGE_MAX_LENGTH`, mặc định 1000).
- `messaging-provider-registry.service.ts` — **MessagingProviderRegistryService**: registry adapter theo kênh (hiện chỉ SMS → `providers/sms-messaging.provider.ts`).
- `messaging.processor.ts` — **MessagingProcessor**: worker BullMQ xử lý job `dispatch-message` (chỉ đăng ký khi có Redis).
- `providers/sms-messaging.provider.ts` — **SmsMessagingProvider**: adapter SMS; `validateRecipient()` ép `^84\d{8,11}$`; gọi `SmsService.sendMessage()` (xem `../integrations/sms/README.md`).
- `messaging.constants.ts` — tên queue/job: `message-dispatch`, `message-dead-letter`, `dispatch-message`.
- `messaging.types.ts` — interface input/output (QueueMessageInput, MessageProviderAdapter…).
- `messaging.module.ts` — wiring; queue đăng ký optional (`@Optional()`) để chạy được khi không Redis.
- `dto/` — input + class-validator (ValidationPipe global bật `forbidNonWhitelisted` → thêm field PHẢI khai báo DTO).

## Luồng / khái niệm quan trọng (gotcha)
- **idempotencyKey**: SHA256 hash channel+recipient+template+content+campaign+automation+purpose+store+user+order+vars → gửi trùng trả về log cũ (`deduplicated`). ĐỪNG phá hash này (`createIdempotencyKey`). Job dùng `jobId: idempotencyKey`.
- **Opt-out**: bảng `MessageOptOut` (unique channelId+recipientValue), trúng → log `SKIPPED` (không phải lỗi). Chặn ở khâu enqueue.
- **Cooldown theo purpose**: TRANSACTIONAL/OTP (mặc định 0) vs MARKETING (mặc định 1 tin/ngày). Trúng → log `SKIPPED`.
- **Auto-stop campaign**: `failedCount ≥ STOP_FAILURE_COUNT` (mặc định 5) VÀ `failureRate ≥ STOP_FAILURE_RATE` (mặc định 0.5) → campaign=FAILED, schedule=CANCELLED, audience chờ=SKIPPED; lý do lưu `campaign.metadata`.
- **BullMQ + fallback inline**: queue inject `@Optional()`. Không Redis → `dispatchQueue` undefined → `processDispatchJob()` chạy đồng bộ. Add job lỗi cũng fallback inline. Retry backoff mũ (mặc định 3 lần/5s), rate-limit 5 tin/1000ms.
- **Scheduler cron** mỗi phút (schedule tới hạn) + automation cron sáng cứng giờ — sửa logic nhớ kiểm cron tương ứng (docs/07 B.8).
- **Render biến**: chỉ `{{ var }}` phẳng (không hỗ trợ `{{ a.b }}`). Biến PHẢI khai báo trong `template.variables[]` mới validate. Biến tự điền: customer_name, phone, order_code, order_amount, total_amount, store_name, product_summary… (xem docs/06).
- **Validate độ dài SMS** ép ở validator TRƯỚC khi enqueue, KHÔNG ép lúc tạo template.
- **Scope store (provider config)**: `storeId=null` = global mặc định; `storeId=<id>` = riêng store (ưu tiên). Pass bị che trong log.
- **Campaign lớn**: 1 dòng `MessageAudience`/người + `snapshotData` (ngữ cảnh bất biến tại thời điểm tạo).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết `docs/audit-report.md`)
- 🟡 `messaging.service.ts:127-153` — **cooldown check ngoài transaction**: MARKETING gửi song song có thể vượt giới hạn 1/ngày. Hướng sửa: kiểm + tạo log trong cùng `$transaction`, hoặc unique constraint theo cửa sổ thời gian.
- 🟡 `messaging.service.ts:179-194` — **fallback inline (không Redis) không bọc catch** ở `sendSingleMessage`/`retryFailedLog`: API trả 500 dù log đã FAILED. Hướng sửa: catch lỗi dispatch inline, trả log thay vì throw.
- 🟡 `messaging-admin.service.ts:2004-2045` — import gộp `invalidCount` + `duplicateCount` → khó kiểm danh sách lớn. Hướng sửa: tách 2 con số + trả danh sách dòng lỗi.
- 🟡 `messaging-admin.service.ts:273-314` — `upsertSmsProviderConfig` dùng findFirst→create/update, **thiếu unique `(channelId,storeId)`** → race tạo 2 config trùng scope → chọn config SMS không tất định. Hướng sửa: thêm `@@unique` (bàn vì DB đã import dump) hoặc xử lý lỗi P2002.
- 🟡 (kênh liên quan) `../modules/admin-notifications/admin-notifications.gateway.ts:51-55` — WebSocket `/admin` **chưa verify JWT**: mọi client join + nhận broadcast. Hướng sửa: verify JWT + role trong `handleConnection`, disconnect nếu sai.
- ✅ Điểm tốt (giữ nguyên): idempotency chống gửi trùng; opt-out/cooldown→SKIPPED; auto-stop campaign; fallback không-Redis bài bản; scheduler khoá lạc quan; automation chống chạy lại trigger; mask secret SMS trong log.

## Quy ước khi sửa
- Nghiệp vụ ở `*.service.ts`, controller chỉ mỏng. Input qua DTO + class-validator (thêm field mới PHẢI khai DTO, nếu không 400).
- Endpoint admin LUÔN đủ `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles(...)` + `@Permissions(MESSAGING_*)`. Quyền: VIEW/COMPOSE/SEND/SCHEDULE/RULE_MANAGE/LOG_VIEW; MANAGE bao tất cả (alias trong PermissionsGuard).
- Multi-store: non-admin LUÔN scope theo `@GetEffectiveStoreId()`. ADMIN=null=toàn hệ thống.
- KHÔNG giả định queue luôn sống — giữ nhánh fallback inline. KHÔNG phá idempotencyKey. Dùng đúng enum (`@prisma/client`, nguồn sự thật `schema.prisma`), đừng hardcode chuỗi trạng thái.
- Đổi endpoint/model/enum/quy tắc → cập nhật `docs/06` (+ `docs/04` nếu thêm model/enum) + `first_readme.txt` nếu cốt lõi.

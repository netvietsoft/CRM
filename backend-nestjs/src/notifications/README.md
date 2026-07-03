# notifications — Thông báo cá nhân + Zalo ZNS (SMS fallback)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (docs/02 mục NOTIFICATIONS, docs/05 mục 5).
> KHÁC module `messaging` (CSKH SMS-first). Đây là thông báo cá nhân + tích hợp Zalo ZNS.

## File chính
- `notifications.controller.ts` — User: GET /notifications, POST /:id/read, /read-all, DELETE /:id. Admin: GET /zalo/config, /zalo/templates, POST /zalo/templates, /:id/sync, POST /zalo/bulk, /zalo/token/refresh.
- `notifications.service.ts` — CRUD thông báo + điều phối gửi ZNS.
- `zalo-token.service.ts` — token Zalo lưu trong `systemConfig`, cron tự refresh (OAuth v4).
- `zalo-zns.processor.ts` — BullMQ queue `zalo-zns`: gửi ZNS (openapi.zalo.me); thất bại cuối → SMS fallback.
- `zbs-template.service.ts` — tạo template PROMOTION qua ZBS, chờ Zalo duyệt (PENDING_REVIEW).
- `dto/` — create-template, send-bulk-zalo.

## Luồng / logic quan trọng (gotcha)
- Enum kênh `NotificationChannel` = ZALO/FB_MESSENGER/SMS/EMAIL; `NotificationStatus` = QUEUED/SENT/DELIVERED/FAILED.
- **Zalo token**: lưu/đọc qua systemConfig; cron refresh OAuth. **BullMQ fallback**: không Redis → queue tắt, cần nhánh fallback (ZNS thất bại → SMS).
- Gửi ZNS qua queue `zalo-zns`; chuỗi fallback cuối cùng là SMS (`integrations/sms`).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟡 `zalo-token.service.ts:128` — `@Cron('0 */20 * * *')` KHÔNG phải mỗi 20 giờ → chỉ chạy 00:00 & 20:00. **Sửa:** dùng biểu thức cron đúng ý đồ (vd `@Cron('0 0 */20 * * *')` cẩn thận field giờ, hoặc đặt CronExpression rõ ràng).

## Quy ước khi sửa
- Token Zalo chỉ đọc/ghi qua systemConfig — đừng hardcode.
- Mọi nhánh gửi PHẢI có fallback khi không Redis (đừng giả định queue sống).
- Endpoint admin (zalo/*) gắn đủ guard + @Roles + @Permissions; user gắn JWT.
- Field mới PHẢI khai báo trong DTO.

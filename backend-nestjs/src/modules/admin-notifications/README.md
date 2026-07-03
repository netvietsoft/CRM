# admin-notifications — Thông báo realtime cho admin qua WebSocket (namespace /admin)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: xem ../../../../first_readme.txt + docs/.

## File chính
- `admin-notifications.gateway.ts` — WebSocketGateway namespace `/admin`, emit event `new_admin_notification`. CORS lọc theo `CORS`/`FRONTEND_URL` (+ cho phép localhost khi không production).
- `admin-notifications.service.ts` — `createNotification()` lưu bản ghi `AdminNotification` rồi `gateway.emitNewNotification()`. Được NHIỀU module gọi (đơn mới, campaign xong, cảnh báo lỗi SMS, support...). Cũng có getNotifications/markAsRead/markAllAsRead.
- `admin-notifications.controller.ts` — endpoint `/admin/notifications/*`: list (phân trang + filter type), read, read-all. Gắn `JwtAuthGuard, RolesGuard` + `@Roles('ADMIN','STAFF','MODERATOR')`.
- `admin-notifications.module.ts` — wiring (export service + gateway cho module khác inject).

## Luồng / logic quan trọng (gotcha)
- `createNotification()` **nuốt lỗi** (try/catch chỉ log) → gọi nó không bao giờ throw lên caller; đừng dựa vào nó để báo lỗi nghiệp vụ.
- Gateway broadcast cho TẤT CẢ client đang nối `/admin` (`server.emit`) — không lọc theo store/role ở tầng socket.
- Module này khác với `src/notifications` (Zalo ZNS/SMS cá nhân cho khách) — đây là thông báo nội bộ admin.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `admin-notifications.gateway.ts:51-55` (`handleConnection`) — WebSocket `/admin` KHÔNG verify JWT → mọi client (CORS cho phép) đều join và nhận broadcast thông báo nội bộ admin. Hướng sửa: verify JWT + role trong `handleConnection` (đọc token từ handshake auth/cookie), `client.disconnect()` nếu sai. Cân nhắc emit theo room thay vì broadcast toàn bộ.

## Quy ước khi sửa
- Endpoint REST giữ guard `JwtAuthGuard, RolesGuard` + `@Roles(...)` (docs/07 B.3); socket cần tự verify trong gateway (chưa có guard tự động).
- Khi thêm loại thông báo mới: gọi `createNotification({ type, title, message, link?, metadata? })`, nhớ nó nuốt lỗi nên đừng coi giá trị trả về là chắc chắn.
- Đường dẫn file này sâu hơn (`src/modules/...`) → import guard/decorator dùng `../../auth/...` (2 cấp), không phải `../auth/...`.
- BullMQ/Redis có thể tắt ở local; realtime socket vẫn chạy độc lập với queue.

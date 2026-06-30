# Thiết kế: Hộp thư Messenger (chat với khách hàng của Page) — v1

> Trạng thái: CHỜ DUYỆT · Ngày: 2026-06-30 · Phạm vi: Meta Messenger Platform (trực tiếp)

## 1. Mục tiêu & phạm vi v1
Cho nhân viên **nhận và trả lời tin nhắn Messenger 1-1** của khách nhắn vào Fanpage, ngay trong CRM (giống inbox Pancake), real-time.

**Trong phạm vi v1:**
- 1 page thử nghiệm (page mà token đang có quyền `MESSAGING`, vd CHY Design).
- Nhận tin real-time qua **webhook Messenger**.
- Hiển thị: danh sách hội thoại │ khung chat │ ô soạn.
- **Trả lời**: text + ảnh (Send API), xử lý cửa sổ 24h.
- Backfill lịch sử hội thoại gần đây.
- Real-time qua WebSocket (tái dùng `admin-notifications` gateway).
- Scope đa cửa hàng + phân quyền.

**Ngoài phạm vi v1 (giai đoạn sau):** bình luận dưới bài page; nhiều page/tất cả page; gán nhân viên/nhãn; liên kết đơn hàng–khách CRM; tin nhắn mẫu/tự động; báo cáo.

## 2. Điều kiện tiên quyết (ops, ngoài code)
- **Meta App riêng** (đã có) với `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`. Cần **App Review (Advanced Access)** để nhắn tin với người ngoài danh sách test khi app ở Live; page do mình quản trị test được ngay ở Dev mode.
- **DN đã xác minh** (đã có) — bắt buộc cho Advanced Access.
- **URL public HTTPS** để Meta gọi webhook: domain production, hoặc tunnel (cloudflared/ngrok) khi chạy local.
- **Page access token** có quyền MESSAGING (lấy từ `/me/accounts` access_token của page).
- ⚠️ Local hiện có proxy chặn TLS outbound → các call **đi ra Meta** (Send API, subscribe, lấy profile, backfill) sẽ lỗi cert ở local; chạy được ở prod hoặc khi set `NODE_EXTRA_CA_CERTS`. Webhook (Meta → ta) là inbound, không bị ảnh hưởng.

## 3. Kiến trúc & luồng
```
Khách nhắn page ─► Meta ─►(webhook POST) /api/webhooks/messenger
                                   │ verify chữ ký X-Hub-Signature-256 (app secret)
                                   │ parse entry[].messaging[]
                                   ▼
                upsert MsgContact + MsgConversation + MsgMessage(IN)
                                   │
                                   ▼  emit WebSocket 'messenger:message'
                              UI inbox cập nhật tức thì

Nhân viên trả lời ─►(POST /api/messenger/conversations/:id/reply)
   ─► Send API POST /{page-id}/messages (page token) ─► lưu MsgMessage(OUT)
      (ngoài cửa sổ 24h → chặn hoặc dùng message tag)
```

## 4. Data model (Prisma, bảng mới)
- **MsgPage**: `id`, `storeId?`, `platform="META"`, `externalId`(page id), `name`, `accessToken`(page token, @db.Text), `subscribed Boolean`, `lastSyncedAt?`, timestamps. `@@unique([platform, externalId])`.
- **MsgContact**: `id`, `pageId`(FK), `psid`(page-scoped id), `name?`, `avatarUrl?`, `raw?`, timestamps. `@@unique([pageId, psid])`.
- **MsgConversation**: `id`, `pageId`(FK), `contactId`(FK), `lastMessageAt?`, `lastMessageText? @db.Text`, `lastMessageDir?`(IN/OUT), `unreadCount Int @default(0)`, `status @default("OPEN")`, timestamps. `@@unique([pageId, contactId])`, index `[pageId, lastMessageAt]`.
- **MsgMessage**: `id`, `conversationId`(FK), `mid? @unique`(Meta message id, chống trùng webhook), `direction`(IN/OUT), `text? @db.Text`, `attachments Json?`, `status?`(SENT/DELIVERED/READ/FAILED), `sentByUserId?`(nhân viên trả lời), `createdAt`. index `[conversationId, createdAt]`.

## 5. Backend (NestJS) — module `messenger`
- **Webhook** (trong module webhooks hiện có):
  - `GET /webhooks/messenger` → trả `hub.challenge` nếu `hub.verify_token` == `MESSENGER_VERIFY_TOKEN`.
  - `POST /webhooks/messenger` → verify `X-Hub-Signature-256` (HMAC-SHA256 app secret); xử lý `message` (mid, sender psid, text, attachments), `message_echoes` (tin gửi từ nguồn khác → OUT), `delivery`, `read`. Idempotent theo `mid`.
- **MessengerService**: upsert contact/conversation/message; lấy profile (`GET /{psid}?fields=name,profile_pic`); gửi (`POST /{page}/messages`); subscribe (`POST /{page}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_echoes`); backfill (`GET /{page}/conversations` → `/{conv}/messages`).
- **Endpoints** (guard JWT+Roles+Permissions, scope theo `effectiveStoreId` qua page.storeId):
  - `GET /messenger/pages` — page đã kết nối.
  - `POST /messenger/pages/:externalId/subscribe` — bật webhook cho page.
  - `GET /messenger/conversations?pageId=&q=` — danh sách hội thoại (sắp theo lastMessageAt).
  - `GET /messenger/conversations/:id/messages` — thread.
  - `POST /messenger/conversations/:id/reply` `{ text?, attachmentUrl? }` — gửi.
  - `POST /messenger/conversations/:id/read` — reset unreadCount.
  - `POST /messenger/backfill` `{ pageExternalId }` — kéo lịch sử.
- **Realtime**: emit qua `admin-notifications` gateway, event `messenger:message` (payload: conversation tóm tắt + message).
- **Phân quyền**: thêm `Permission.MESSENGER_VIEW` (xem) + `MESSENGER_SEND` (trả lời).

## 6. Frontend
- Route `/admin/messenger` (hoặc dưới nhánh sidebar mới "Tin nhắn"): layout 3 cột — danh sách hội thoại │ thread │ composer. Kết nối WebSocket để nhận tin mới; badge chưa đọc; nút "Đồng bộ" (backfill).

## 7. Env mới
`MESSENGER_VERIFY_TOKEN` (chuỗi tự đặt), `META_APP_SECRET` (verify chữ ký webhook). Page token lưu trong `MsgPage.accessToken`.

## 8. Kiểm thử
- Page test (CHY Design). Local: dựng tunnel HTTPS → khai báo Callback URL trong Meta App → gửi tin thử từ FB. Prod: dùng domain thật.
- Verify: nhận webhook → tin hiện real-time; trả lời → khách nhận; idempotency theo mid; scope: MODERATOR chỉ thấy hội thoại của page thuộc store mình.

## 9. Rủi ro / điểm cần quyết
- App Review `pages_messaging` có thể mất vài tuần (chỉ ảnh hưởng khi nhắn người ngoài/Live).
- Page đang nối Pancake: nhiều app cùng subscribe webhook vẫn được, nhưng cần để ý tin trùng (đã chống bằng `mid`).
- Cửa sổ 24h: ngoài 24h chỉ gửi được khi có message tag hợp lệ — v1 sẽ **chặn + báo** thay vì lách tag.
- Local TLS proxy: call ra Meta lỗi cert ở local (đã nêu mục 2).

## 10. Quyết định mặc định (có thể đổi khi review)
- v1 **gồm trả lời** (không chỉ đọc).
- Ngoài 24h: chặn gửi (không dùng tag).
- Quyền mới `MESSENGER_VIEW`/`MESSENGER_SEND` (không tái dùng INTEGRATIONS_*).

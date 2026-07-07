# 09 — CCM WORKSPACE (`/ccm/*`) — Chat · Đơn hàng · Cài đặt

> **Trạng thái (2026-07-06):** Hội thoại + Tạo/Danh sách đơn + Đẩy Viettel Post + **Bài viết (Graph API)** + **Thống kê (số thật)** + một số trang Cài đặt đã **NỐI THẬT**. Vài trang Cài đặt (xoay vòng, lịch sử, phân quyền) còn **template**.
> **Đã RESKIN pixel-perfect** theo `Newdesign/design_handoff_crm_ccm` (tokens CCM + 4 màn + 12 tab Cài đặt + rail SVG); thêm **toggle giới tính** (`MsgContact.gender`). Đã **merge main + deploy production** (lestgoai.com). Xem `docs/changelog.md` (2026-07-06) + `docs/design-gap-crm-redesign.md`.

---

## 1. Mục đích
**CCM** = workspace full-screen kiểu Pancake (pages.fm): chăm sóc khách qua Messenger + tạo đơn + đẩy vận chuyển, tách khỏi chrome CRM (top-nav riêng). Vào từ sidebar CRM → **"CCM"**.

## 2. Định tuyến — `frontend/src/app/ccm/`
```
ccm/
  layout.tsx              # Server: getSession()+check role; render CcmTopNav
  page.tsx                # redirect → /ccm/conversations
  conversations/page.tsx  # CHAT THẬT (CcmConversations) — /messenger/* + /orders + /viettelpost
  orders/page.tsx         # DANH SÁCH ĐƠN THẬT — GET /orders/admin + nút Đẩy VTP
  posts/page.tsx          # Bài viết THẬT (Graph API) — layout template + lọc ngày/tìm
  stats/*                 # Thống kê — số liệu THẬT (GET /messenger/stats), biểu đồ SVG
  settings/
    page.tsx              # Cài đặt chung — ÂM BÁO thật (Web Audio) + bật/tắt
    quick-reply/page.tsx  # Hỗ trợ trả lời — CRUD mẫu (THẬT, nối composer)
    tags/page.tsx         # Thẻ hội thoại — CRUD catalog (THẬT, nối picker nhãn)
    interface/page.tsx    # Giao diện — prefs (THẬT, list đọc live)
    shipping/page.tsx     # Vận chuyển ĐVVC — Viettel read-only (GET /viettelpost/config)
    ai/ calls/ rotation/ sync/ tools/ permissions/ history/  # template
```

## 3. Component + lib — `frontend/src/components/ccm/` & `frontend/src/lib/`
| File | Vai trò |
|---|---|
| `CcmConversations.tsx` | Khu chat 4 cột (rail lọc · list · chat · panel). Bản đồ frame: `components/ccm/README.md`. |
| `CcmCustomerPanel.tsx` | [Cột 4] Thông tin (đơn thật của khách) + Tạo đơn (thật) + Thẻ (order/customer). |
| `CcmViettelPushDialog.tsx` | Dialog đẩy 1 đơn CRM → Viettel Post (địa chỉ VTP + tra cước + tạo vận đơn). |
| `CcmImagePicker.tsx` | Popup "Thư mục ảnh" — thư viện media dùng chung (upload **R2**, list từ BE, fav localStorage) cho nút 🖼️. |
| `CcmTopNav.tsx` / `SubNav.tsx` | Điều hướng. |
| `ui.tsx` | UI kit template (Card/StatCard/biểu đồ SVG…). |
| `lib/useMessengerChat.ts` | Hook chat: `/messenger/*` + realtime + `assignTo`/`staff` + `setStar`/`setContactDob` (optimistic). |
| `lib/useCcmSettings.ts` | **Store localStorage + pub/sub**: `quickReplies` (đa nội dung), `tags`, `prefs` (nối Cài đặt ↔ chat). `getPrefs()` non-hook. |
| `lib/ccmSounds.ts` | Âm thông báo tổng hợp Web Audio (6 âm, `playSound`). |
| `lib/resolveVars.ts` | Resolve biến `#{...}` khi gửi (tên khách/NV/ngày, `#SEX{}`, spin, `TODAY()`). |
| `lib/uploadR2.ts` | `uploadToR2(file, folder)` → `POST /upload/media` (R2 SigV4 tay). |
| `public/ccm-icons/*.svg` | 16 icon Pancake thật cho header 3A. |

## 4. Nối backend — endpoint tái dùng + endpoint MỚI (phiên 2026-07-01)
**Tái dùng sẵn có:** `POST /orders/admin`, `GET /orders/admin`, `GET /products/search`, `GET/POST /viettelpost/address/*`, `POST /viettelpost/price`, `POST /viettelpost/orders`, `GET /viettelpost/customers/:code`, `GET /admin/staff/members`, `POST /messenger/conversations/:id/{assign,labels,reply,read}`.

**Mới thêm (đều additive):**
- `GET /orders/by-conversation/:conversationId` — đơn tạo từ 1 hội thoại (lọc `metadata.conversationId`).
- `PATCH /orders/:id/carrier-info` — ghi `metadata.carrier` (provider/trackingCode) sau khi đẩy ĐVVC.
- `updateAdminFields` nhận thêm `customerTags`.
- `GET /viettelpost/config` — thông tin sender (read-only, che SĐT, không lộ user/pass).
- `POST /messenger/conversations/:id/assign-user` + `messenger.service.assignToUser` — phân công cho 1 NV cụ thể.
- `POST /messenger/conversations/:id/star` (`setStar`) — sao ưu tiên (`MsgConversation.star`).
- `POST /messenger/conversations/:id/contact-dob` (`setContactDob`) — ngày sinh khách (`MsgContact.dob`, sync `User.dob`).
- `POST /messenger/conversations/:id/contact-gender` (`setContactGender`) — giới tính khách (`MsgContact.gender` MALE/FEMALE/OTHER, sync `User.gender` khi SĐT khớp duy nhất).
- `GET /messenger/pages/:externalId/posts` (`listPagePosts` + `fetchPagePosts`) — bài viết đã đăng của page.
- `GET /messenger/stats?days=` (`stats`) — đếm tin/hội thoại thật N ngày.
- `POST /upload/media` + `GET /upload/media/list` (module `src/upload/`, R2 SigV4) — thư viện media dùng chung.

## 5. Liên kết dữ liệu chính
- **Đơn ↔ hội thoại**: `order.metadata.conversationId` (+ `psid`, `source:'CCM'`).
- **Đơn ↔ vận đơn VTP**: `order.metadata.carrier.trackingCode` ⟷ `viettel_customers.orderReference = order.orderCode`.
- **Thẻ đơn/khách**: `order.metadata.tags` / `order.metadata.customerTags`.
- **Sao ưu tiên**: `MsgConversation.star` (yellow|green|red|null). **Sinh nhật**: `MsgContact.dob` ⟷ `User.dob` (khớp SĐT).
- **Media**: `MediaAsset` (R2) — dùng chung team; fav để localStorage.
- **Cài đặt CCM (quick-reply/tags/prefs)**: localStorage (per-browser) — CHƯA có bảng backend.

## 6. Lộ trình còn lại
1. **Phân quyền** → thêm `PATCH /admin/staff/:id/permissions` (đã có `User.staffPermissions`).
2. **Xoay vòng** → model config + engine auto-assign khi có hội thoại mới.
3. **Lịch sử** → endpoint đọc `MessageAuditLog` + ghi log khi đổi cài đặt.
4. **Cài đặt CCM dùng chung team** → chuyển quick-reply/tags/prefs từ localStorage sang bảng backend.
5. ✅ **Bài viết / Thống kê** → đã nối Graph API + `GET /messenger/stats` (2026-07-03).

Chi tiết colocated: `frontend/src/app/ccm/README.md`, `frontend/src/components/ccm/README.md`.

---
## 6b. AI chốt đơn qua chat (khung — cần ANTHROPIC_API_KEY)
Module `backend-nestjs/src/ai-agent/` (client fetch Anthropic · tools · orchestrator · controller). Hook vào `messenger.service.handleMessaging` (tin IN) qua `ModuleRef`. Config theo page ở `/ccm/settings/ai` (OFF/SHADOW/AUTO + persona). SHADOW → gợi ý ở composer (duyệt); AUTO → tự trả lời + tạo đơn PENDING (`metadata.aiGenerated`). Guardrail: xác nhận trước khi chốt, dry-run shadow, 24h, bỏ echo, lỗi→HANDOFF, kill-switch per page. Chi tiết: spec/plan `docs/superpowers/{specs,plans}/2026-07-01-ai-chot-don-chat*`. Endpoints: `/ai-agent/{config,suggestions,suggestions/:id/approve,conversations/:id/pause}`.

---
## 7. Nhắc lại (module liên quan)
- Messenger Inbox backend: `docs/05` mục 0b. · Meta Ads: `docs/05` mục 0 + `docs/08`. · Facebook OAuth: `docs/05` mục 0c. · Viettel Post API: `docs/viettelpost-api-spec.md`.

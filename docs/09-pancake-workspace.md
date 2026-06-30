# 09 — PANCAKE WORKSPACE (UI templates) + Messenger Inbox

> Trạng thái: **TEMPLATE / MOCK** cho phần Pancake (`/pancake/*`) — giao diện đã dựng đủ, **chưa nối dữ liệu thật**; ghép logic từng chức năng sau.
> Messenger Inbox (`/admin/messenger`) thì đã có **backend thật** (xem `docs/05` mục 0b).
> ⚠️ Code nằm trên nhánh `fix/meta-ads-module` (Messenger/Ads đã commit) + working tree (Pancake untracked) — chưa merge `main`.

---

## 1. Mục tiêu
Dựng sẵn toàn bộ khung giao diện kiểu **Pancake** (pages.fm) để sau ghép nối từng chức năng (hội thoại thật, đơn, bài viết, thống kê, cài đặt). Tách biệt với chrome CRM: workspace full-screen, top-nav riêng.

## 2. Định tuyến (Next.js App Router) — `frontend/src/app/pancake/`
```
pancake/
  layout.tsx              # Server: getSession() + check role; render PancakeTopNav + <main>
  page.tsx                # redirect → /pancake/conversations
  conversations/page.tsx  # Hội thoại: icon rail + tag màu + list khách + khu chat trống (mock)
  orders/page.tsx         # Đơn hàng: KPI + filter + bảng đơn (mock)
  posts/page.tsx          # Bài viết: panel lọc trái + danh sách bài (mock)
  stats/
    layout.tsx            # SubNav "Thống kê"
    page.tsx              # Tổng quan (chart + cards)
    pages/ staff/ interactions/ tags/ callcenter/ ads/ reviews/ backup/   # 8 trang con
  settings/
    layout.tsx            # SubNav "Cài đặt"
    page.tsx              # Cài đặt chung (toggles)
    tags/ ai/ quick-reply/ interface/ calls/ rotation/ sync/ tools/ permissions/ history/   # 10 trang con
```

## 3. Component dùng chung — `frontend/src/components/pancake/`
- `PancakeTopNav.tsx` — top-nav 5 tab (Hội thoại/Đơn hàng/Bài viết/Thống kê/Cài đặt) + link "← CRM".
- `SubNav.tsx` — sidebar con (dùng cho Thống kê & Cài đặt), active theo `pathname`.
- `ui.tsx` — UI kit: `Card`, `StatCard`, `Sparkline`, `MockChart`, `Donut`, gauge, `Toggle`, `Pill`, `MockTable`, `SettingSection`, `SettingRow`, `MockBadge`. **Biểu đồ là SVG tự vẽ** (không thư viện ngoài → không vướng CSP, không cần data thật).

## 4. Quy ước
- Mọi trang gắn `<MockBadge/>` (`template · mock`) để phân biệt chưa nối dữ liệu.
- Dữ liệu hiện tại là hằng số mẫu (khớp ảnh Pancake), KHÔNG gọi API.
- Truy cập: sidebar CRM → **"Pancake (Chat)"** → `/pancake/conversations`; hoặc URL trực tiếp.

## 5. Lộ trình ghép logic (gợi ý, làm sau)
1. **Hội thoại** → nối API `/messenger/*` đã có (conversations/messages/reply/realtime).
2. **Đơn hàng** → nối Pancake POS (`/integrations/pancake`) hoặc orders CRM.
3. **Thống kê** → endpoint tổng hợp (tin nhắn/bình luận/nhân viên/đơn).
4. **Cài đặt** → lưu cấu hình (thẻ hội thoại, trả lời nhanh, phân quyền, xoay vòng).
5. **Bài viết** → Graph API page feed (cần quyền `pages_read_engagement`).

---

## 6. Messenger Inbox (đã có backend thật) — tóm tắt
Chi tiết đầy đủ: `docs/05-integrations-webhooks.md` mục **0b**. Module `backend-nestjs/src/messenger`:
- `meta-messenger.client.ts` (Send API/profile/subscribe/fetch), `messenger.service.ts` (ingest/reply/assign/labels/backfill), `messenger.controller.ts` + `messenger-webhook.controller.ts` (PUBLIC), `messenger-signature.util.ts`.
- FE `frontend/src/app/admin/messenger` + `components/admin/MessengerInbox.tsx` (3 cột, realtime, gửi ảnh, gán, nhãn).
- Cần ops: env `MESSENGER_VERIFY_TOKEN` + `META_APP_SECRET`, URL public HTTPS cho webhook, App Review `pages_messaging`.

## 7. Meta Ads (đã có) — tóm tắt
Chi tiết: `docs/05` mục 0 + `docs/08-ads-dashboard-ui.md`. Route mới **`/admin/adsmeta/accall`** (danh sách tài khoản) · **`/admin/adsmeta/[accountId]`** (dashboard, có bộ lọc preset ngày Hôm nay→Quý này) · **`/admin/adsmeta/pages`** (Fanpage + 7 quyền). Backend `src/integrations/ads` (scope đa cửa hàng, queue, tiền tệ, fundingDetails, fetchPages).

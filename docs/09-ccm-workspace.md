# 09 — CCM WORKSPACE (`/ccm/*`, UI templates) + Messenger Inbox

> **Trạng thái: TEMPLATE / MOCK** cho phần CCM (`/ccm/*`) — giao diện đã dựng đủ, **chưa nối dữ liệu thật**; ghép logic từng chức năng sau.
> Messenger Inbox (`/admin/messenger`) đã có **backend thật** (xem `docs/05` mục 0b).
> Tất cả đã hợp nhất trên nhánh `main`.

---

## 1. Mục đích
**CCM** = workspace **full-screen giao diện kiểu Pancake** (pages.fm) để sau ghép nối từng chức năng (hội thoại thật, đơn, bài viết, thống kê, cài đặt). Tách khỏi chrome CRM: top-nav riêng, không dùng `AdminShell`. Vào từ sidebar CRM → **"CCM"** hoặc thanh menu top → **"CCM (Chat)"**.

## 2. Định tuyến — `frontend/src/app/ccm/`
```
ccm/
  layout.tsx              # Server: getSession() + check role; render CcmTopNav + <main>
  page.tsx                # redirect → /ccm/conversations
  conversations/page.tsx  # Hội thoại: icon rail + tag màu + list khách + khung chat trống (mock)
  orders/page.tsx         # Đơn hàng: KPI + filter + bảng (mock)
  posts/page.tsx          # Bài viết: panel lọc trái + list bài (mock)
  stats/    layout.tsx page.tsx(Tổng quan) pages/ staff/ interactions/ tags/ callcenter/ ads/ reviews/ backup/
  settings/ layout.tsx page.tsx(Cài đặt chung) tags/ ai/ quick-reply/ interface/ calls/ rotation/ sync/ tools/ permissions/ history/
```

## 3. Component dùng chung — `frontend/src/components/ccm/`
- `CcmTopNav.tsx` — top-nav 5 tab (Hội thoại/Đơn hàng/Bài viết/Thống kê/Cài đặt) + link "← CRM".
- `SubNav.tsx` — sidebar con (Thống kê & Cài đặt), active theo `pathname`.
- `ui.tsx` — UI kit: `Card`, `StatCard`, `Sparkline`, `MockChart`, `Donut`, gauge, `Toggle`, `Pill`, `MockTable`, `SettingSection`, `SettingRow`, `MockBadge`. **Biểu đồ SVG tự vẽ** (không thư viện ngoài → không vướng CSP).

## 4. Quy ước
- Mọi trang gắn `<MockBadge/>` (`template · mock`).
- Dữ liệu hằng số mẫu, KHÔNG gọi API. Auth: `layout.tsx` (server) chặn như `/admin`.

## 5. Lộ trình ghép logic (làm sau)
1. **Hội thoại** → API `/messenger/*` (backend thật đã có).
2. **Đơn hàng** → Pancake POS (`src/integrations/pancake`) hoặc orders CRM.
3. **Thống kê** → endpoint tổng hợp (tin nhắn/bình luận/nhân viên/đơn).
4. **Cài đặt** → lưu cấu hình (thẻ, trả lời nhanh, phân quyền, xoay vòng).
5. **Bài viết** → Graph API page feed (quyền `pages_read_engagement`).

Chi tiết colocated: `frontend/src/app/ccm/README.md`, `frontend/src/components/ccm/README.md`.

---

## 6. Messenger Inbox (backend thật) — tóm tắt
Đầy đủ: `docs/05` mục **0b**. Module `backend-nestjs/src/messenger` (client/service/controller/webhook), FE `/admin/messenger` (3 cột, realtime, gửi ảnh, gán, nhãn).

## 7. Meta Ads (đã có) — tóm tắt
`docs/05` mục 0 + `docs/08`. Route `/admin/adsmeta/accall` · `/admin/adsmeta/[accountId]` (preset ngày) · `/admin/adsmeta/pages` (Fanpage + 7 quyền).

## 8. Facebook OAuth (đa BM) + token vault — tóm tắt
`docs/05` mục **0c**. Module `backend-nestjs/src/integrations/facebook` + FE `FacebookConnectCard` ở `/admin/integrations`.

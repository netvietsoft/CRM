# CCM Workspace (`/ccm/*`) — README

> **Trạng thái: TEMPLATE / MOCK.** Toàn bộ giao diện đã dựng, **chưa nối dữ liệu thật** (trừ khi ghi rõ). Ghép logic từng phần sau.
> Tài liệu tổng: [`docs/09-ccm-workspace.md`](../../../../docs/09-ccm-workspace.md) · Đọc kèm `docs/05` (Messenger/Ads) & `docs/changelog.md`.

## Mục đích
Workspace **full-screen kiểu CCM** (pages.fm), tách khỏi chrome CRM (top-nav riêng, không dùng `AdminShell`). Vào từ sidebar CRM → "CCM (Chat)" hoặc thanh menu top → "Chat (CCM)".

## Cây thư mục
```
app/ccm/
  layout.tsx              # Server: getSession() + check role ADMIN/STAFF/MODERATOR; render CCMTopNav + <main>
  page.tsx                # redirect → /ccm/conversations
  conversations/page.tsx  # Hội thoại: icon rail + tag màu + list khách + khung chat trống (MOCK)
  orders/page.tsx         # Đơn hàng: KPI + filter + bảng (MOCK)
  posts/page.tsx          # Bài viết: panel lọc trái + list bài (MOCK)
  stats/
    layout.tsx  page.tsx (Tổng quan)  pages/ staff/ interactions/ tags/ callcenter/ ads/ reviews/ backup/
  settings/
    layout.tsx  page.tsx (Cài đặt chung)  tags/ ai/ quick-reply/ interface/ calls/ rotation/ sync/ tools/ permissions/ history/

components/ccm/       # (thư mục riêng — xem components/ccm/README.md)
  CCMTopNav.tsx  SubNav.tsx  ui.tsx
```

## Quy ước
- Mọi trang gắn `<MockBadge/>` (`template · mock`) để biết chưa nối API.
- Dữ liệu = hằng số mẫu; biểu đồ = **SVG tự vẽ** trong `ui.tsx` (không thư viện ngoài → không vướng CSP).
- Auth: `layout.tsx` (server) chặn như `/admin`. Route ngoài `/admin` nên KHÔNG có sidebar CRM.

## Lộ trình ghép logic (làm sau)
1. **Hội thoại** → API `/messenger/*` (đã có backend thật: conversations/messages/reply/realtime).
2. **Đơn hàng** → CCM POS (`/integrations/ccm`) hoặc orders CRM.
3. **Thống kê** → endpoint tổng hợp (tin nhắn/bình luận/nhân viên/đơn).
4. **Cài đặt** → lưu cấu hình (thẻ, trả lời nhanh, phân quyền, xoay vòng).
5. **Bài viết** → Graph API page feed (quyền `pages_read_engagement`).

## Thêm màn mới
Tạo `app/ccm/<section>/page.tsx` `'use client'` + dùng UI kit từ `@/components/ccm/ui`. Nếu có sub-nav (như stats/settings) → thêm mục vào mảng `ITEMS` trong `layout.tsx` tương ứng.

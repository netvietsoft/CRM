# app/admin — route khu quản trị (gate ADMIN/STAFF/MODERATOR)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../../first_readme.txt + docs/03.

## File / thành phần chính
- `layout.tsx` — gate role RSC (ADMIN/STAFF/MODERATOR; MODERATOR bị chặn nếu store chưa duyệt) + AdminShell.
- Cốt lõi: `orders/` (+ `[id]`, `create-order/`, `actions.ts`), `products/` (+ `[id]`, `create-product/`), `categories/`, `stores/` (+ `[id]`), `customers/` (+ `[id]/` chứa `CustomerActions.tsx`), `materials/`, `suppliers/`, `units/`, `product-tags/`.
- Loyalty: `vouchers/`, `order-vouchers/`, `referral-vouchers/`, `ranks/`, `commissions/`, `referrals/`, `spin/`, `qr-config/`.
- Vận hành: `integrations/` (+ `[platform]/`, `zalo/`), `my-store/`, `staff/` (+ `assign/`).
- CSKH: `customer-care/*` (templates/campaigns/automations/schedules/logs/import/settings) — backend ở docs/06.
- Mỗi mục thường có `page.tsx` (RSC, fetch qua apiClient) + `loading.tsx`. Component nặng nằm ở `components/admin`; logic create-order tách `createOrder.*`.

## Quy ước (gotcha)
- `page.tsx` mặc định RSC: fetch qua `apiClient` (server, gắn Bearer từ cookie). Tương tác/state → tách `<X>Client.tsx` `'use client'` gọi `apiClientClient`.
- KHÔNG fetch trần (mất auto-refresh 401/403). Base URL phải có `/api`. Không lộ secret ra client.
- Gating có 2 lớp: middleware `src/proxy.ts` (đang chạy — Next 16 đổi `middleware.ts`→`proxy.ts`) + redirect trong `layout.tsx`. Backend vẫn là nơi phân quyền thật.
- Thêm trang admin mới → cập nhật `AdminSidebar` + docs/03 (docs/07 E).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `app/admin/customers/[id]/CustomerActions.tsx:34-37, 63-66` — xoá khách (soft/hard) bằng `fetch` trần, thiếu credentials/Bearer → 401 hoặc hành vi không chắc. Hướng sửa: dùng `apiClientClient.delete`.
- 🟡 `OrderList`/`ProductsClient`… và route `customer-care` dùng client fetch — kiểm `apiClientClient` (xem mục Frontend audit).

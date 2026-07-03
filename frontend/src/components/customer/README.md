# components/customer — UI khu portal khách hàng
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../../first_readme.txt + docs/03.

## File / thành phần chính
- Khung: `PortalNavbar.tsx` (+ `PortalNavbarSearch.tsx`), `Footer.tsx`, `PortalContent.tsx`, `FloatingCartButton.tsx`.
- Sản phẩm: `ProductsClient.tsx`, `ProductDetailClient.tsx`, `CategoryFilter.tsx`.
- Đánh giá: `ProductReviews.tsx`, `ReviewForm.tsx`, `OrderReviewForm.tsx`, `ReviewImageUploader.tsx`.
- Đơn/giao hàng: `TrackingButton.tsx`, `TrackingModal.tsx`.
- Loyalty/QR: `SpinWheelClient.tsx`, `QrClaimModal.tsx` (dùng actions/qrClaimActions).
- Hỗ trợ: `SupportContactPage.tsx`.

## Quy ước (gotcha)
- Phần lớn là `'use client'`. Gọi backend qua `apiClientClient` (KHÔNG fetch trần — mất auto-refresh 401/403). Base URL phải có `/api`.
- Portal gate khách hàng (proxy.ts + layout) — admin/staff bị đẩy ra khỏi portal.
- Logout PHẢI gửi cookie để backend thu hồi refresh token → cần `credentials:'include'` (apiClientClient đã có).
- Tailwind 4 + component tự viết. Tái dùng `components/ui`. Upload ảnh qua UploadThing. Không lộ secret ra client.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `PortalNavbar.tsx:48` — logout `fetch` thiếu `credentials:'include'` → backend không nhận cookie để thu hồi refresh token (logout không thực sự). Hướng sửa: dùng `apiClientClient` hoặc thêm `credentials:'include'`.
- 🟡 `fetch` trần (mất auto-refresh) ở: `ProductDetailClient.tsx:197,257,684`, `ReviewForm.tsx:49`, `OrderReviewForm.tsx:66`, `ProductReviews.tsx:80`, `PortalNavbarSearch.tsx:45`. Hướng sửa: chuyển sang `apiClientClient`.

# app/portal — route khu khách hàng (gate CUSTOMER)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../../first_readme.txt + docs/03.

## File / thành phần chính
- `layout.tsx` — gate khách hàng (đẩy admin/staff ra) + khung portal (PortalNavbar/Footer).
- Mua sắm: `page.tsx`, `products/` (+ `[slug]/`), `cart/` (`CartClient.tsx`), `checkout/` (+ `vietqr/` `VietQRPaymentClient`, `success/`, `types.ts`).
- Đơn hàng: `orders/` (`OrderList.tsx`, `[id]/OrderDetailClient.tsx`).
- Hồ sơ/loyalty: `profile/` (`ProfileForm.tsx`), `vouchers/`, `referral/` (`ReferralCard.tsx`), `spin/`.
- Seller: `stores/[slug]/`, `seller-register/` (`SellerRegisterClient.tsx`).
- Hỗ trợ/chính sách: `support/*` (about/contact/order-guide), `policies/*`, `how-to/*`, `faq/`.
- Component nặng nằm ở `components/customer`; mỗi mục thường có `loading.tsx`.

## Quy ước (gotcha)
- `page.tsx` mặc định RSC (fetch qua `apiClient`); tương tác/state → `<X>Client.tsx` `'use client'` gọi `apiClientClient`.
- KHÔNG fetch trần (mất auto-refresh 401/403). Base URL phải có `/api`. Không lộ secret ra client.
- Gating: middleware `src/proxy.ts` (đang chạy) + redirect `layout.tsx`. Logout phải gửi cookie (credentials:'include') để thu hồi refresh token.
- Thêm trang portal mới → docs/03 (docs/07 E). Địa chỉ VN lấy từ `/internal-api/address` (JSON tĩnh), không gọi backend.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟡 `fetch` trần (mất auto-refresh) ở: `orders/[id]/OrderDetailClient.tsx:273,301`, `orders/OrderList.tsx:120`, `seller-register/SellerRegisterClient.tsx:78`. Hướng sửa: chuyển sang `apiClientClient`.
- 🔴 Liên quan: logout ở `components/customer/PortalNavbar.tsx:48` thiếu `credentials:'include'` (xem README components/customer).

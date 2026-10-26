# 💻 KIẾN TRÚC FRONTEND (docs/Architecture/frontend.md)

> Vị trí mã nguồn: `frontend/src`. Sử dụng kiến trúc Next.js App Router (React Server Components + Client Components).

---

## 1. Ngăn xếp Công nghệ (Tech Stack)
- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**.
- **Tailwind CSS 4** (PostCSS). Bộ icon: **lucide-react**. Toàn bộ UI component được tùy biến trực tiếp, không phụ thuộc shadcn/radix.
- **Quản lý State**:
  - Không dùng Redux/Zustand — Quản lý state qua Server (RSC + `getSession()`) và React State cục bộ trong Client Component.
  - Tự xây dựng custom hooks: `useApi`, `useMutation`, `useDebounce`.
- **Upload & File Storage**: Upload qua Cloudflare R2 / SigV4.
- **Realtime**: `socket.io-client` kết nối tới WebSocket Gateway `/admin`.
- **Thông báo**: `react-toastify`.

---

## 2. Quản lý Phiên & Auth phía Frontend
- `lib/auth.ts` → `getSession()` (Server Action) gọi backend `GET /api/users/me`. Trả về `SessionUser` (id, role, name, referralCode, totalSpent, avatarUrl, phone, email, store).
- **JWT Cookie**: Lưu `crm_access_token` và `crm_refresh_token` trong HttpOnly Cookie.
- **Hai cơ chế API Client**:
  1. `apiClient` (Server-side): Đọc cookie qua `await cookies()` và gắn Bearer token vào header.
  2. `apiClientClient` (Client-side): Tự động cấu hình `credentials: 'include'` và tự động refresh token khi gặp mã lỗi 401.

---

## 3. Bản đồ Tuyến đường (Route Map)

### 3.1. Tuyến đường Công khai & Auth
- `/`: Trang chủ
- `/login`: Đăng nhập (Số điện thoại / Email / Google OAuth)
- `/onboarding`: Khảo sát và bổ sung thông tin khách hàng mới
- `/contact`, `/faq`, `/how-to/*`, `/policy/*`

### 3.2. Bảng Quản trị Admin (`/admin/*`) — Gate ADMIN / STAFF / MODERATOR
- `/admin`: Dashboard thống kê doanh thu, đơn hàng, khách hàng
- `/admin/orders` (+ `[id]`, `create-order`): Quản lý và lọc đơn hàng nâng cao
- `/admin/products` (+ `[id]`, `create-product`): Quản lý catalog, biến thể, giá vốn
- `/admin/categories`, `/admin/stores`, `/admin/customers` (+ `[id]`)
- `/admin/materials`, `/admin/suppliers`, `/admin/units`, `/admin/product-tags`
- `/admin/vouchers`, `/admin/order-vouchers`, `/admin/referral-vouchers`, `/admin/spin`
- `/admin/ranks`, `/admin/commissions`, `/admin/referrals`
- `/admin/integrations` (+ `zalo`, `pancake`, `viettelpost`, `facebook`)
- `/admin/adsmeta/[accountId]`: Dashboard báo cáo hiệu quả quảng cáo Meta Ads
- `/admin/customer-care/*`: Quản lý mẫu tin nhắn, chiến dịch, kịch bản tự động, log gửi tin

### 3.3. Cổng Khách hàng Portal (`/portal/*`) — Gate CUSTOMER
- `/portal`: Trang mua sắm chính
- `/portal/products` (+ `[slug]`): Danh sách và chi tiết sản phẩm
- `/portal/cart`, `/portal/checkout` (+ `vietqr`, `success`): Giỏ hàng và thanh toán
- `/portal/orders` (+ `[id]`): Lịch sử và tra cứu hành trình đơn hàng
- `/portal/profile`, `/portal/vouchers`, `/portal/referral`, `/portal/spin`: Hồ sơ, ví voucher, cây giới thiệu và vòng quay
- `/portal/stores/[slug]`, `/portal/seller-register`: Đăng ký và quản lý gian hàng

---

## 4. Các Thư viện Tiện ích Cốt lõi (`src/lib/`)
- `apiClient.ts`: Fetch dữ liệu từ server-side.
- `apiClientClient.ts`: Fetch dữ liệu từ client-side kèm auto-refresh token.
- `auth.ts`: Helper lấy session user và tạo mã giới thiệu.
- `format.ts`: Định dạng tiền tệ VND (`1.234.567 đ`) và số liệu chuẩn vi-VN.
- `adminMessaging.ts`, `spreadsheet.ts`, `imageLoader.ts`.


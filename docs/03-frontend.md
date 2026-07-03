# 03 — FRONTEND (Next.js)

Vị trí: `frontend/src`. App Router. 219 file `.tsx`, 30 `.ts`.

## Tech stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**.
- **Tailwind CSS 4** (PostCSS). Icon: **lucide-react**. KHÔNG dùng shadcn/Radix — component tự viết.
- KHÔNG có Redux/Zustand — state qua server (RSC + `getSession()`) và client component cục bộ.
- KHÔNG có SWR/React Query — dùng hook tự viết `useApi` / `useMutation` + RSC.
- KHÔNG có form library — form viết tay + Server Actions.
- Upload ảnh: **UploadThing**. Realtime: **socket.io-client**. Toast: **react-toastify**.
  QR: **qrcode**. Doc export: **docx**. Địa chỉ VN: **hanhchinhvn** + JSON tĩnh.
- `next.config.ts`: `images.unoptimized=true`; cho phép ảnh từ `lh3.googleusercontent.com` (Google)
  và CDN UploadThing.
- (Có `prisma` trong deps nhưng chỉ cho seed/script — runtime KHÔNG truy cập DB.)

## Auth phía FE
- `lib/auth.ts` → `getSession()` (Server Action) gọi `GET /users/me`. Trả `SessionUser`
  (id, role, name, referralCode, totalSpent, commissionBalance, avatarUrl, phone, email, store).
- JWT trong cookie `crm_access_token` (httpOnly do backend set).
- `apiClient` (server): đọc cookie qua `await cookies()`, gắn Bearer.
- `apiClientClient` (client): `credentials:'include'`; tự refresh qua `POST /auth/refresh` khi 401/403
  (dedupe promise refresh tránh race). Endpoint truyền dạng RELATIVE (vd `/reviews`), client tự prepend
  `NEXT_PUBLIC_API_URL`; method throw `Error(message)` khi !ok → bắt bằng `catch (err)` đọc `err.message`.
  ⚠ Luôn set `Content-Type: application/json` → KHÔNG dùng cho upload FormData (giữ fetch trần/UploadThing).
- Client component gọi backend NÊN dùng `apiClientClient` (không `fetch` trần) để giữ auto-refresh.
  Đã migrate (2026-06-29) các trang review/wishlist/cart/order/seller-register; còn lại checkout/vietqr/profile/
  voucher + route `/internal-api/*` (route nội bộ Next — fetch trần là ĐÚNG) chưa migrate.
- **CÓ middleware** `src/proxy.ts` (Next 16: `middleware.ts`→`proxy.ts`) — refresh token + gating /portal,/admin; KÈM redirect trong layout RSC. ⚠ Trùng cơ chế refresh với apiClientClient (audit #12). Gating layout:
  - ADMIN/STAFF/MODERATOR → vào `/admin/*`. MODERATOR bị chặn nếu store chưa duyệt.
  - CUSTOMER → `/portal`; nếu là admin/staff thì đẩy khỏi portal.

## Bản đồ route

### Công khai / auth
`/` (home) · `/login` · `/onboarding` · `/contact` · `/faq` · `/how-to/*`
(membership, referral, vouchers) · `/policy/privacy` · `/policy/terms`.

### Admin (`app/admin/*`) — gate ADMIN/STAFF/MODERATOR
**Quản lý cốt lõi**: `/admin` (dashboard) · `orders` (+ `[id]`, `create-order`) ·
`products` (+ `[id]`, `create-product`) · `categories` · `stores` (+ `[id]`) ·
`customers` (+ `[id]`) · `materials` · `suppliers` · `units` · `product-tags`.

**Khuyến mãi & loyalty**: `vouchers` · `order-vouchers` · `referral-vouchers` ·
`ranks` · `commissions` · `referrals` · `spin` · `qr-config`.

**Vận hành**: `integrations` (+ `[platform]`, `zalo`) · `my-store` · `staff` (+ `assign`).

**Quảng cáo (Meta)**: `adsmeta/[accountId]` · `adsmeta/accall` (dùng chung `components/admin/AdsDashboard.tsx` — Dashboard KPI + bảng drill-down 3 cấp; chi tiết docs/08).

**Khách hàng Viettel** (`admin/viettel-customers/*`): `/` (danh sách đơn) · `customers` · `operations-report` · `revenue` (Thống kê tiền hàng — đang xây) · `pending` · `[code]`.

**Customer Care / Messaging** (`admin/customer-care/*`):
`/` · `templates` (+ `create`, `[id]`) · `campaigns` (+ `[id]`) ·
`automations` (+ `create`, `[id]`, `[id]/edit`) · `schedules` · `logs` (+ `[id]`) ·
`import` · `settings`. (Logic backend: docs/06.)

### Portal (`app/portal/*`) — gate khách hàng
**Mua sắm**: `/portal` · `products` (+ `[slug]`) · `cart` · `checkout` (+ `vietqr`, `success`).
**Đơn hàng**: `orders` (+ `[id]`).
**Hồ sơ & loyalty**: `profile` · `vouchers` · `referral` · `spin`.
**Cửa hàng (seller)**: `stores/[slug]` · `seller-register`.
**Hỗ trợ & chính sách**: `support` (+ `about`, `contact`, `order-guide`) ·
`policies/*` (privacy, terms, refund, shipping, points) · `how-to/*` · `faq`.

## API routes của FE (vì sao FE có route riêng)
- `app/api/uploadthing/` — handler UploadThing, middleware auth (`authAdmin/authStoreOwner/authCustomer`),
  endpoint: productImage, categoryImage, storeLogo, imageUploader.
- `app/api/admin/integrations/` — proxy sang backend Pancake: `sync-products`, `sync-categories`, `get-shop-id`.
- `app/internal-api/address` — tra tỉnh/phường từ JSON tĩnh (`src/data/*.json`), không gọi backend.

## lib/ (file then chốt)
- **apiClient.ts** — fetch server-side (cookie → Bearer), base `NEXT_PUBLIC_API_URL`, `get/post/patch/delete`, `ApiError`.
- **apiClientClient.ts** — fetch client-side (cookie include + auto-refresh 401/403).
- **auth.ts** — `getSession()`, `SessionUser`, `generateReferralCode()`.
- **jwt.ts** — `verifyToken()` (cho middleware uploadthing).
- **membership.ts** — tính rank/badge/bậc. **referral-client.ts** — tiện ích referral phía client.
- **mailer.ts** / **adminMessaging.ts** / **support.ts** — email + thông báo.
- **imageLoader.ts** (loader cho Image), **spreadsheet.ts** (export docx), **uploadthing.ts**.

## actions/ (Server Actions)
- **qrClaimActions.ts**: `sendOtpAction(phone, orderCode)` → `/vouchers/send-otp`;
  `claimQrRewardAction(orderCode, phone, otp)` → `/vouchers/claim-qr`.

## hooks/
- `useApi<T>(url, {skip,onSuccess,onError})` → `{data, loading, error, refetch}`.
- `useMutation<TData,TResponse>(url, method)` → `{mutate, loading, error}`.
- `useDebounce(value, delay)`.

## Đơn hàng & Dashboard (cập nhật 2026-06-27 — xem docs/changelog.md)
- `admin/orders`: KHÔNG còn ô tìm kiếm tự do. Lọc INLINE qua `OrderAdvancedFilter` (tên SP + đa trạng thái + từ–đến ngày) + `OrderActiveFilters` (chip đang lọc). Bảng có cột Tổng tiền + kẻ sọc xen kẽ + icon copy SĐT/tên SP.
- `RevenueStats` (dashboard + đầu trang orders): thống kê doanh thu theo kỳ, gọi `GET /admin/revenue-stats`. Props `defaultPeriod`/`periods` để tùy biến (orders dùng `defaultPeriod="today"`, 4 kỳ today/yesterday/week/month).
- Trang orders có 2 số doanh thu: mục đầu trang (giao thành công theo kỳ) vs thanh "Doanh thu (đã lọc)" (tổng tiền đơn khớp bộ lọc, mọi trạng thái — backend trả `filteredRevenue` từ `/orders/admin`).
- Kẻ sọc xen kẽ (dòng lẻ `bg-gray-100`/chẵn `bg-white`) áp cho ~20 bảng admin.

## components/ (chia 3 nhóm)
- **components/admin/**: AdminShell, AdminSidebar, AdminHeader, AdminNotifications;
  bảng/biểu mẫu cho orders/products/categories/stores/vouchers/customers/staff;
  nhóm **customer-care/** (CustomerCare*Client cho templates/campaigns/automations/logs/settings/import/compose).
- **components/customer/**: PortalNavbar(+Search), Footer, ProductsClient, ProductDetailClient,
  ProductReviews/ReviewForm/OrderReviewForm/ReviewImageUploader, CategoryFilter, FloatingCartButton,
  TrackingButton/Modal, SpinWheelClient, QrClaimModal, SupportContactPage.
- **components/ui/**: AppImage, Skeleton/CardSkeleton/TableSkeleton, GenericPageLoading,
  NavigationProgress, PageTransition, Select.

## types/
- **commerce.ts**: StoreSummary, ProductSummary, ProductVariant, VoucherDefinition,
  VoucherStackTier, UserVoucher, UserRankConfig, UserProfile, CartItem, CreateOrderResponse, ShippingFeeResponse.
- **integrations.ts**: Integration, IntegrationMetadata, IntegrationSyncResponse.

## data/
JSON địa chỉ VN (đọc-only, cache RAM): `tinh_tp.json`, `xa_phuong.json`, `quan_huyen.json`.

## Bảng nối FE ↔ Backend (tham khảo nhanh)
| Tính năng | Route FE | Endpoint backend |
|---|---|---|
| Auth/session | apiClient | /users/me, /auth/refresh |
| Đơn hàng | /admin/orders/* | /orders, /orders/:id |
| Sản phẩm | /admin/products/* | /products, /products/:id |
| Voucher | /admin/vouchers/* | /vouchers |
| QR claim | actions/qrClaimActions | /vouchers/send-otp, /vouchers/claim-qr |
| Tích hợp | /api/admin/integrations/* | /integrations/pancake/* |
| CSKH | /admin/customer-care/* | /admin/messaging/* |
| Địa chỉ | /internal-api/address | (JSON tĩnh) |
| Upload ảnh | /api/uploadthing/* | (UploadThing CDN) |

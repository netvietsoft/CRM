# 📜 CHANGELOG / NHẬT KÝ LÀM VIỆC — CRM netvietsoft

> Ghi lại các thay đổi đã làm theo phiên, để không mất ngữ cảnh khi khởi động lại.
> Đọc kèm: `first_readme.txt`, `docs/audit-report.md`.

---

## 2026-06-29 (đêm) — Dọn lỗi 🟡: cookie NODE_ENV + Google referralCode + FE apiClientClient

### Cookie auth theo môi trường (auth.controller.ts)
- Gom 8 chỗ set + 2 chỗ clear cookie (hardcode `secure:true, sameSite:'none'`) vào 1 helper `cookieOptions(maxAge?)`.
  - **production**: `secure:true, sameSite:'none'` (FE/BE khác domain = cross-site).
  - **dev**: `secure:false, sameSite:'lax'` (FE 3900 ↔ BE 3901 cùng site `localhost`, port không tính) → chạy http trên MỌI trình duyệt, không chỉ Chrome (vốn coi localhost là secure context). Thêm `path:'/'` tường minh để clearCookie xoá đúng.

### Google OAuth — truyền referralCode (nhánh referral từng là code chết)
- `googleLogin(profile, referralCode?)` vốn ĐÃ xử lý referralCode nhưng controller không truyền + `state` chỉ mang `returnTo`.
- Nay: FE `login/page.tsx` thêm `&referralCode=` vào URL `/auth/google` (lấy từ `formData.referralCode`). `GoogleAuthGuard` gói `{returnTo, referralCode}` vào `state` base64url(JSON). `GoogleStrategy.validate` mở `state` (fallback chuỗi `returnTo` cũ nếu không phải JSON) → gắn vào `req.user`. Controller truyền `req.user.referralCode` vào `googleLogin`.

### FE: fetch trần → apiClientClient (lấy lại auto-refresh 401/403)
- Migrate 11 file audit chỉ đích danh: `ReviewForm`, `OrderReviewForm`, `ProductReviews`, `portal/orders/OrderList`, `PortalNavbarSearch`, `seller-register/SellerRegisterClient` (chỉ `/stores`; `/internal-api/address` GIỮ fetch trần vì là route nội bộ Next), `OrderDetailClient` (cancel + confirm-received), `ProductDetailClient` (wishlist + cart + nút wishlist inline), `customer/ProductsClient` (toggleWishlist). `admin/ProductsClient` đã sạch từ trước.
- ⚠️ Lưu ý: `apiClientClient` luôn set `Content-Type: application/json` → KHÔNG dùng cho upload FormData. Các fetch trần còn lại (checkout/vietqr/profile/voucher... + internal-api) chưa nằm trong danh sách audit → để sau.

### Sửa kèm (build-breaker)
- `frontend/src/lib/jwt.ts`: lỗi strict TS (`jwt.verify` trả `Jwt & JwtPayload & void`; `JWT_SECRET` không narrow vào trong hàm) do bản "fail-fast secret" phiên trước để lại → sẽ vỡ `next build`. Sửa: `jwt.verify(token, JWT_SECRET as string) as unknown as {...}`.

### Verify
- Backend `tsc --noEmit`: sạch. Frontend `tsc --noEmit`: sạch (sau khi sửa jwt.ts).

## 2026-06-29 (tối) — ViettelPost webhook thống nhất + kéo đơn VIETTEL

### Gộp 1 endpoint webhook ViettelPost
- Bỏ route capture-only cũ `POST /api/viettelpost/order-webhook`; giữ duy nhất **`POST /api/viettelpost/webhook`** (@Public, @HttpCode 200).
- Capture payload mẫu (`captureViettelOrderWebhook` → SystemConfig `viettel_order_webhook_samples`, 5 mẫu mới nhất) nay được gọi từ bên trong orchestrator `handleViettelWebhook` — không còn endpoint riêng.
- Endpoint LUÔN trả HTTP 200 (`{success:true}` hoặc `{success:true,skipped:'invalid_secret'}`); lỗi xử lý bị nuốt (VTP retry ≤5× khi non-200).

### Secret per-store (thay env global)
- Xác thực inbound dùng `StoreIntegration.metadata.webhookSecret` (platform VIETTELPOST) — secret riêng cho từng cửa hàng.
- So sánh bằng `crypto.timingSafeEqual` với `payload.DATA.token`. Store khớp cung cấp `storeId` để định tuyến.
- Production: có secret + token sai → bỏ qua, trả `skipped:'invalid_secret'`. Không store nào cấu hình secret → tiếp tục (fallback dev).
- Env `VIETTELPOST_WEBHOOK_TOKEN` + `VIETTELPOST_WEBHOOK_SECRET` (inbound) nay **lỗi thời**, thay bằng per-store secret.

### Tạo đơn source='VIETTEL' khi không khớp đơn CRM
- `processViettelPostWebhook`: nếu không tìm thấy đơn khớp (trackingCode / ORDER_REFERENCE / `PCK-{id}`) → **tạo đơn mới** `source='VIETTEL'`, userId=null, orderCode=ORDER_NUMBER, totalAmount từ COD, status map từ ORDER_STATUS (101→PENDING, 107→CONFIRMED, 201→SHIPPING, 501→DELIVERED, 503/504→CANCELLED), trackingCode vào metadata.
- Idempotency: `orderCode` unique — P2002 bắt im lặng, không throw.

### Admin UI — cấu hình webhook ViettelPost
- `/admin/integrations/viettelpost`: hiển thị **Webhook URL** (copy 1 click) + ô nhập **Webhook Secret** (lưu vào `StoreIntegration.metadata.webhookSecret`) + cảnh báo localhost không tiếp nhận được từ VTP.

## 2026-06-29 (chiều) — Hệ thống Nguồn đơn (Order Source)

### Kiến trúc
- `Order.source` GIỮ là chuỗi `code` (PANCAKE/PORTAL_DIRECT/ADMIN_MANUAL/VIETTEL...) — KHÔNG đổi FK, không vỡ đơn cũ.
- Bảng MỚI `order_sources` (registry): code(unique), name, type(manual|integration), color?, isActive, sortOrder. Tạo qua SQL trực tiếp (DB dump, không prisma migrate) + thêm model schema + prisma generate. Seed: PANCAKE/Pancake, PORTAL_DIRECT/Website, ADMIN_MANUAL/Nhập tay, VIETTEL/Viettel.

### Backend
- Module `order-sources` (CRUD): `GET/POST/PATCH/DELETE /order-sources` (guard ADMIN/STAFF/MOD; write ADMIN/STAFF). `OrderSourcesService.ensureExists(code,name?)` auto-đăng ký code mới (có cache, không throw) — dùng cho connector tích hợp tương lai.
- `OrdersService` inject OrderSourcesService; `createAdminOrder` nhận `source` từ DTO (mặc định ADMIN_MANUAL) + gọi ensureExists.
- `/orders/admin` thêm query `source` (đa giá trị "A,B") → lọc đơn theo nguồn (áp cả statusCounts).

### Frontend
- Trang quản lý `/admin/order-sources` (tái dùng MasterDataManager) + link sidebar "Nguồn đơn".
- Bộ lọc đơn: thêm dropdown multi-select "Nguồn đơn" (fetch /order-sources) trong OrderAdvancedFilter + chip trong OrderActiveFilters + wiring page.tsx.

### Cách thêm nguồn mới (sau này)
- Tích hợp API mới (Viettel/Shopee): connector set `source:'VIETTEL'` + gọi `ensureExists` → tự vào registry.
- Admin nhập tay: form tạo đơn `/admin/orders/create-order` (CreateOrderClient) ĐÃ thêm dropdown chọn nguồn (fetch /order-sources, gửi `source` trong payload /orders/admin). Mặc định ADMIN_MANUAL.
- Quản lý tên/màu/ẩn-hiện: qua trang /admin/order-sources, không cần sửa code.

## 2026-06-29

### Doanh thu — thêm kỳ "Tuần trước" + "Tháng trước"
- `resolveRevenuePeriod` thêm case `lastweek` (T2→CN tuần trước) + `lastmonth` (tháng dương lịch trước). RevenueStats thêm 2 nút. Trang orders hiển thị: Hôm nay/Hôm qua/Tuần này/Tuần trước/Tháng này/Tháng trước.

### Trang đơn hàng — mục doanh thu theo kỳ (đầu trang)
- Tái dùng component `RevenueStats` (đã thêm props `defaultPeriod` + `periods` để tùy biến) → đặt trên đầu `/admin/orders`: 4 nút **Hôm nay · Hôm qua · Tuần này · Tháng này**, **mặc định Hôm nay**. Gọi `/admin/revenue-stats` (doanh thu = đơn giao thành công, giống dashboard).
- Mục đầu trang orders dùng `scope=all` (mọi đơn) + `dateField=updatedAt` (khớp mặc định bộ lọc orders) → "Hôm nay" = tổng tiền đơn có hoạt động hôm nay (vd 9.118.000), KHÔNG bị 0 như bản đầu (vốn dùng giao-thành-công + createdAt).
- `/admin/revenue-stats` thêm 2 query: `scope` (delivered|all) + `dateField` (createdAt|updatedAt). Dashboard mặc định delivered+createdAt; orders widget dùng all+updatedAt.
- ⚠️ Lưu ý: hôm nay theo createdAt = 0 (không có đơn TẠO mới hôm nay, đơn Pancake mới là draft rỗng), nhưng theo updatedAt = 9.1tr (đơn cũ đổi trạng thái hôm nay: đóng hàng/gửi hàng).

### Trang đơn hàng — doanh thu kết quả lọc
- `/orders/admin` trả thêm `filteredRevenue` = tổng `totalAmount` của TOÀN BỘ đơn khớp bộ lọc (không chỉ trang hiện tại). `OrdersTableClient` nhận `filteredRevenue` + `totalCount`, hiển thị thanh "Kết quả: N đơn · Doanh thu (đã lọc): X đ" ngay dưới hàng "Đang lọc". (Doanh thu này = tổng tiền đơn đã lọc theo SP/trạng thái/khoảng ngày, KHÁC doanh thu dashboard vốn chỉ tính đơn giao thành công.)

### Pancake — TỰ ĐỘNG đồng bộ đơn (cron)
- Thêm `@Cron` trong `PancakeService.handlePancakeAutoSync` — tự sync đơn Pancake **mỗi 10 phút** (đơn mới + đơn đổi trạng thái N ngày gần nhất, mặc định 3 ngày). Đã verify chạy thật: log `[Pancake] Auto-sync xong (3 ngày): synced 24/37`.
- Chống chạy chồng (cờ `autoSyncRunning`). Chạy **im lặng** (không tạo AdminNotification) — đã thêm tham số `notify` vào `syncAllOrders` (cron gọi `notify=false`) để tránh spam thông báo mỗi 10 phút.
- Env cấu hình: `PANCAKE_AUTO_SYNC=false` (tắt) · `PANCAKE_SYNC_CRON` (đổi lịch, chuỗi cron) · `PANCAKE_SYNC_DAYS=3` (số ngày sync mỗi lượt).
- Chẩn đoán "dữ liệu không cập nhật" trước đó: sync vốn THỦ CÔNG; đơn mới hôm nay là đơn nháp rỗng (0 SP/0 tiền/không SĐT) nên bị bỏ qua đúng thiết kế. Giờ đã có cron tự động.

## 2026-06-27

### Hạ tầng / chạy local
- Đổi cổng: **Frontend 3900**, **Backend 3901** (vì 3000/3001 dành cho web khác). FE ép cổng bằng `next dev -p 3900` (package.json).
- `frontend/.env`: `NEXT_PUBLIC_API_URL=http://localhost:3901/api` (PHẢI có `/api`), `BACKEND_API_URL` cũng có `/api`.
- Tài khoản admin local: **đăng nhập `Admin` / mật khẩu `admin`** (phone='Admin' trong DB + seed.ts; đã bỏ `@MinLength(6)` ở login.dto + form login `minLength` chỉ áp khi đăng ký).

### Audit + sửa lỗi (chi tiết: docs/audit-report.md)
- Đã tạo `/check-code` + subagent `crm-code-auditor` (.claude/). Audit toàn bộ → `docs/audit-report.md`.
- ĐÃ SỬA 15/15 lỗi 🔴 + ~18 lỗi 🟡 (transaction tạo đơn/huỷ đơn/updateStatus, enum 'RETURNED'→'RETURNING', hoa hồng transaction, verify webhook Pancake/ViettelPost/Casso, spin xác suất, WebSocket JWT, MessageProviderConfig unique, proxy.ts edge-safe, FE credentials, refresh token, email lowercase, v.v.)
- ⚠️ refresh token: CHỈ dọn token hết hạn (KHÔNG xoá token vừa dùng) — vì proxy.ts + apiClientClient cùng refresh sẽ đua nhau → mất phiên (từng gây "không tải được đơn Pancake").

### Pancake — đồng bộ đơn
- Đã xác minh sync HOẠT ĐỘNG (endpoint `/integrations/pancake/sync-all-orders`). Lỗi "0 đơn" thỉnh thoảng là do Pancake API trượt/timeout — code cũ **nuốt lỗi im lặng**, nay đã **thêm log lỗi** (`pancake.service.ts` fetchOrdersByDateRangeForIntegration).
- Lưu ý: Pancake API **bỏ qua tham số ngày** → lọc theo ngày làm ở client dựa trên `inserted_at`.

### Màn Đơn hàng (admin/orders)
- **Bỏ ô tìm kiếm tự do**; thay bằng **thanh lọc INLINE** (component `OrderAdvancedFilter` — không còn modal): Tên sản phẩm + Trạng thái (multi-select dropdown) + Từ ngày / Đến ngày + nút Lọc/Xóa.
- Thêm component `OrderActiveFilters` — chip "Đang lọc" (gỡ nhanh từng bộ lọc).
- **Backend `/orders/admin`** thêm query: `productName`, `startDate`, `endDate`, và `status` nhận đa giá trị (`"A,B"`). Lọc tên SP + khoảng ngày áp cả vào `statusCounts`. (orders.service `findAdminOrders` + orders.controller).
- **Bảng đơn**: thêm cột **Tổng tiền** (giữa Sản phẩm và Trạng thái, căn trái); **bỏ nền hồng** (đơn chưa đọc) → **kẻ sọc xen kẽ** trắng / `gray-100` (giữ chấm xanh báo chưa đọc); thêm **icon copy** ở SĐT (chữ đậm hơn) và **tên sản phẩm**.

### Kẻ sọc xen kẽ (zebra) — áp cho ~20 bảng admin
OrdersTableClient, CustomersTableClient, StaffTableClient, ProductsClient, MasterDataManager, VoucherTableClient, OrderVouchersTableClient, ReferralVoucherTable, spin/commissions/referrals page, CategoryTree, stores (+[id]), integrations/zalo, dashboard, customer-care (Templates/Logs/Schedules/CampaignDetail/Automations/AutomationDetail). Quy ước: dòng lẻ `bg-gray-100`, dòng chẵn `bg-white`, hover `bg-blue-50/40`.

### Sửa lỗi RSC (units/materials/suppliers)
- Lỗi *"Functions cannot be passed directly to Client Components"*: do server page truyền hàm `render` xuống `MasterDataManager` (client). Đã đổi `ColumnConfig.render` → `format?: 'activeStatus'` (serializable) + render badge "Hoạt động/Tắt" trong component. 3 page đổi `render:(item)=>...` → `format:'activeStatus'`.

### Dashboard — doanh thu
- **Định nghĩa doanh thu**: đổi từ chỉ `status='COMPLETED'` (19tr — sai thực tế) → **DELIVERED + PAYMENT_COLLECTED + COMPLETED** (~969tr). (`admin.service.getDashboardStats`).
  - Lý do: đơn Pancake hầu hết dừng ở DELIVERED, ít khi lên COMPLETED.
  - ⚠️ Ô "Đơn hoàn thành" vẫn đếm COMPLETED (5) — CHƯA đổi (chờ quyết định).
- **MỚI — thống kê doanh thu theo kỳ**: endpoint `GET /admin/revenue-stats?period=&startDate=&endDate=` (period: today/yesterday/week/month/quarter/all/custom; tính theo giờ VN +07; doanh thu = đơn giao thành công, lọc theo `createdAt`). Component `RevenueStats` trên dashboard: nút chọn kỳ + khoảng tùy chọn.
  - ⚠️ CHƯA verify compile FE phần RevenueStats (bị ngắt giữa chừng) — KHỞI ĐỘNG LẠI rồi mở /admin kiểm tra; nếu lỗi, xem `RevenueStats.tsx` + import trong `app/admin/page.tsx`.

### CÒN LẠI / chờ quyết định
- Ô "Đơn hoàn thành" trên dashboard: có đổi sang đếm "đơn giao thành công" cho khớp doanh thu không?
- Các lỗi 🟡 cố ý giữ (confirmReceived SHIPPED→COMPLETED, cooldown race, SMS isSuccessResponse code 0/1) — xem audit-report.
- Rotation refresh token đầy đủ cần gộp 1 nơi refresh (proxy.ts vs apiClientClient).

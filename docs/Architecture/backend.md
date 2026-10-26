# 🛠️ KIẾN TRÚC & MODULE BACKEND (docs/Architecture/backend.md)

> Toàn bộ route dưới đây đã bao gồm prefix `/api`. Vd `@Controller('orders')` → `http://localhost:3901/api/orders`.  
> Mã nguồn tại: `backend-nestjs/src/<module>/`.

---

## 1. 🔐 AUTH (`src/auth`)
Xác thực JWT qua HttpOnly Cookie, Google OAuth, Đăng ký, Đăng nhập, Làm mới token.

| Method | Path | Mô tả chức năng | Phân quyền |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký khách hàng, tự cấp voucher welcome, gán đơn khách vãng lai cùng SĐT | Public |
| POST | `/auth/login` | Đăng nhập bằng Số điện thoại hoặc Email | Public |
| POST | `/auth/refresh` | Làm mới Access Token (đọc `crm_refresh_token`) | `JwtRefreshGuard` |
| POST | `/auth/logout` | Xóa refresh token trong DB và xóa cookie trình duyệt | `JwtAuthGuard` |
| GET | `/auth/google` | Khởi tạo luồng Google OAuth | `GoogleAuthGuard` |
| GET | `/auth/google/callback` | Callback Google OAuth, tạo/đăng nhập user và chuyển hướng về frontend | `GoogleAuthGuard` |

### Bảng Danh mục Quyền (`Permission` Enum)
`auth/enums/permissions.enum.ts`:
- `ORDERS_VIEW`, `ORDERS_MANAGE`
- `PRODUCTS_VIEW`, `PRODUCTS_MANAGE`
- `CATEGORIES_VIEW`, `CATEGORIES_MANAGE`
- `VOUCHERS_VIEW`, `VOUCHERS_MANAGE`
- `CUSTOMERS_VIEW`, `CUSTOMERS_MANAGE`
- `STORE_SETTINGS`
- `INTEGRATIONS_VIEW`, `INTEGRATIONS_MANAGE`
- `STAFF_MANAGE`
- `MESSAGING_VIEW`, `MESSAGING_COMPOSE`, `MESSAGING_SEND`, `MESSAGING_SCHEDULE`, `MESSAGING_RULE_MANAGE`, `MESSAGING_LOG_VIEW`, `MESSAGING_MANAGE`

---

## 2. 👤 USERS & HỒ SƠ (`src/users`)
Quản lý thông tin tài khoản người dùng, tiến độ Rank và Onboarding.

| Method | Path | Mô tả chức năng |
|---|---|---|
| GET | `/users/me` | Lấy thông tin user hiện tại (kiểm tra session) |
| GET | `/users/profile` | Xem hồ sơ chi tiết kèm rank và tài khoản mạng xã hội |
| PUT | `/users/profile` | Cập nhật tên, ngày sinh, địa chỉ (kiểm tra trùng SĐT/email) |
| PUT | `/users/password` | Đổi mật khẩu tài khoản |
| POST | `/users/onboarding` | Hoàn tất thông tin khảo sát ban đầu cho khách mới |
| POST | `/users/:userId/sync-pancake-orders` | Đồng bộ thủ công đơn hàng từ Pancake theo SĐT |
| GET | `/users/dashboard` | Dashboard khách hàng (voucher khả dụng, đơn hàng, điểm) |

---

## 3. 👑 ADMIN & PHÂN QUYỀN NHÂN VIÊN (`src/admin`)
Bảng điều khiển quản trị, quản lý khách hàng, phân công nhân viên, cấu hình hệ thống.

| Method | Path | Mô tả chức năng | Phân quyền |
|---|---|---|---|
| GET | `/admin/dashboard` | Thống kê tổng quan (khách hàng, đơn hàng, doanh thu thực tế, hoa hồng) | ADMIN / MOD / STAFF |
| GET | `/admin/revenue-stats` | Báo cáo doanh thu theo kỳ (today/yesterday/week/month/quarter/all/custom) | ADMIN / MOD / STAFF |
| GET | `/admin/customers` | Danh sách khách hàng kèm phân trang, tìm kiếm, lọc theo store | ADMIN / MOD / STAFF |
| GET | `/admin/customers/:id` | Xem chi tiết hồ sơ khách, đơn hàng, ví hoa hồng, voucher | ADMIN / MOD / STAFF |
| DELETE | `/admin/customers/:id/soft` | Khóa tài khoản khách hàng (`isActive = false`) | ADMIN / MODERATOR |
| DELETE | `/admin/customers/:id/hard` | Xóa vĩnh viễn khách hàng và các bản ghi liên kết | ADMIN / MODERATOR |
| POST | `/admin/staff` | Tạo tài khoản nhân viên mới cho cửa hàng | ADMIN / MODERATOR |
| POST | `/admin/staff/:id/permissions` | Cập nhật ma trận phân quyền cho nhân viên | ADMIN / MODERATOR |
| POST | `/admin/staff/:id/profile` | Cập nhật hồ sơ, avatar, mật khẩu nhân viên | ADMIN / MODERATOR |
| DELETE | `/admin/staff/:id` | Gỡ nhân viên khỏi cửa hàng | ADMIN / MODERATOR |

---

## 4. 📦 SẢN PHẨM & BIẾN THỂ (`src/products`)
Quản lý danh mục sản phẩm, biến thể (Size x Color), combo set, giá vốn và giá bán.

| Method | Path | Mô tả chức năng | Phân quyền |
|---|---|---|---|
| GET | `/products` | Danh sách sản phẩm active cho khách hàng | Public |
| GET | `/products/admin` | Danh sách sản phẩm admin (kèm tồn kho, giá vốn `productionPrice`) | `PRODUCTS_VIEW` |
| GET | `/products/:id` | Chi tiết sản phẩm kèm rating, biến thể | Public |
| GET | `/products/slug/:slug` | Lấy chi tiết sản phẩm theo đường dẫn thân thiện (slug) | Public |
| POST | `/products` | Tạo sản phẩm mới | `PRODUCTS_MANAGE` |
| PATCH | `/products/:id` | Cập nhật sản phẩm, giá bán, giá vốn, biến thể | `PRODUCTS_MANAGE` |
| DELETE | `/products/:id` | Xóa sản phẩm | ADMIN / MODERATOR |

---

## 5. 🛒 ĐƠN HÀNG & THANH TOÁN (`src/orders`)
Module trung tâm xử lý quy trình mua hàng, áp mã giảm giá, tính hoa hồng, thanh toán VietQR và vận chuyển.

| Method | Path | Mô tả chức năng | Phân quyền |
|---|---|---|---|
| POST | `/orders` | Khách hàng đặt đơn hàng trực tuyến (trừ kho, áp voucher, dùng điểm) | JWT |
| POST | `/orders/admin` | Nhân viên/Admin lên đơn thủ công từ bảng điều khiển hoặc CCM | `ORDERS_MANAGE` |
| GET | `/orders` | Danh sách lịch sử đơn hàng của khách hiện tại | JWT |
| GET | `/orders/admin` | Danh sách đơn hàng quản trị, lọc theo trạng thái, ngày, phương thức | `ORDERS_VIEW` |
| GET | `/orders/:id` | Chi tiết đơn hàng kèm vận đơn, hoa hồng liên kết | JWT |
| PATCH | `/orders/:id/status` | Đổi trạng thái đơn hàng (kích hoạt hoa hồng và CSKH tự động) | `ORDERS_MANAGE` |
| PATCH | `/orders/:id/cancel` | Khách hàng tự hủy đơn khi đơn còn ở trạng thái PENDING/CONFIRMED | JWT |
| GET | `/orders/:id/payment-status` | Kiểm tra trạng thái thanh toán VietQR (PAID/PENDING) | JWT |
| PATCH | `/orders/:id/assign-staff` | Phân công nhân viên phụ trách đơn hàng | `ORDERS_MANAGE` |

---

## 6. 🎟️ VOUCHERS & GAMIFICATION (`src/vouchers` & `src/spin`)
- **Voucher**: Hỗ trợ 4 loại (`PERCENT`, `FIXED_AMOUNT`, `FREESHIP`, `STACK`). Phân nhóm campaign: `WELCOME`, `VIP`, `BUNDLE`, `FREESHIP`, `GAMIFICATION`, `REFERRAL`, `BIRTHDAY`.
- **Order Voucher Loyalty**: Tự động thưởng voucher cho đơn hàng đạt ngưỡng COD (>= 100k) khi giao thành công.
- **Lucky Spin (`src/spin`)**: Vòng quay may mắn trúng điểm thưởng, voucher giảm giá.

---

## 7. 💰 HOA HỒNG GIỚI THIỆU (`src/commissions`)
- Quản lý hoa hồng giới thiệu đa tầng sử dụng **Closure Table** (`ReferralClosure`).
- Tự động ghi nhận `CommissionLedger` khi đơn hàng chuyển sang `COMPLETED`.
- Tự động hoàn tác/hủy hoa hồng khi đơn hàng bị `CANCELLED` hoặc `REFUNDED`.

---

## 8. 💬 CSKH ĐA KÊNH & LIVE CHAT (`src/messaging` & `src/messenger`)
- **Messaging**: Soạn thảo và gửi tin nhắn tự động theo chiến dịch (SMS, Zalo ZNS) dựa trên sự kiện đơn hàng.
- **Messenger & AI Agent**: Quản lý hội thoại Facebook Fanpage tập trung, phân công trực chat vòng tròn, AI Claude tự động tư vấn và gợi ý chốt đơn.


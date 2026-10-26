# 🗄️ CƠ SỞ DỮ LIỆU & PRISMA DATA MODEL (docs/Architecture/database.md)

> Cơ sở dữ liệu: MySQL `customer_crm`. Schema định nghĩa tại: `backend-nestjs/prisma/schema.prisma`.

---

## 1. Phân nhóm Thực thể Cốt lõi (60+ Models)

### 1.1. Định danh & Xác thực
- **`User`**: Tài khoản người dùng (Khách hàng, Nhân viên, Chủ shop, Admin). Lưu trữ `role`, `rank`, `referralCode`, `referrerId`, `points`, `spinTurns`, `commissionBalance`, `totalSpent`.
- **`OAuthAccount`**: Liên kết tài khoản mạng xã hội (Google, Facebook, Zalo).
- **`RefreshToken`**: Lưu trữ hash token (bcrypt) có hạn dùng 30 ngày.
- **`OtpRecord`**: Bản ghi OTP xác thực số điện thoại (thời hạn 5 phút).

### 1.2. Cây Giới thiệu & Hoa hồng (Referral Closure Table)
- **`ReferralClosure`**: Bảng quan hệ đóng (Closure Table) quản lý cấu trúc cây đa tầng: `ancestorId`, `descendantId`, `depth`.
- **`CommissionLedger`**: Sổ cái ghi nhận hoa hồng theo từng đơn hàng: `userId` (người nhận), `orderId`, `fromUserId` (người mua), `level`, `percentage`, `amount`, `status`.
- **`CommissionConfig`**: Cấu hình phần trăm hoa hồng theo từng cấp độ (`level`).
- **`RankConfig`**: Cấu hình ngưỡng chi tiêu (`minTotalSpent`) và tỷ lệ chiết khấu theo Rank.

### 1.3. Catalog Sản phẩm & Biến thể
- **`Product`**: Sản phẩm (giá gốc `originalPrice`, giá vốn `productionPrice`, giá sale `salePrice`, `stockQuantity`, `isComboSet`).
- **`ProductVariant`**: Biến thể sản phẩm kết hợp giữa Size và Color (`productId`, `sizeId`, `colorId`, `price`, `stock`).
- **`AdProductMap`**: Ánh xạ chiến dịch quảng cáo Meta Ads (`AdCampaign`) với sản phẩm để tính toán PnL.
- **`Category`**, **`Supplier`**, **`Material`**, **`Unit`**, **`ProductTag`**, **`Size`**, **`Color`**, **`ProductComboItem`**.

### 1.4. Thương mại & Đơn hàng
- **`Order`**: Đơn hàng (`orderCode`, `status`, `paymentMethod`, `paymentStatus`, `subtotal`, `discountAmount`, `shippingFee`, `totalAmount`, `storeId`, `assigningSellerId`, `assigningCareId`, `isExchange`).
- **`OrderItem`**: Chi tiết sản phẩm trong đơn (lưu snapshot `productName`, `productImageUrl`, `price`, `size`, `color`).
- **`OrderVoucher`**: Lưu vết mã voucher đã áp dụng và số tiền giảm giá.
- **`Cart`**, **`CartItem`**, **`Wishlist`**, **`Review`**.

### 1.5. Khuyến mãi & Loyalty
- **`Voucher`**: Cấu hình voucher (`code`, `type`, `value`, `minOrderValue`, `maxDiscount`, `totalUsageLimit`, `validFrom`, `validTo`, `approvalMode`).
- **`UserVoucher`**: Voucher trong ví cá nhân (`userId`, `voucherId`, `status`: PENDING/WAITING_APPROVAL/ACTIVE/REJECTED, `isUsed`).
- **`SpinPrize`**, **`SpinHistory`**: Vòng quay may mắn.

### 1.6. Cửa hàng & Phân quyền Đa tenant
- **`Store`**: Cửa hàng (`ownerId`, `name`, `slug`, `allowCOD`, ngân hàng, `isApproved`, `isActive`, `isBanned`).
- **`StoreIntegration`**: Cấu hình tích hợp bên thứ ba của từng Store (Pancake, ViettelPost, Facebook).

---

## 2. Bảng Danh mục Enums Chuẩn

| Enum | Giá trị hợp lệ |
|---|---|
| **`Role`** | `ADMIN`, `STAFF`, `MODERATOR`, `CUSTOMER` |
| **`Rank`** | `MEMBER`, `SILVER`, `GOLD`, `DIAMOND`, `PLATINUM` |
| **`OrderStatus`** (13) | `PENDING`, `WAITING_FOR_GOODS`, `CONFIRMED`, `PACKAGING`, `WAITING_FOR_SHIPPING`, `SHIPPED`, `DELIVERED`, `PAYMENT_COLLECTED`, `RETURNING`, `EXCHANGING`, `COMPLETED`, `CANCELLED`, `REFUNDED` |
| **`PaymentMethod`** | `STRIPE`, `VIETQR`, `COD` |
| **`PaymentStatus`** | `UNPAID`, `PAID`, `PARTIALLY_PAID`, `REFUNDED` |
| **`VoucherType`** | `PERCENT`, `FIXED_AMOUNT`, `FREESHIP`, `STACK` |
| **`ApprovalMode`** | `AUTO`, `MANUAL` |
| **`CampaignCategory`**| `WELCOME`, `VIP`, `BUNDLE`, `FREESHIP`, `GAMIFICATION`, `REFERRAL`, `BIRTHDAY` |
| **`CommissionStatus`**| `PENDING`, `APPROVED`, `PAID`, `CANCELLED` |
| **`NotificationChannel`**| `ZALO`, `FB_MESSENGER`, `SMS`, `EMAIL` |


# Tài liệu tổng hợp hệ thống VOUCHER — CRM

Tài liệu này giải thích toàn bộ hệ thống voucher (đọc từ code) để phục vụ viết spec chỉnh sửa phần voucher vào mục **Đơn hàng** và **Khách hàng**. Bám theo code; mâu thuẫn/khoảng trống nêu ở mục 8.

---

## 1. Tổng quan các LOẠI voucher

Có **2 trục phân loại** dễ nhầm:
- **Trục A — Loại giảm giá** (`Voucher.type`, enum `VoucherType`): `PERCENT`, `FIXED_AMOUNT`, `FREESHIP`, `STACK`. Đây là *cách tính tiền*.
- **Trục B — Nhóm chiến dịch** (`Voucher.campaignCategory`, enum `CampaignCategory`): `WELCOME`, `VIP`, `BUNDLE`, `FREESHIP`, `GAMIFICATION`, `REFERRAL`, `BIRTHDAY`. Đây là *nguồn gốc/mục đích*, quyết định voucher có bị ẩn khỏi khách không.

**6 loại voucher theo cách sinh ra:**

| Loại vận hành | campaignCategory | Code mẫu | Sinh khi nào | Gắn cho ai | Màn quản lý |
|---|---|---|---|---|---|
| 1. Voucher thường (chiến dịch) | WELCOME/VIP/BUNDLE/FREESHIP/BIRTHDAY | admin đặt | Admin tạo tay | Hệ thống / theo store; khách tự "nhặt" | `/admin/vouchers` |
| 2. Order-voucher (QR riêng của đơn) | GAMIFICATION | `QR-ORDER-{orderCode}` | Admin tạo trong Chi tiết đơn | Khách quét QR trên đơn đó | Tạo trong Chi tiết đơn; xem `/admin/order-vouchers` |
| 3. QR mặc định (gamification tier) | GAMIFICATION | `QR-DEFAULT-{amount}-{minOrder}` | Tự sinh lazy khi khách claim QR mà đơn chưa có voucher riêng | Khách quét QR | Cấu hình `/admin/qr-config` |
| 4. Referral (giới thiệu) | REFERRAL | admin đặt | Người mới đăng ký bằng mã giới thiệu + đạt mốc | **Người giới thiệu (referrer)** | `/admin/referral-vouchers` |
| 5. Spin (vòng quay) | kế thừa template | `SPIN-{ts}-{userId}` | Khách quay trúng ô VOUCHER | Người quay | Module spin |
| 6. Auto sau giao hàng | GAMIFICATION/WELCOME | `AUTO-FIRST-*`, `AUTO-GOLD-COME-BACK-*` | Đơn giao thành công (đơn đầu / VIP Gold quay lại) | Khách mua đơn đó | Tự động, không có màn |

**Khác biệt cốt lõi:**
- Chỉ **loại 1** cấu hình được đầy đủ điều kiện nâng cao (segment/rank/tỉnh/kênh/nguồn đơn/PTTT). Còn lại chỉ có trường cơ bản.
- GAMIFICATION & REFERRAL bị **ẩn khỏi catalog khách** (`findAll` lọc `campaignCategory notIn ['GAMIFICATION','REFERRAL']`, `vouchers.service.ts:107`). Khách chỉ có bằng quét QR+OTP hoặc được cấp tự động.
- **Spin** mỗi lần trúng **clone 1 Voucher template MỚI** (hạn cứng 7 ngày). **Referral** không clone, trỏ thẳng voucher gốc.

---

## 2. Data model

3 bảng tách tầng (`prisma/schema.prisma`):
- **`Voucher`** (390) = template/định nghĩa. Không gắn khách.
- **`UserVoucher`** (431) = bản đã phát vào ví 1 khách.
- **`OrderVoucher`** (355) = bảng nối, ghi việc 1 UserVoucher áp lên 1 Order + giảm bao nhiêu.

**Chuỗi:** `Voucher (1) ─< UserVoucher (n/khách) ─< OrderVoucher (n/lần áp) >─ Order`

| Bảng | Vai trò | Gắn khách | Gắn đơn | Tiền giảm thực | Trạng thái dùng | Unique |
|---|---|---|---|---|---|---|
| Voucher | Template | Không (chỉ `storeId`) | Không | `value`/`maxDiscount` | `usedCount` | `code` |
| UserVoucher | Ví 1 khách | Có (`userId`) | Gián tiếp | — | `isUsed`/`status`/`expiresAt` | `sourceOrderCode` |
| OrderVoucher | Áp 1 đơn | Gián tiếp | Có (`orderId`) | **`discountApplied`** | — | `[orderId, userVoucherId]` |

**Điểm mấu chốt cho Đơn hàng/Khách hàng:**
- **Order KHÔNG có cột `voucherId`.** Đơn ↔ voucher qua join `orders → order_vouchers → user_vouchers → vouchers` (relation `Order.appliedVouchers`, dòng 334). Tổng giảm ở `Order.discountAmount` (316) + `shippingDiscount` (318); chi tiết từng voucher ở `OrderVoucher.discountApplied`.
- **User gắn voucher hoàn toàn qua `UserVoucher`** (`User.userVouchers`, 60). Không có FK voucher trực tiếp trên User.
- DB cho phép nhiều voucher/đơn (stacking), nhưng logic order chặn còn 1 (mục 5).

**Liên kết phụ:** `SpinPrize.voucherId`, `PromotionRule.rewardVoucherId` (cashback), `SystemConfig` (lưu `qr_voucher_default`, `referral_rewards`).

---

## 3. Vòng đời & trạng thái

**`UserVoucher.status`:** PENDING (mới claim QR, `unlockAt` tương lai) · ACTIVE (dùng được) · REJECTED (đơn nguồn hoàn/hủy). LOCKED không lưu DB — là `resolvedStatus` **động** tính runtime cho order-voucher. `isUsed` (boolean) tách khỏi `status`.

```
Tạo Voucher template (isActive=true)
  ├─ Claim QR (đơn <7 ngày) → UserVoucher PENDING (unlockAt = now + lockDurationDays)
  │     └─ cron verify-qr-vouchers-job (00:00) / mở ví:
  │          ├ đơn giao + đã thanh toán → ACTIVE
  │          ├ đơn hoàn/hủy → REJECTED
  │          └ chưa đủ → giữ PENDING
  ├─ Claim (đơn đã giao ≥7 ngày) → ACTIVE ngay
  ├─ Welcome/first-order/gold-comeback/referral/spin → ACTIVE ngay
  ▼
ACTIVE ─(áp đơn)→ isUsed=true, usedAt
  ├─ hết hạn expiresAt/validTo → không dùng/hiển thị
  └─ đơn hủy (CHƯA PAID) → release: isUsed=false, usedAt=null (mục 7)
```

- `LOCK_DURATION_DAYS` từ `SystemConfig.qr_voucher_default.lockDurationDays`, fallback **7 ngày**.
- `expiresAt` = `now + voucher.durationDays` | `voucher.validTo` | fallback **hardcode 90 ngày** (`vouchers.service.ts:531-552`). *`expirationDays` trong config KHÔNG dùng — mục 8.*
- Xóa template (`remove`, `:1012-1050`): inactive→hard delete (xóa cả UserVoucher); active+đã claim→soft delete; active+chưa claim→hard delete.

---

## 4. Cấu hình admin — 4 màn

### 4.1 `/admin/vouchers` — Voucher thường (đầy đủ nhất)
`EditVoucherModal` cấu hình: `name`, `campaignCategory`, `type`, `value`, `minOrderValue`, `maxDiscount`, `stackTiers` (type=STACK), `storeId`, `validFrom/validTo`, `requiredCategoryId`, `minProductCount`, **7 nhóm điều kiện** (`orderSources`, `salesChannels`, `customerSegments` [12], `customerRanks` [MEMBER→PLATINUM], `customerOccasions` [BIRTHDAY_TODAY/MONTH], `shippingProvinces`, `paymentMethods` [COD/VIETQR]), `totalUsageLimit`, `perCustomerLimit`, `durationDays`, `isStackable`, `isActive`. `code` read-only. API: GET `/vouchers/admin?excludeGamification=true`, PATCH/DELETE `/vouchers/{id}`.

### 4.2 `/admin/order-vouchers` — Voucher đơn hàng (QR-ORDER)
Màn này **chỉ xem/lọc/đổi trạng thái/xóa**. Tạo/sửa nằm trong **Chi tiết Đơn hàng** (`CreateOrderVoucherButton`). Trường ít hơn: `name`, `type`, `value`, `stackTiers`, `maxDiscount`, `minOrderValue`, `durationDays`, `perCustomerLimit` (không segment/rank/tỉnh). `code` backend sinh. API: GET `/vouchers/order-vouchers`, POST `/vouchers/create-order-voucher`, GET `/vouchers/order-voucher/{orderCode}`.

### 4.3 `/admin/referral-vouchers` — Voucher giới thiệu
GET `/vouchers/referral-vouchers` (lọc REFERRAL) + cấu hình mốc thưởng `ReferralRewardTier` `{ milestone, rewardType:'SPIN'|'VOUCHER', spinTurns, voucherId }` lưu ở `SystemConfig.referral_rewards` (POST `/vouchers/referral-rewards-config`, chỉ ADMIN).

### 4.4 `/admin/qr-config` — Cấu hình mặc định voucher QR
Lưu `SystemConfig.qr_voucher_default`. Trường: `values[]` (theo lần quét, mặc định 50/40/30/20/10k), `minOrderValues[]`, `displayText`, `lockDurationDays` (7), `expirationDays` (90 — **chưa nối logic**).

---

## 5. Logic ÁP DỤNG vào đơn (`orders.service.ts` hàm `create`)

**Đầu vào (DTO):** `voucherId?` (85), `voucherIds?: string[]` (91).

**Hằng số:** `maxVouchersPerOrder = 1` (41 — tối đa 1 voucher/đơn) · `maxVoucherDiscountRate = 0.25` (42 — trần tổng giảm voucher = 25% subtotal).

**Validate (924-1078):** vượt 1 voucher→lỗi; mỗi voucher check `isActive`, `validFrom/validTo`, tồn kho phát (`_count < totalUsageLimit`), đúng store, 7 nhóm điều kiện, `requiredCategoryId`, `minProductCount`; `QR-ORDER-*` phải resolve ACTIVE; giới hạn khách `userUsedCount < perCustomerLimit` VÀ `subtotal >= minOrderValue`.

**Tính giảm (1080-1144):** STACK (chọn tier khớp) / PERCENT (`subtotal*value/100`) / FIXED_AMOUNT (`value`). Áp trần lần lượt: `maxDiscount` → ≤ `subtotal` → ≤ trần 25% còn lại.

**Thứ tự số học:**
```
giá item → (−giảm theo rank khách, cấp item) → Σ = subtotal
        → (−voucher; trần maxDiscount, ≤subtotal, ≤25%·subtotal)
        → (−điểm hoa hồng; ≤ phần còn lại)
        → +shippingFee = totalAmount (kẹp ≥0)
```

**Ghi DB (transaction 1194-1288):** update/create UserVoucher `isUsed=true`; `voucher.usedCount += 1`; tạo `OrderVoucher` với `discountApplied = (discountAmount − commissionDiscount)/số voucher`; trên order lưu tổng `discountAmount`. Helper `getVoucherDiscountAmount` (87-93) cộng `appliedVouchers.discountApplied` → field `voucherDiscountAmount` FE dùng.

**Hoàn khi hủy (`releaseAppliedVouchersForOrder`, 424-460):** set `isUsed=false, usedAt=null` + giảm `usedCount`. Gọi khi: cron hủy VietQR quá hạn (270); `updateStatus` CANCELLED/REFUNDED/RETURNING **và `paymentStatus !== 'PAID'`** (2052-2055); khách tự hủy (2334). **Đơn đã PAID KHÔNG hoàn voucher.**

---

## 6. Luồng khách

**Checkout (`portal/checkout/CheckoutClient.tsx`):** tải 3 API (`GET /orders` tính segment, `GET /vouchers/user/my-vouchers` ví, `GET /vouchers?storeId=`); **không nhập tay mã**, bấm "Chọn mã" → modal, chỉ chọn 1; FE mirror logic backend (max 1, trần 25%); gửi `POST /orders` với `voucherIds`.

**Ví voucher (`portal/vouchers/page.tsx`):** nhóm pending/available/expiringSoon/hệ thống; card pending đếm ngày mở khóa theo `unlockAt` + `sourceOrderCode`.

**QR claim:** admin xuất QR (`ExportQRButton`) URL `/portal?campaign=qr_claim&orderCode=...`; khách quét → OTP (`POST /vouchers/send-otp`, verify SĐT khớp đơn) → claim (`POST /vouchers/claim-qr`); `MAX_QR_CLAIMS=5/user`, 1 orderCode/1 lần, chỉ khi đơn đã giao.

---

## 7. Voucher hiện gắn vào ĐƠN HÀNG & KHÁCH HÀNG ở đâu (điểm tích hợp hiện tại)

### 7.1 ĐƠN HÀNG
- **Khách — `portal/orders/[id]/OrderDetailClient.tsx`:** CHỈ hiện SỐ TIỀN giảm, KHÔNG hiện mã/tên voucher. Field `voucherDiscountAmount`, `discountAmount` (128-130); card "Chi tiết thanh toán" (404-443): "Giảm giá voucher: -{...}", "Giảm trừ khác".
- **Admin — Chi tiết đơn:** có `CreateOrderVoucherButton` để tạo/sửa/xóa voucher-QR riêng cho đơn. Mã voucher khách **đã dùng** khi mua thì **chưa hiển thị** (phải join `appliedVouchers → userVoucher → voucher.code`, backend hiện chỉ trả tổng `voucherDiscountAmount`).

### 7.2 KHÁCH HÀNG
- **Admin — `admin/customers/[id]/page.tsx`:** `GET /admin/customers/{id}` trả `userVouchers[] {code/type/value/validTo/isUsed/usedAt}`; ô "Voucher {count}" (263); card "Voucher" (351-375) hiện code/mức giảm/HSD/badge Đã-Chưa dùng. **Không hiện**: voucher gắn đơn nào, `status` (PENDING/ACTIVE/REJECTED), `sourceOrderCode`, `unlockAt`.
- **Khách:** ví voucher (mục 6).

---

## 8. Khoảng trống / lưu ý khi viết spec

1. **BUG `'PERCENTAGE'` vs `'PERCENT'`** (`admin/customers/[id]/page.tsx:360`): hồ sơ khách admin so `type==='PERCENTAGE'` trong khi enum là `PERCENT` → voucher % hiển thị SAI thành "Giảm {tiền}". Đụng hiển thị voucher mục Khách hàng thì phải sửa.
2. **`expirationDays` (qr-config) không được dùng** — backend hardcode 90 ngày (`vouchers.service.ts:537`). Muốn đổi hạn voucher QR phải nối field này.
3. **Order không có `voucherId`** — muốn hiện mã voucher trên đơn phải bổ sung API trả `appliedVouchers[].code`, không chỉ tổng tiền.
4. **Trang chi tiết đơn khách chỉ hiện tiền, không hiện mã voucher** — khoảng trống trực tiếp; cần quyết định có hiện mã/tên không.
5. **Mâu thuẫn "1 voucher" vs "stacking"**: DB + schema (`isStackable`, `STACK`, `stackTiers`) hỗ trợ nhiều, nhưng logic khóa `maxVouchersPerOrder=1`. STACK hiện là "1 voucher nhiều bậc", không phải "nhiều voucher cộng dồn".
6. **Đơn đã PAID không hoàn voucher khi hủy** (`orders.service.ts:2052-2055`).
7. **`unlock-voucher-task` không thấy nơi enqueue** — unlock PENDING→ACTIVE dựa cron `verify-qr-vouchers-job` (00:00) + side-effect mở ví; **Redis tắt → verify nền tắt**, PENDING chỉ mở khi khách mở ví.
8. **`Voucher.status` là chuỗi tự do** (mặc định "AUTO") ≠ `UserVoucher.status`; `LOCKED` là trạng thái động runtime.
9. **`FREESHIP` trùng tên** ở cả `VoucherType` lẫn `CampaignCategory`.
10. **`getVoucherDiscountAmount` chia đều** `discountApplied` cho các voucher — chỉ đúng khi 1 voucher/đơn.

---

**File gốc để tra:** schema `prisma/schema.prisma` (Voucher 390, UserVoucher 431, OrderVoucher 355, enum 1091); `vouchers/vouchers.service.ts` + `voucher.processor.ts` + controller; `orders/orders.service.ts` (create 924-1288, release 424-460); `spin/spin.service.ts`; `frontend/src/app/admin/{vouchers,order-vouchers,referral-vouchers,qr-config}/`; `frontend/src/app/portal/{checkout,vouchers,orders/[id]}/`; tích hợp: `portal/orders/[id]/OrderDetailClient.tsx` (404-443), `admin/customers/[id]/page.tsx` (351-375, bug 360).

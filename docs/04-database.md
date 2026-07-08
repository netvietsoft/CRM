# 04 — DATA MODEL (Prisma / MySQL)

Schema: `backend-nestjs/prisma/schema.prisma` (~1197 dòng). DB: MySQL `customer_crm`.
Provider client: prisma-client-js. **Đây là NGUỒN SỰ THẬT** — nếu tài liệu lệch code, tin schema.

> Khi cần list đầy đủ field 1 model → mở schema.prisma. Dưới đây là field/quan hệ THEN CHỐT.

## 1. Định danh & Auth
- **User** — tài khoản (khách/NV/admin). Field: id(uuid), role(Role), email, phone, name,
  password, rank(Rank), referralCode, referrerId, points, spinTurns, commissionBalance, totalSpent.
  Quan hệ: referrer/referees (tự thân), oauthAccounts, refreshTokens, ancestorEntries/descendantEntries
  (ReferralClosure), staffStore (Store), orders, cart.
- **OAuthAccount** — provider (Google/FB/Zalo): provider, providerUserId, profile(Json).
- **RefreshToken** — token(unique, đã hash), expiresAt.
- **OtpRecord** — phone, otpCode, isUsed, expiresAt (bảng tra, không quan hệ).

## 2. Referral & hoa hồng
- **ReferralClosure** — CLOSURE TABLE cây giới thiệu: ancestorId, descendantId, depth.
  (xem mục cuối "Thiết kế referral").
- **CommissionLedger** — userId(người nhận), orderId, fromUserId(khách), level, percentage, amount, status(CommissionStatus).
- **CommissionConfig** — level(unique), percentage, isActive.
- **RankConfig** — rank(unique), minTotalSpent, minOrdersMonth, discountPercent, description.

## 3. Catalog
- **Product** — name, slug(unique), sku, originalPrice, **productionPrice** (giá sản xuất/giá vốn, Float? nullable, `production_price`), salePrice, stockQuantity, soldCount,
  isComboSet, flashSaleEnd, isGiftItem, supplierId, materialId, unitId, storeId.
  Quan hệ: store, supplier, material, unit, variants, categories(M-N), tagMaps, comboItems/usedInCombos,
  orderItems, cartItems.
- **ProductVariant** — productId, sizeId, colorId, price, stock.
- **AdProductMap** — map quảng cáo→sản phẩm: storeId?, platform, level('campaign'), adEntityExternalId (=AdCampaign.externalId), productId. Unique(platform,level,adEntityExternalId). Dùng cho phân tích lãi/lỗ (`src/analytics`).
- **Category** — name, slug(unique), parentId, sortOrder, isActive (cha/con + products).
- **Supplier / Material / Unit** — dữ liệu tham chiếu (name, code, isActive) → Product.
- **ProductTag** — name/slug(unique); **ProductTagMap** — bảng nối product↔tag.
- **Size** — name(unique). **Color** — name(unique), hexCode.
- **ProductComboItem** — comboProductId, childProductId, quantity (SP con trong combo).

## 4. Thương mại
- **Order** — userId, orderCode(unique), status(OrderStatus), paymentMethod, paymentStatus,
  subtotal, discountAmount, shippingFee, totalAmount, paidAt, storeId, assigningSellerId, assigningCareId,
  **isExchange** (cờ "đơn đổi" — chặn kích hoạt voucher + ghép marker `[ĐƠN ĐỔI]` vào note đẩy VTP, 2026-07-08).
  Quan hệ: user, store, assigningSeller/assigningCare(User), items, appliedVouchers, commissions.
- **OrderItem** — orderId, productId, quantity, price, isGift, size, color (size/color lưu chuỗi snapshot).
- **OrderVoucher** — orderId, userVoucherId, discountApplied (voucher đã áp lên đơn).
- **Cart** — userId(unique). **CartItem** — cartId, productId, quantity, size, color.
- **Wishlist** — userId, productId.
- **Review** — userId, productId, orderId, rating, comment, isVerifiedPurchase, size, color.

## 5. Voucher & khuyến mãi
- **Voucher** — code(unique), name, type(VoucherType), value, campaignCategory(CampaignCategory),
  minOrderValue, maxDiscount, totalUsageLimit, perCustomerLimit, usedCount, validFrom, validTo, isStackable, storeId,
  **approvalMode**(ApprovalMode AUTO|MANUAL — voucher đơn: AUTO tự kích hoạt / MANUAL chờ admin duyệt, 2026-07-08).
- **UserVoucher** — userId, voucherId, isUsed, usedAt, expiresAt, status, unlockAt, **approvedAt, approvedById** (voucher của 1 user).
  status (order-voucher): `PENDING | WAITING_APPROVAL | ACTIVE | REJECTED` (2026-07-08; còn giá trị legacy claim-QR như EXPIRED).
- **PromotionRule** — name, type(PromotionType), minOrderValue, rewardVoucherId, giftProductId, giftQuantity.

## 6. Gamification
- **SpinPrize** — name, type, value, condition(PrizeCondition), probability, quantity, wonCount,
  voucherId, giftProductId, isActive.
- **SpinHistory** — userId, prizeId, won(Bool), createdAt.

## 7. Cửa hàng
- **Store** — name, slug(unique), ownerId(unique), description, logoUrl, isActive, isBanned, allowCOD,
  bankName, bankAccountNo, bankOwnerName, địa chỉ. Quan hệ: owner, staff[], products, vouchers, orders, integrations, categories.
- **StoreIntegration** — storeId, platform, shopId, apiKey, apiSecret, accessToken, isActive.

## 8. Thông báo
- **Notification** — userId, channel(NotificationChannel), type, title, body, status(NotificationStatus), sentAt, error.
- **NotificationTemplate** — channel, type, name, subject, body, zaloTemplateId, zaloStatus, params(Json).
- **AdminNotification** — type, title, message, isRead, link (thông báo nội bộ admin / WebSocket).

## 9. Messaging (Customer Care) — chi tiết docs/06
MessageChannel, MessageTemplate, MessageCampaign, MessageAudience, MessageSchedule,
MessageAutomationRule, CustomerContactIdentity, MessageProviderConfig, MessageOptOut,
MessageAuditLog, MessageLog, MessageAutomationExecution.
- **MessageLog** có `idempotencyKey`(unique) chống gửi trùng.
- **MessageAutomationExecution** có `triggerKey` (unique cùng automationRuleId) chống chạy lại 1 trigger.

## 10. Hệ thống
- **SystemConfig** — key(unique), value(Json). Kho cấu hình động (vd lockDurationDays, referral_rewards,
  qr_voucher_default, **order_voucher_config** `{ codActivationThreshold }` mặc định 100000, ZALO_ACCESS_TOKEN...).

---

## TẤT CẢ ENUM (dùng đúng giá trị — đây là từ schema thật)

**Role**: ADMIN, STAFF, MODERATOR, CUSTOMER
**Rank**: MEMBER, SILVER, GOLD, DIAMOND, PLATINUM
**Gender**: MALE, FEMALE, OTHER

**OrderStatus** (13): PENDING, WAITING_FOR_GOODS, CONFIRMED, PACKAGING, WAITING_FOR_SHIPPING,
  SHIPPED, DELIVERED, PAYMENT_COLLECTED, RETURNING, EXCHANGING, COMPLETED, CANCELLED, REFUNDED
**PaymentMethod**: STRIPE, VIETQR, COD
**PaymentStatus**: UNPAID, PAID, PARTIALLY_PAID, REFUNDED

**VoucherType**: PERCENT, FIXED_AMOUNT, FREESHIP, STACK
**ApprovalMode**: AUTO, MANUAL (chế độ duyệt voucher đơn, 2026-07-08)
**CampaignCategory**: WELCOME, VIP, BUNDLE, FREESHIP, GAMIFICATION, REFERRAL, BIRTHDAY
**PromotionType**: CASHBACK_VOUCHER_SPLIT, GIFT_WITH_PURCHASE

**CommissionStatus**: PENDING, APPROVED, PAID, CANCELLED
**PrizeCondition**: NO_CONDITION, REQUIRE_PURCHASE

**NotificationChannel**: ZALO, FB_MESSENGER, SMS, EMAIL
**NotificationStatus**: QUEUED, SENT, DELIVERED, FAILED

**MessageChannelCode**: ZALO, MESSENGER, SMS, WHATSAPP, TIKTOK, SHOPEE
**MessageTemplateKind**: PRESET, CUSTOM
**MessageAudienceSource**: MANUAL, FILTER, IMPORT
**MessageSendMode**: IMMEDIATE, SCHEDULED, AUTOMATED
**MessagePurpose**: MARKETING, TRANSACTIONAL, OTP
**MessageCampaignStatus**: DRAFT, READY, SCHEDULED, PROCESSING, COMPLETED, CANCELLED, FAILED
**MessageAudienceStatus**: PENDING, QUEUED, SKIPPED, PROCESSED, FAILED
**MessageScheduleStatus**: PENDING, PROCESSING, COMPLETED, CANCELLED, FAILED
**MessageLogStatus**: QUEUED, SENT, DELIVERED, READ, FAILED, SKIPPED
**MessageAutomationTriggerType**: BIRTHDAY, ORDER_SHIPPING_STATUS, ORDER_DELIVERED_PAID,
  CUSTOMER_CREATED, ORDER_CREATED, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED,
  ORDER_PARTIAL_DELIVERED, ORDER_CANCELLED, PAYMENT_SUCCESS, PAYMENT_FAILED, VOUCHER_CREATED,
  VOUCHER_ACTIVATED, VOUCHER_USED, VOUCHER_EXPIRING_3D, VOUCHER_EXPIRED, BIRTHDAY_TODAY,
  CUSTOMER_INACTIVE_30D, CUSTOMER_INACTIVE_60D
**MessageAutomationExecutionStatus**: PENDING, QUEUED, SENT, SKIPPED, FAILED
**CustomerContactIdentityType**: PHONE, EMAIL, ZALO_UID, MESSENGER_PSID, WHATSAPP_PHONE, TIKTOK_UID, SHOPEE_UID

---

## Thiết kế referral (closure table)
`ReferralClosure(ancestorId, descendantId, depth)` mô hình cây giới thiệu nhiều cấp:
- depth=0: tự tham chiếu (mỗi user có 1 dòng self).
- depth=1: giới thiệu trực tiếp. depth≥2: gián tiếp.
- Index `(ancestorId, depth)` + `descendantId` → truy vấn nhanh:
  - Tìm cấp dưới của user ở depth N: `WHERE ancestorId=? AND depth=N`.
  - Tìm tuyến trên (upline): `WHERE descendantId=? ORDER BY depth`.
- `CommissionLedger.level` khớp `depth` → chia hoa hồng theo cấp.
**Lưu ý**: khi tạo user có referrer, PHẢI cập nhật closure (chèn dòng cho mọi ancestor).

## seed.ts (prisma/seed.ts)
Seed: 6 MessageChannel (SMS active, còn lại inactive); 5 RankConfig (ngưỡng như trên);
1 MessageProviderConfig SMS (từ env); 3 MessageTemplate SMS (xác nhận đơn / cảm ơn / sinh nhật);
1 admin (login `Admin` / mật khẩu `admin`, role ADMIN — đổi 2026-06-27, trước là 0909090909/admin123*).

> ⚠ DB local hiện tại import từ dump `customer_crm` (1672 user, 99 SP, 1823 đơn) — KHÔNG chạy
> `prisma migrate` (đã có _prisma_migrations). Chỉ `prisma generate`. Cẩn thận khi `prisma:migrate dev`.

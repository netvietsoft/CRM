# 02 — MODULE BACKEND (NestJS)

> Mọi path route dưới đây ĐÃ tính prefix `/api`. Vd `@Controller('orders')` → `/api/orders`.
> File ở `backend-nestjs/src/<module>/`. Phân quyền: xem cột "Quyền".

---

## AUTH (`src/auth`)
Xác thực JWT (cookie) + Google OAuth, đăng ký, refresh.
Cookie set qua helper `cookieOptions(maxAge?)` theo NODE_ENV (prod secure/none; dev insecure/lax).

| Method | Path | Việc | Quyền |
|---|---|---|---|
| POST | /auth/register | Đăng ký KH; tự cấp voucher welcome, gán đơn khách vãng lai cùng SĐT, báo admin | Public |
| POST | /auth/login | Đăng nhập bằng phone hoặc email | Public |
| POST | /auth/refresh | Làm mới token (đọc cookie refresh) | JwtRefreshGuard |
| POST | /auth/logout | Xoá toàn bộ refresh token + cookie | JwtAuthGuard |
| GET | /auth/google | Bắt đầu Google OAuth | GoogleAuthGuard |
| GET | /auth/google/callback | Callback Google, tạo/đăng nhập user, redirect FE; nhận `returnTo`+`referralCode` từ `state` (base64url JSON) | GoogleAuthGuard |

**Permission enum đầy đủ** (`auth/enums/permissions.enum.ts`):
```
ORDERS_VIEW, ORDERS_MANAGE,
PRODUCTS_VIEW, PRODUCTS_MANAGE,
CATEGORIES_VIEW, CATEGORIES_MANAGE,
VOUCHERS_VIEW, VOUCHERS_MANAGE,
CUSTOMERS_VIEW, CUSTOMERS_MANAGE,
STORE_SETTINGS,
INTEGRATIONS_VIEW, INTEGRATIONS_MANAGE,
STAFF_MANAGE,
MESSAGING_VIEW, MESSAGING_COMPOSE, MESSAGING_SEND, MESSAGING_SCHEDULE,
MESSAGING_RULE_MANAGE, MESSAGING_LOG_VIEW, MESSAGING_MANAGE
```
Alias messaging: cấp `MESSAGING_VIEW` mở các quyền xem; `MESSAGING_MANAGE` mở toàn bộ.

**Gotcha**: refresh token lưu DB dạng hash; access token thì không. Khi register tạo
referral code 8 ký tự duy nhất + gán đơn khách vãng lai theo SĐT.

---

## USERS (`src/users`)
Hồ sơ người dùng + dashboard portal.

| Method | Path | Việc |
|---|---|---|
| GET | /users/me | Thông tin user hiện tại (dùng cho session FE) |
| GET | /users/profile | Hồ sơ đầy đủ + OAuth + rank |
| PUT | /users/profile | Cập nhật hồ sơ (validate trùng email/phone) |
| PUT | /users/password | Đổi mật khẩu (cần mật khẩu cũ, tối thiểu 6 ký tự) |
| POST | /users/onboarding | Hoàn tất onboarding; kích hoạt sync Pancake theo SĐT |
| POST | /users/:userId/sync-pancake-orders | Sync thủ công đơn Pancake theo SĐT |
| GET | /users/dashboard | Tổng hợp: voucher chưa dùng, đơn, referee, tiến độ rank |
| GET | /users/portal-layout-meta | Meta layout: onboarding xong chưa, số item giỏ, có store không |

**Gotcha**: `updateUserRank()` tính lại rank từ `totalSpent` qua RankConfig và
`points = floor(totalSpent/10000)`.

---

## ADMIN + STAFF (`src/admin`)
Dashboard quản trị, quản lý khách hàng, nhân viên, system config.

| Method | Path | Việc | Quyền |
|---|---|---|---|
| GET | /admin/dashboard | Thống kê (KH, đơn, **doanh thu = DELIVERED+PAYMENT_COLLECTED+COMPLETED**, voucher, hoa hồng) | ADMIN/STAFF/MOD + perm |
| GET | /admin/revenue-stats | Doanh thu theo kỳ: `period`=today/yesterday/week/month/quarter/all/custom (+`startDate`/`endDate`); tính giờ VN +07, lọc theo createdAt, đơn giao thành công | nt |
| GET | /admin/dashboard-meta | Meta layout (đơn chưa đọc, store chờ duyệt) | nt |
| GET | /admin/customers | DS khách phân trang (search/filter/sort) | nt |
| POST | /admin/customers | Tạo khách từ admin | nt |
| GET | /admin/customers/:id | Chi tiết khách (đơn, referee, hoa hồng, voucher) | nt |
| DELETE | /admin/customers/:id/soft | Ban khách (isActive=false) | ADMIN/MOD |
| DELETE | /admin/customers/:id/hard | Xoá vĩnh viễn (cascade) | ADMIN/MOD |
| GET/PUT | /admin/system-config/:key | Đọc/ghi cấu hình hệ thống (key-value) | ADMIN |
| POST | /admin/staff | Tạo nhân viên STAFF (MOD bị ép vào store của mình) | ADMIN/MOD |
| POST | /admin/staff/assign | Nâng user thành STAFF + gán store | ADMIN/MOD |
| GET | /admin/staff | DS nhân viên 1 store | ADMIN/MOD |
| GET | /admin/staff/members | DS admin/mod/staff (cho dropdown "NV xử lý" đơn) | ADMIN/MOD/STAFF |
| DELETE | /admin/staff/:id | Gỡ nhân viên khỏi store | ADMIN/MOD |

**Gotcha**: tạo STAFF tự gán quyền mặc định CUSTOMERS/ORDERS/PRODUCTS/CATEGORIES (VIEW+MANAGE).
MODERATOR/STAFF chỉ thấy/sửa khách có đơn trong store của mình.

---

## ANALYTICS (`src/analytics`)
Phân tích lãi/lỗ theo sản phẩm (on-the-fly). Quyền ADMIN/MODERATOR (scope effectiveStoreId).

| Method | Path | Việc |
|---|---|---|
| GET | /analytics/product-pnl?from&to&platform&source | Lãi/lỗ theo SP (+ daily) |
| GET | /analytics/ad-map?platform&accountId | DS campaign + SP đã gán |
| PUT | /analytics/ad-map | Gán/gỡ campaign→SP (productId=null để gỡ) |

**Logic**: doanh thu = đơn COD (PAYMENT_COLLECTED/COMPLETED), ngày = paidAt??updatedAt; cost = productionPrice×qty; quảng cáo = AdInsight.spend của campaign đã map (`AdProductMap`); vận hành = 0 (v1). Hàm thuần `buildPnlReport` (pnl.util.ts) tổng hợp (có unit test). Đơn item không có productId → khớp theo tên chuẩn hoá; không khớp/đa khớp → nhóm "Chưa khớp". Spec/plan: `docs/superpowers/specs|plans/2026-06-30-product-pnl-analytics*`.

## PRODUCTS (`src/products`)
Catalog: biến thể (size×color), combo, tag, lọc.

| Method | Path | Việc | Quyền |
|---|---|---|---|
| GET | /products | DS sản phẩm + lọc (search) | Public |
| GET | /products/admin | DS admin kèm tồn kho/stats | ADMIN/STAFF/MOD + PRODUCTS_VIEW |
| GET | /products/search?q= | Tìm kiếm | Public |
| GET | /products/:id | Chi tiết (kèm avg rating, review) | Public |
| GET | /products/slug/:slug | Lấy theo slug | Public |
| GET | /products/:id/related | 10 SP liên quan theo category | Public |
| POST | /products | Tạo | + PRODUCTS_MANAGE |
| PATCH | /products/:id | Sửa | + PRODUCTS_MANAGE |
| DELETE | /products/:id | Xoá cứng | ADMIN/MOD |

**Logic chính**: biến thể có price/stock riêng; combo (`isComboSet`) chứa SP con + số lượng
(không tự tham chiếu); tag many-to-many qua ProductTagMap; lọc theo category/supplier/material/
unit/tag/giá/store. Tồn kho: `stockQuantity` (gốc) + `variant.stock`, trừ khi tạo đơn, hoàn khi
huỷ đơn. Non-admin phải dùng effectiveStoreId; store có thể null (catalog chung).

**Giá**: `originalPrice` (giá gốc, bắt buộc), `productionPrice` (giá sản xuất/giá vốn — optional,
nullable), `salePrice` (giá sale — optional). `CreateProductDto`/`UpdateProductDto` (PartialType)
nhận cả 3; service `create`/`update` spread `...productData` thẳng vào Prisma nên field mới tự lưu
(không cần sửa service). `findOne` dùng `include` → trả full scalar gồm `productionPrice`.

---

## CATEGORIES (`src/categories`)
Phân cấp cha/con, scope theo store.

| Method | Path | Việc | Quyền |
|---|---|---|---|
| GET | /categories | DS active (?admin=true, ?storeId=) | Public |
| POST | /categories | Tạo (slug tự sinh nếu thiếu) | + CATEGORIES_MANAGE |
| GET | /categories/:id | Chi tiết + cha/con + đếm SP | Public |
| PATCH | /categories/:id | Sửa | + CATEGORIES_MANAGE |
| DELETE | /categories/:id | Xoá (cascade con) | + CATEGORIES_MANAGE |

Sắp xếp theo `sortOrder` rồi `name`.

---

## Master data: PRODUCT-TAGS, COLORS, SIZES, UNITS, MATERIALS, SUPPLIERS
CRUD đơn giản, làm dữ liệu tham chiếu cho sản phẩm/biến thể. Đọc public, ghi ADMIN/STAFF.

- **product-tags**: nhãn phẳng (trending/sale/new), nối qua ProductTagMap.
- **colors**: name, code, hex → ProductVariant.colorId.
- **sizes**: name, code → ProductVariant.sizeId.
- **units**: đơn vị tính (cái/kg/lít) → Product.unitId. CRUD đủ (GET/:id, PATCH, DELETE).
- **materials**: chất liệu (cotton/poly) → Product.materialId. Lọc được trong products admin.
- **suppliers**: NCC (name/code/phone/email/address) → Product.supplierId.

---

## STORES (`src/stores`)
Đa cửa hàng (1 user ≤ 1 store).

| Method | Path | Việc | Quyền |
|---|---|---|---|
| GET | /stores | DS store active | Public |
| GET | /stores/admin | DS tất cả store | ADMIN |
| GET | /stores/admin/:id | Chi tiết store | ADMIN |
| POST | /stores/admin | Tạo store | ADMIN |
| POST | /stores/admin/:id/approve | Duyệt store | ADMIN |
| PATCH | /stores/admin/:id/status | Bật/tắt isActive/isBanned | ADMIN |
| DELETE | /stores/admin/:id | Xoá | ADMIN |
| GET | /stores/my-store | Store của user hiện tại | JWT |
| GET | /stores/public/:slug | Trang store công khai | Public |
| GET | /stores/public/:slug/reviews | Review của store | Public |
| POST | /stores | Tạo store (user đăng ký bán) | JWT |
| PUT | /stores | Sửa store của mình | JWT |

`isActive` (hiển thị), `isBanned` (cấm), `isApproved` (đã duyệt). Đơn/SP đều thuộc storeId.
Store có thông tin ngân hàng (bankName/bankAccountNo/bankOwnerName) + allowCOD.

---

## CART (`src/cart`)
Giỏ hàng theo user (1 Cart/user, tự tạo khi cần).

| Method | Path | Việc |
|---|---|---|
| GET | /cart | Lấy giỏ + subtotal (đã áp rank discount khi đọc, KHÔNG lưu) |
| POST | /cart | Thêm item (upsert theo productId+size+color) |
| PATCH | /cart/:itemId | Đổi số lượng |
| DELETE | /cart/:itemId | Xoá item |
| DELETE | /cart | Xoá sạch giỏ |

**Gotcha**: KHÔNG check tồn kho ở giỏ (check lúc tạo đơn). Giá = variant.price nếu có,
không thì salePrice||originalPrice.

---

## ORDERS (`src/orders`) — MODULE PHỨC TẠP NHẤT
Tạo đơn, vòng đời trạng thái, voucher, hoa hồng, VietQR, sync khách vãng lai.

| Method | Path | Việc | Quyền |
|---|---|---|---|
| POST | /orders | Tạo đơn KH (trừ kho, áp voucher, dùng điểm hoa hồng) | JWT |
| POST | /orders/admin | Tạo đơn từ admin (ghi đè giá, đơn khách vãng lai) | + ORDERS_MANAGE |
| GET | /orders | DS đơn của chính user | JWT |
| GET | /orders/admin | DS đơn + lọc (status đa giá trị "A,B"/search/paymentMethod/**productName**/**startDate-endDate**/dateField/dateSort/phân trang) | + ORDERS_VIEW |
| GET | /orders/:id | Chi tiết đơn + hoa hồng (KH xem đơn mình, admin xem store mình) | JWT |
| PATCH | /orders/:id/status | Đổi trạng thái (kích hoạt hoa hồng + automation msg) | + ORDERS_MANAGE |
| PATCH | /orders/:id/cancel | KH tự huỷ (chỉ PENDING/CONFIRMED; hoàn kho/voucher/hoa hồng) | JWT |
| PATCH | /orders/:id/confirm-received | KH xác nhận đã nhận (DELIVERED→COMPLETED) | JWT |
| POST | /orders/check-stock | Kiểm tồn kho trước đặt | Public |
| POST | /orders/shipping-fee | Tính phí ship (gọi đối tác nếu cấu hình) | Public |
| GET | /orders/check-purchase/:productId | Đã mua/đã review SP chưa | JWT |
| GET | /orders/public/qr-summary/:orderCode | Đơn theo mã (cho QR loyalty) | Public |
| GET | /orders/public/track?code=&phone= | Tra cứu đơn | Public |
| GET | /orders/:id/payment-status | Poll trạng thái VietQR (PAID/PENDING + hết hạn) | JWT |
| DELETE | /orders/:id | Xoá cứng | ADMIN/MOD |
| PATCH | /orders/:id/note | Sửa ghi chú | + ORDERS_MANAGE |
| PATCH | /orders/:id/assign-staff | Gán NV bán/CSKH | + ORDERS_MANAGE |
| PATCH | /orders/:id/admin-update | Sửa shippingFee/discount/surcharge/points/tags... | + ORDERS_MANAGE |

**Luồng tạo đơn (`orders.service.ts`)** — đọc kỹ trước khi sửa:
1. Validate: giỏ không rỗng, SP active.
2. **Mọi item phải cùng storeId** (hoặc null), trộn store → throw.
3. Tính rank KH từ totalSpent → áp discount theo rank lên giá item.
4. Biến thể: nếu có size/color → tìm variant, dùng variant.price, trừ variant.stock + stockQuantity.
5. **Voucher**: hiện tối đa 1 voucher/đơn. Validate active/trong hạn/còn lượt/khớp điều kiện
   (source/channel/segment/rank/dịp/tỉnh/payment/category/min-count). Voucher QR-ORDER kiểm tra
   trạng thái đơn nguồn (ACTIVE nếu giao ≥7 ngày, PENDING nếu chưa giao, LOCKED nếu huỷ/hoàn).
   Hỗ trợ STACK + PERCENT/FIXED, cap maxDiscount, cap 25% subtotal. Đánh dấu đã dùng + tăng usedCount.
6. **Điểm hoa hồng**: useCommissionPoints → đổi 1:1 thành giảm giá, trừ commissionBalance.
7. Tổng = subtotal - discount + shippingFee (min 0).
8. **VietQR**: tạo hạn 30 phút + ảnh QR (vietqr.io), lưu expiresAt/transactionCode vào metadata.
9. Lưu snapshot productName/productImageUrl vào OrderItem.
10. Đơn tạo ở PENDING, paymentStatus=UNPAID.
11. Khi COMPLETED → tạo hoa hồng theo chuỗi referral (commissionsService).
12. Tính customer segment (NEW/EXISTING/VIP/CHURN_RISK/INACTIVE...) tại thời điểm đặt.
13. Bắn automation messaging: order created / voucher used / đổi trạng thái.

**Cron VietQR** (mỗi phút): đơn VIETQR + UNPAID + quá expiresAt → CANCELLED, hoàn kho, nhả voucher.
**Đơn khách vãng lai (admin)**: không cần userId nếu có name+phone; tự tạo/khớp khách theo SĐT.

DTO: CreateOrderDto, CreateAdminOrderDto, UpdateOrderStatusDto, CheckStockDto, ShippingFeeDto.

---

## WISHLIST (`src/wishlist`)
| Method | Path | Việc |
|---|---|---|
| GET | /wishlist | Trả `{ productIds: [] }` |
| POST | /wishlist | Toggle thêm/bỏ (body { productId }) |

---

## REVIEWS (`src/reviews`)
Đánh giá SP — chỉ sau khi đơn COMPLETED.

| Method | Path | Việc |
|---|---|---|
| GET | /reviews?productId=&rating=&sort=&page=&limit= | DS review SP (public) |
| POST | /reviews | Tạo 1 review (validate đã mua SP trong đơn, chống trùng) |
| POST | /reviews/order | Review tất cả item trong đơn; có comment → +1 lượt quay (spinTurn) |

Bỏ qua item isGift. Tối đa 5 ảnh. Trả avgRating + phân bố sao.

---

## VOUCHERS (`src/vouchers`) + voucher.processor.ts
Mã giảm giá đa loại + flow QR-claim có OTP. Chi tiết loyalty: tài liệu này + docs/05.

Endpoint chính: GET /vouchers, GET /vouchers/user/my-vouchers, GET/POST/PATCH/DELETE /vouchers/:id,
POST /vouchers/send-otp, POST /vouchers/claim-qr, POST /vouchers/create-order-voucher,
GET /vouchers/order-vouchers, POST /vouchers/referral-voucher, GET/POST /vouchers/referral-rewards-config,
POST /vouchers/manual-verify, GET /vouchers/admin.

**Flow QR-claim**: gửi OTP (validate đơn + SĐT, OTP 5 phút, giới hạn 1 lần/60s) → claim-qr →
voucher tạo PENDING khoá 7 ngày (lockDurationDays trong systemConfig), tự mở khoá qua BullMQ
`voucher-queue` (hoặc mở ngay nếu đơn đã giao ≥7 ngày). Tối đa 5 lần claim/bậc.

**voucher.processor.ts** (BullMQ): `verify-qr-vouchers-job` (cron 00:00, hỏi ViettelPost xác minh
trạng thái giao → activate/reject theo batch 50) + `unlock-voucher-task` (mở 1 voucher sau 7 ngày).
Tự cấp: đơn đầu ≥500k → voucher 50k; VIP GOLD quay lại sau 60 ngày → voucher 150k.

**Loại voucher (enum VoucherType)**: PERCENT, FIXED_AMOUNT, FREESHIP, STACK.
(Phân loại campaign qua enum `CampaignCategory`: WELCOME/VIP/BUNDLE/FREESHIP/GAMIFICATION/REFERRAL/BIRTHDAY.)

---

## COMMISSIONS (`src/commissions`) + COMMISSION-CONFIG
Hoa hồng multi-level qua closure table.

commissions endpoint: GET /commissions/network, /commissions/ledger, /commissions/configs;
admin: /commissions/admin/ledger, /admin/stats, /admin/configs, /admin/referral-stats,
/admin/top-referrers, PUT /admin/configs.

**Logic** (`calculateCommissions(order)`): lấy CommissionConfig active theo level → truy
ReferralClosure tìm ancestor (depth>0) của KH → mỗi ancestor depth N khớp config level N →
amount = totalAmount × percentage/100 → tạo CommissionLedger (status APPROVED) + tăng
commissionBalance. Huỷ đơn → cancelCommissions (status CANCELLED, trừ lại balance, giữ bản ghi).

commission-config: GET /commission-config (public), PUT /commission-config (ADMIN) — upsert theo level.

---

## RANK-CONFIG (`src/rank-config`)
Bậc khách theo chi tiêu. GET /rank-config (public), PUT /rank-config (ADMIN).
Bậc mặc định: MEMBER ≥0, SILVER ≥2tr, GOLD ≥5tr, DIAMOND ≥10tr, PLATINUM ≥20tr.
`resolveRank(totalSpent)` quét giảm dần, khớp đầu tiên. Mỗi rank có discountPercent.
Đổi ngưỡng → `recalculateAllUserRanks()` (transaction).

---

## SPIN (`src/spin`)
Vòng quay may mắn.

User: GET /spin/attempts, /spin/prizes, /spin/history, POST /spin.
Admin: GET /spin/admin/prizes, /admin/stats, POST/PUT/DELETE /admin/prizes/:id, POST /spin/add-attempts.

Loại giải (enum không bắt buộc): POINTS / VOUCHER / NONE. VOUCHER → clone voucher template hạn 7 ngày.
Chọn theo xác suất tích luỹ. Toàn bộ trong `$transaction`: trừ spinTurns + ghi SpinHistory + trao thưởng.
Điều kiện giải qua enum `PrizeCondition`: NO_CONDITION / REQUIRE_PURCHASE.

---

## NOTIFICATIONS (`src/notifications`) — Zalo ZNS + SMS fallback
KHÁC với module Messaging (CSKH). Đây là thông báo cá nhân + tích hợp Zalo ZNS.

User: GET /notifications, POST /notifications/:id/read, /read-all, DELETE /notifications/:id.
Admin: GET /notifications/zalo/config, /zalo/templates, POST /zalo/templates, /zalo/templates/:id/sync,
POST /zalo/bulk, POST /zalo/token/refresh.

- `zalo-token.service.ts`: token Zalo trong systemConfig, cron mỗi 20h tự refresh (OAuth v4).
- `zalo-zns.processor.ts`: BullMQ queue `zalo-zns`, gửi ZNS (openapi.zalo.me), thất bại cuối → SMS fallback.
- `zbs-template.service.ts`: tạo template PROMOTION qua ZBS, chờ Zalo duyệt (PENDING_REVIEW).
Enum kênh: `NotificationChannel` = ZALO/FB_MESSENGER/SMS/EMAIL; `NotificationStatus` = QUEUED/SENT/DELIVERED/FAILED.

---

## SUPPORT (`src/support`)
POST /support/contact (public) — form liên hệ → tạo AdminNotification type=SUPPORT.

---

## ADDRESS (`src/address`)
GET /address?type=provinces | wards&provinceCode= (districts trả [] — bỏ từ 2025-07-01).
Dữ liệu JSON tĩnh (tinh_tp/xa_phuong), cache RAM. Sắp theo localeCompare('vi').

---

## ADMIN-NOTIFICATIONS (`src/modules/admin-notifications`) — WebSocket
Gateway namespace `/admin`, emit `new_admin_notification`. Service `createNotification()` được
nhiều module gọi để đẩy realtime (đơn mới, campaign xong, cảnh báo lỗi SMS...).
⚠ Hiện CHƯA verify JWT trên socket (TODO production).

---

## INTEGRATIONS / WEBHOOKS / MAIL / MESSAGING
- **integrations** (Pancake) + **webhooks** (ViettelPost/Casso) + **mail**: xem docs/05.
- **messaging** (CSKH SMS-first): xem docs/06.

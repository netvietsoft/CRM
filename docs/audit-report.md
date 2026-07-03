# 📋 BÁO CÁO AUDIT CODE — CRM netvietsoft

**Ngày:** 2026-06-27 · **Phạm vi:** toàn bộ codebase (BE + FE) · **Công cụ:** 5 auditor song song (crm-code-auditor)
**Tính chất:** review chỉ-đọc, không sửa code. Mỗi mục có `file:line` + đề xuất.

> ⚠️ Đọc kèm `docs/07-quy-tac-code.md`. Tài liệu mô tả ý định; **code là sự thật**.

## Tóm tắt số lượng

| Mảng | 🔴 Nghiêm trọng | 🟡 Quan trọng | 🟢 Gợi ý |
|---|---|---|---|
| BE-core-auth | 2 | 7 | 4 |
| BE-ecommerce | 5 | 6 | 5 |
| BE-loyalty-integrations | 5 | 6 | 6 |
| BE-messaging | 2 | 5 | 5 |
| Frontend | 5 | 6 | 4 |
| **Tổng** | **~19** | **~30** | **~24** |

> Đã gộp vài mục trùng giữa các mảng (vd enum `'RETURNED'`).

---

## ✅ TRẠNG THÁI SỬA (cập nhật 2026-06-27, sau audit)

| # | Vấn đề 🔴 | Trạng thái |
|---|---|---|
| 1 | Tạo đơn: trừ kho atomic + kiểm tồn (chống oversell) + snapshot tên/ảnh | ✅ ĐÃ SỬA (create + createAdminOrder) |
| 2 | `updateStatus` transaction | ✅ ĐÃ SỬA — order.update + soldCount + totalSpent + nhả voucher gói trong 1 `$transaction`; rank/hoa hồng/voucher-rules/thông báo/messaging chạy SAU (idempotent/own-tx) |
| 3 | `customerCancelOrder` hoàn kho biến thể + nhả voucher + hoàn điểm + transaction | ✅ ĐÃ SỬA (lưu `commissionPointsUsed` vào metadata khi tạo đơn) |
| 4 | Enum `'RETURNED'` → `'RETURNING'` | ✅ ĐÃ SỬA |
| 5 | `calculateCommissions`/`cancelCommissions` transaction + không nuốt lỗi + idempotency | ✅ ĐÃ SỬA |
| 6 | Pancake webhook verify chữ ký (HMAC) | ✅ ĐÃ SỬA (cần set `PANCAKE_WEBHOOK_SECRET`; prod fail-closed) |
| 7 | ViettelPost webhook fail-closed ở production | ✅ ĐÃ SỬA |
| 8 | Casso webhook idempotency (cổng atomic-conditional) | ✅ ĐÃ SỬA |
| 9 | Spin chuẩn hoá xác suất + orderBy ổn định | ✅ ĐÃ SỬA |
| 10 | WebSocket `/admin` verify JWT + role | ✅ ĐÃ SỬA (FE bật `withCredentials`) |
| 11 | MessageProviderConfig race tạo trùng | ✅ ĐÃ SỬA — đã thêm UNIQUE(channel_id, store_id) vào DB (ALTER TABLE) + `@@unique` trong schema + prisma generate; code chọn config tất định (orderBy). Lưu ý: MySQL cho phép nhiều NULL nên scope global (store_id=null) dựa vào code chọn tất định |
| 12 | proxy.ts dùng jsonwebtoken trên Edge | ✅ ĐÃ SỬA (decode base64url thủ công) |
| 13 | FE logout thiếu `credentials` | ✅ ĐÃ SỬA |
| 14 | FE xoá khách thiếu `credentials` | ✅ ĐÃ SỬA |
| 15 | FE `get-shop-id` không kiểm role | ✅ ĐÃ SỬA |

> Đã verify: backend compile sạch + restart OK; login `Admin/admin` 200; products/address 200; FE `/login` 200, proxy.ts chạy không lỗi.
> **15/15 lỗi 🔴 đã xử lý** (2026-06-27). Các 🟡/🟢 khác trong báo cáo này chưa sửa.
> **Lưu ý vận hành:** để bật bảo mật webhook production, set env `PANCAKE_WEBHOOK_SECRET`, `VIETTELPOST_WEBHOOK_TOKEN`/`_SECRET`. Webhook gọi vào phải gửi kèm chữ ký/token tương ứng.

### 🟡 QUAN TRỌNG — đã xử lý (2026-06-27)
- ✅ Refresh token: **dọn token hết hạn** (chống phình bảng). *(Đã BỎ việc xoá token vừa dùng — vì `proxy.ts` + `apiClientClient` cùng refresh sẽ đua nhau xoá token đang dùng → mất phiên giữa chừng, làm "không tải được đơn Pancake". Rotation đầy đủ cần gộp 1 nơi refresh trước — xem #12.)*
- ✅ Chuẩn hoá **email lowercase** ở register/login/google.
- ✅ logout `clearCookie` truyền đúng options; cookie register maxAge 45'→15' (khớp JWT).
- ✅ Products: **chặn xoá cứng** khi SP đã có trong đơn (giữ lịch sử orderItem).
- ✅ Categories `update`: chỉ nhận field cho phép (**chống mass-assignment**).
- ✅ `getPaymentStatus` truyền `effectiveStoreId`.
- ✅ Zalo token cron `0 */20` → `0 */12` (đều 12h).
- ✅ `rejectVoucherImmediately` guard `voucherQueue` (Optional, không Redis).
- ✅ Spin clone voucher: field tường minh (bỏ spread + `as any`).
- ✅ Casso `verifySignature` dùng `timingSafeEqual`.
- ✅ Pancake product/inventory webhook: **log lỗi** sync (không nuốt).
- ✅ Import campaign: tách `invalidCount` vs `duplicateCount`.
- ✅ Messaging inline-dispatch (không Redis): bọc try/catch → trả messageLog (không ném 500).
- ✅ FE: thêm `credentials:'include'` cho các fetch backend (5 chỗ) — fix cookie cross-origin.
- ✅ FE sync routes: fallback base có `/api` + forward cookie auth xuống backend.
- ✅ FE `api-config.ts` thống nhất base + bỏ console.log; `jwt.ts` fail-fast nếu thiếu secret.
- ✅ `AdminNotifications` origin `.replace('/api','')` → regex chuẩn.

### 🟡 QUAN TRỌNG — đã xử lý (2026-06-29, đêm)
- ✅ Cookie `secure/sameSite` hardcode → đặt theo `NODE_ENV` (helper `cookieOptions` trong `auth.controller.ts`): prod `secure:true/none`, dev `secure:false/lax`. Sửa cảnh báo "hỏng login trên http ở trình duyệt khác".
- ✅ Google OAuth truyền `referralCode` qua `state` (FE login + `GoogleAuthGuard` + `GoogleStrategy` + controller) — nhánh referral không còn là code chết.
- ✅ FE `fetch` trần → `apiClientClient` cho 11 file audit chỉ đích danh (lấy lại auto-refresh 401/403). Chi tiết: changelog 2026-06-29 (đêm). *(Các fetch trần khác ngoài danh sách audit + route `/internal-api/*` để sau.)*
- ✅ (kèm) `frontend/src/lib/jwt.ts`: sửa lỗi strict TS chặn `next build`.

### 🟡 CỐ Ý GIỮ NGUYÊN (cần quyết định nghiệp vụ — chưa sửa)
- `customerConfirmReceived` cho `SHIPPED→COMPLETED`: là lựa chọn nghiệp vụ, đổi có thể vỡ UX → để bạn quyết.
- Mốc cộng hoa hồng ở `DELIVERED` (không chỉ `COMPLETED`): thiết kế hiện tại, đã nhất quán sau khi sửa enum.
- Cooldown MARKETING race: cần unique-key cấp DB để ép tuyệt đối (kiến trúc) — đã ghi nhận.
- SMS `isSuccessResponse` coi `code 0` và `1` đều success: cần tài liệu NetViet để chốt mã đúng (đổi mò dễ gãy gửi SMS thật).
- FE `fetch` trần → `apiClientClient` đầy đủ (auto-refresh): đã làm bản an toàn (`credentials`), migration đầy đủ để sau.

---

## 🔴 NGHIÊM TRỌNG (đã xử lý — chi tiết gốc bên dưới)

### Nhóm A — Toàn vẹn dữ liệu đơn hàng (orders) — RỦI RO CAO NHẤT
1. **Tạo đơn KHÔNG transaction + trừ kho không atomic/không kiểm tồn**
   `backend-nestjs/src/orders/orders.service.ts:697-1134` (hàm `create`), trừ kho `:740-750` (lặp ở `createAdminOrder:1287-1300`).
   → Lỗi giữa chừng để lại kho âm, mất điểm hoa hồng, voucher bị đốt cho đơn không tồn tại. Hai request đồng thời gây **oversell** (dùng `decrement` vô điều kiện).
   **Sửa:** bọc toàn bộ trong `prisma.$transaction`; trừ kho bằng `updateMany({ where:{id, stock:{gte:qty}}, data:{decrement} })` + kiểm `count===0` để throw hết hàng.
2. **`updateStatus` + tác dụng phụ KHÔNG transaction**
   `orders/orders.service.ts:1778-1931` — cộng/trừ totalSpent, tính/huỷ hoa hồng, hoàn/trừ kho, soldCount chạy rời rạc → lỗi giữa chừng để dữ liệu nửa vời.
3. **KH tự huỷ đơn (`customerCancelOrder`) thiếu hoàn trả**
   `orders/orders.service.ts:2138-2177` — chỉ hoàn `stockQuantity`; KHÔNG nhả voucher, KHÔNG hoàn `variant.stock`, KHÔNG hoàn điểm hoa hồng đã trừ, không transaction. (Cron VietQR `:154-291` làm đúng — dùng làm mẫu.)
4. **Enum sai `'RETURNED'` (không tồn tại trong OrderStatus)**
   `orders/orders.service.ts:1886` (+ chỗ release voucher). Enum thật có `RETURNING`/`REFUNDED`. → nhánh hoàn kho/nhả voucher/huỷ hoa hồng **không bao giờ chạy** khi đơn chuyển `RETURNING`. **Sửa:** đổi `'RETURNED'` → `'RETURNING'`.

### Nhóm B — Hoa hồng & tích hợp (tiền + bảo mật webhook)
5. **`calculateCommissions` KHÔNG transaction + nuốt lỗi** → lệch `commissionBalance`
   `backend-nestjs/src/commissions/commissions.service.ts:8-70`. **Sửa:** bọc `$transaction`; thêm unique `(orderId,userId,level)` chống tạo trùng.
6. **Webhook Pancake KHÔNG verify chữ ký**
   `backend-nestjs/src/integrations/pancake/pancake.controller.ts:105-130` — nhận `x-pancake-signature` nhưng không dùng. Ai biết URL đều giả được webhook (tạo/sửa đơn, sync SP). **Sửa:** HMAC payload bằng apiKey/secret theo shopId + `timingSafeEqual`.
7. **ViettelPost webhook fail-open** khi thiếu token/secret
   `backend-nestjs/src/webhooks/webhooks.service.ts:43-63` — không có integration khớp + chưa set `VIETTELPOST_WEBHOOK_TOKEN`/`_SECRET` → `return true` (chấp nhận). **Sửa:** fail-closed (ít nhất ở production).
8. **Casso webhook thiếu idempotency theo giao dịch**
   `backend-nestjs/src/webhooks/casso.service.ts:79-165` — chỉ chống trùng qua `paymentStatus==='PAID'`; không lưu `transaction.id`. Retry/song song có thể chạy voucher-rules + automation 2 lần. **Sửa:** lưu transaction id (unique) đã xử lý.
9. **Spin: xác suất không chuẩn hoá + không `orderBy`**
   `backend-nestjs/src/spin/spin.service.ts:94-105` — `probability` Float không validate tổng=1; tổng≠1 làm sai tỉ lệ trúng. **Sửa:** `random * sum(probability)` hoặc validate khi tạo prize + orderBy ổn định.

### Nhóm C — Messaging / realtime
10. **WebSocket `/admin` KHÔNG verify JWT**
    `backend-nestjs/src/modules/admin-notifications/admin-notifications.gateway.ts:51-55` — mọi client (CORS cho phép) join và nhận broadcast thông báo nội bộ admin. **Sửa:** verify JWT + role trong `handleConnection`, disconnect nếu sai.
11. **`MessageProviderConfig` thiếu unique `(channelId,storeId)`**
    `backend-nestjs/src/messaging/messaging-admin.service.ts:273-314` — `upsertSmsProviderConfig` dùng findFirst→create/update, không có constraint → race tạo 2 config trùng scope → chọn config SMS không tất định. **Sửa:** thêm `@@unique` (bàn vì DB đã import dump) hoặc xử lý P2002.

### Nhóm D — Frontend
12. **`frontend/src/proxy.ts` LÀ middleware đang chạy** (Next 16 đổi tên `middleware.ts`→`proxy.ts`)
    → mâu thuẫn docs ("không middleware") + **trùng cơ chế refresh** với `apiClientClient` + redirect layout. Ngoài ra `import jwt from 'jsonwebtoken'` (`:3`) không an toàn trên Edge runtime. **Sửa:** chốt 1 cơ chế; nếu giữ proxy.ts → đổi sang `jose`/decode thủ công + cập nhật docs. *(LƯU Ý: cần sửa docs/01 + docs/03 — mình đã ghi nhầm "không có middleware".)*
13. **Logout thiếu `credentials:'include'`**
    `frontend/src/components/customer/PortalNavbar.tsx:48` → backend không nhận cookie để thu hồi refresh token (logout không thực sự).
14. **Xoá khách (soft/hard) thiếu auth**
    `frontend/src/app/admin/customers/[id]/CustomerActions.tsx:34-37, 63-66` — `fetch` trần không `credentials`/Bearer → 401 hoặc hành vi không chắc. **Sửa:** dùng `apiClientClient.delete`.
15. **Route `get-shop-id` không kiểm tra session/role**
    `frontend/src/app/api/admin/integrations/get-shop-id/route.ts:3-14` — đọc `PANCAKE_API_KEY` + trả dữ liệu shop cho bất kỳ ai (2 route sync khác có check ADMIN). **Sửa:** thêm `getSession()` + chặn non-admin.

> **Đã hạ mức (không tính nghiêm trọng):** cookie `secure:true;sameSite:'none'` cứng (`auth.controller.ts` 4 chỗ) — auditor cảnh báo hỏng login trên http; **thực tế đã đăng nhập được trên Chrome** (localhost được coi là secure context) → để ở 🟡, nên đặt theo NODE_ENV cho an toàn trình duyệt khác.
> **Google OAuth không truyền `referralCode`** (`google.strategy.ts` + `auth.controller.ts:148-152`) — nhánh referral thành code chết → xếp 🟡 (feature gap, không phải lỗi vận hành).

---

## 🟡 QUAN TRỌNG (sai quy ước / logic rủi ro)

**Auth/Core**
- Refresh token KHÔNG xoay vòng → bảng `refresh_tokens` phình vô hạn + token cũ vẫn dùng 30 ngày (`auth.service.ts:193-230, 351-363`).
- Email không chuẩn hoá (lowercase) ở register/login/google → lệch khớp + có thể tạo trùng tài khoản (`auth.service.ts:34-38, 142-149`).
- `logout` clearCookie không truyền lại `sameSite/secure/path` như lúc set (`auth.controller.ts:127-139`).
- Cookie register `maxAge 45'` nhưng JWT ký `15m` → 30' cuối cookie vô dụng (`auth.controller.ts:43`).

**E-commerce**
- KHÔNG lưu snapshot `productName/productImageUrl` vào OrderItem dù schema có field + docs yêu cầu (`orders.service.ts:757-763, 1303-1309`).
- Xoá cứng SP `deleteMany(orderItem)` → mất lịch sử dòng hàng đơn cũ (`products.service.ts:693`). **Nên** chặn xoá nếu đã có orderItem / soft-delete.
- `POST/PATCH categories` nhận `@Body() data:any`, `update` đẩy thẳng vào prisma → bỏ qua ValidationPipe, client ghi đè field tuỳ ý (`categories.controller.ts:42-68` + `categories.service.ts:122-125`).
- `getPaymentStatus` không truyền `effectiveStoreId` → STAFF/MOD sai scope (`orders.controller.ts` + `orders.service.ts:1760-1775`).
- `customerConfirmReceived` cho phép `SHIPPED→COMPLETED` (docs ghi `DELIVERED→COMPLETED`) → cộng totalSpent/hoa hồng sớm (`orders.service.ts:1933-1958`).

**Loyalty/Integrations**
- `@Cron('0 */20 * * *')` KHÔNG phải mỗi 20h → chỉ chạy 00:00 & 20:00 (`zalo-token.service.ts:128`).
- `rejectVoucherImmediately` không guard `voucherQueue` (Optional) → crash khi không Redis (`webhooks.service.ts:674-684`).
- Clone voucher bằng spread toàn bộ field + `as any` → vỡ khi schema thêm cột (`spin.service.ts:148-165`).
- `verifySignature` Casso thử 3 format + so sánh `===` (không `timingSafeEqual`) (`casso.service.ts:45-77`).
- Pancake product/inventory webhook nuốt lỗi sync hoàn toàn (`pancake.service.ts:1614-1628`).
- Bất đối xứng mốc cộng/huỷ hoa hồng (DELIVERED vs COMPLETED) + dính enum `'RETURNED'` (`orders.service.ts:1850-1910`).

**Messaging**
- Cooldown check ngoài transaction → MARKETING gửi song song có thể vượt giới hạn 1/ngày (`messaging.service.ts:127-153`).
- `isSuccessResponse` coi cả `code 0` lẫn `1` là thành công → có thể đánh dấu SENT cho tin FAIL (`integrations/sms/sms.service.ts:281-294`).
- Import gộp `invalidCount` + `duplicateCount` → khó kiểm danh sách lớn (`messaging-admin.service.ts:2004-2045`).
- Inline fallback (không Redis) ở `sendSingleMessage/retryFailedLog` không catch → API trả 500 dù log đã FAILED (`messaging.service.ts:179-194`).

**Frontend**
- Hàng loạt client component `fetch` trần thay vì `apiClientClient` → mất auto-refresh 401/403: `ProductDetailClient.tsx:197,257,684`, `OrderDetailClient.tsx:273,301`, `OrderList.tsx:120`, `ReviewForm.tsx:49`, `OrderReviewForm.tsx:66`, `ProductReviews.tsx:80`, `ProductsClient.tsx:433`, `PortalNavbarSearch.tsx:45`, `SellerRegisterClient.tsx:78`.
- Route proxy sync-products/categories: fallback base thiếu `/api` + không forward auth (`app/api/admin/integrations/sync-*/route.ts`).
- `lib/api-config.ts` base mặc định `/api` khác `apiClient` + `console.log` rác (`:7,12-13`).
- `AdminNotifications.tsx:70` `apiUrl.replace('/api','')` thay lần đầu → sai origin nếu host chứa `/api`.
- `lib/jwt.ts:3` fallback secret `'dev-secret-change-me'` → upload hỏng nếu thiếu env.

---

## 🟢 GỢI Ý (cải thiện)
- Nhiều service nhận `data:any` (categories, vouchers, spin, notifications, users update/onboarding, admin system-config) → nên tạo DTO + class-validator (docs/07 B.1-B.2).
- `admin.service.getCustomers` tải hết id rồi slice trong RAM thay vì take/skip ở DB (`:200-314`).
- `POST /users/:userId/sync-pancake-orders` chỉ JwtAuthGuard, không kiểm chủ sở hữu (IDOR nhẹ).
- `generateUniqueReferralCode` trùng lặp (auth + admin) + kiểu trả về không chắc → gộp helper.
- cart dùng `salePrice || originalPrice`, order dùng `?? ` → lệch khi giá KM = 0.
- Voucher unlock trong GET `getUserVouchers` là N+1 ghi (`vouchers.service.ts:807-845`).
- `voucher.processor.getMockShippingStatus` dùng dữ liệu giả ngẫu nhiên activate/reject voucher thật khi thiếu `VIETTELPOST_TOKEN`.
- `mail.service` `rejectUnauthorized:false` cố định.
- renderer regex biến không hỗ trợ `{{ a.b }}` và không cảnh báo `{{` còn sót.
- uploadthing còn `console.log` debug; `generateReferralCode` dùng `Math.random()`.

---

## ✅ ĐIỂM TỐT (đang làm đúng)
- Cron VietQR (`orders.service.ts:154-291`): cờ chống chạy chồng + `$transaction` + `updateMany` có điều kiện (idempotent) + hoàn kho cả 2 cấp + nhả voucher — **mẫu chuẩn**.
- Voucher: cap maxDiscount + cap 25% subtotal + kiểm trạng thái đơn nguồn QR đầy đủ.
- Hoa hồng: map đúng `level===depth` (closure table) + chống tạo trùng ở caller.
- products create/update/remove bọc `$transaction` + validate quan hệ + chống combo tự tham chiếu.
- Messaging: idempotencyKey (unique) chống gửi trùng; opt-out/cooldown→SKIPPED; auto-stop campaign; fallback không-Redis bài bản; scheduler khóa lạc quan; automation chống chạy lại trigger; mask secret SMS trong log.
- Auth: refresh token hash bcrypt; JwtStrategy truy DB kiểm `isActive` mỗi request (không tin role trong token); PermissionsGuard phân tầng + effectiveStoreId + alias.
- FE: apiClient/apiClientClient tách server/client đúng; dedupe refreshPromise; gating layout RSC; uploadthing phân quyền theo role; payload JWT khớp backend.

---

## 👉 ĐỀ XUẤT BƯỚC TIẾP
Ưu tiên sửa theo thứ tự: **Nhóm A (orders transaction + enum RETURNED)** → **Nhóm B (hoa hồng + verify webhook)** → **Nhóm D (FE auth/credentials)** → còn lại.
Bạn muốn mình bắt đầu sửa nhóm 🔴 nào trước? (Khuyến nghị: bắt đầu từ **#4 enum `'RETURNED'`** — sửa nhanh, tác động lớn; rồi **#1 transaction tạo đơn**.)

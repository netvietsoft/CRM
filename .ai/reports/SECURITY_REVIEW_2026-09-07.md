# 🛡️ BÁO CÁO RÀ SOÁT BẢO MẬT (SECURITY REVIEW): CÁC THAY ĐỔI CHƯA COMMIT TRÊN NHÁNH `main`

> **Ngày thực hiện**: 07/09/2026  
> **Vai trò thực hiện**: AI SECURITY REVIEWER  
> **Đối tượng kiểm tra**: Toàn bộ thay đổi **CHƯA COMMIT** trên working tree nhánh `main` (so với `origin/main`; không có commit nào ahead).  
> **Nguồn phát sinh thay đổi** (đều nằm trong `.ai/tasks/done/`, tiêu đề trích đúng `title` trong YAML):
> - `TASK-001` — SEC-01: Bổ sung xác thực chữ ký HMAC-SHA256 cho Webhook Pancake
> - `TASK-002` — SEC-02: Gỡ bỏ `.env.prod` khỏi Git tracking và xoay vòng toàn bộ Production Secrets (chỉ liên quan phần thay đổi `.gitignore`)
> - `TASK-003` — BIZ-01: Bọc Prisma `$transaction` cho `OrdersService.createAdminOrder` đảm bảo toàn vẹn tồn kho
> - `TASK-004` — FE-01: Khắc phục vòng lặp gọi API vô tận trong custom hook `useApi` bằng `useRef`
> - `TASK-005` — BIZ-02: Sửa luồng áp dụng Voucher Checkout, ngăn chặn tự tạo mới `UserVoucher` khi bị REJECTED
> - `TASK-006` — SEC-03: Tách riêng Secret giữa Access Token và Refresh Token, bổ sung kiểm tra token type
> - `TASK-007` — FEAT: Tích hợp đồng bộ sản phẩm trực tiếp lên Meta Commerce Catalog (catalog_management)
>
> **Tài liệu tham chiếu**: `docs/Security/rules.md`, `docs/Security/threat-model.md`, `docs/Security/secrets.md`, `.ai/reports/SYSTEM_AND_CODE_REVIEW_2026-09-07.md`.

---

## 📊 1. KẾT LUẬN CHÍNH (EXECUTIVE SUMMARY)

> **Không có phát hiện nào đạt ngưỡng báo cáo ≥ 8/10.**  
> Có **1 ứng viên** được agent phản biện xác nhận là **lỗi thật (TRUE POSITIVE)** nhưng chỉ đạt **7/10**, nằm **dưới ngưỡng**. Ứng viên này được ghi đầy đủ tại mục 4 để đội ngũ không bỏ sót khi hoàn thiện SEC-01.

| Mức độ | Số lượng đạt ngưỡng (≥ 8/10) | Ghi chú |
|---|:---:|---|
| 🔴 **CRITICAL** | **0** | — |
| 🟠 **HIGH** | **0** | — |
| 🟡 **MEDIUM** | **0** | 1 ứng viên lỗi thật ở mức 7/10 (dưới ngưỡng) — xem mục 4 |
| 🟢 **LOW** | **0** | — |

Nhìn chung, các thay đổi trong đợt này **làm hệ thống an toàn hơn** so với trước (thêm HMAC cho webhook, tách secret JWT, siết voucher/tồn kho, chặn refresh token dùng làm access token). Vấn đề còn lại là phần vá SEC-01 **chưa trọn vẹn** về ràng buộc tenant.

---

## 🔬 2. PHƯƠNG PHÁP

Quy trình review gồm 4 bước, trong đó 2 lớp agent độc lập (dò tìm và phản biện) nhằm hạn chế báo động giả (false positive):

1. **Agent dò tìm lỗ hổng**: Đọc toàn bộ `git diff` của working tree kèm ngữ cảnh repo (schema Prisma, controller/guard liên quan, file test `*.spec.ts`, `.env*` chỉ kiểm tra **tên key**). Mỗi nghi vấn được ghi thành một *ứng viên* với vị trí `file:line`.
2. **Agent phản biện độc lập**: Với từng ứng viên, một agent khác tự đọc lại code để chứng minh **hoặc bác bỏ** tiền đề tấn công, rồi chấm **độ tin cậy 0–10**.
3. **Ngưỡng báo cáo**: Chỉ phát hiện đạt **≥ 8/10** mới được ghi nhận là *phát hiện chính thức (Finding)*. Ứng viên là lỗi thật nhưng dưới ngưỡng được ghi ở mục riêng để không bị bỏ sót.
4. **Kiểm chứng trích dẫn**: Toàn bộ số dòng trong báo cáo này đã được đối chiếu lại với code trên đĩa tại thời điểm viết (xem Phụ lục, mục 8). Các trích dẫn bị bác bỏ hoặc không tìm thấy đã bị loại hoặc viết lại đúng thực tế.

**Tiêu chí loại trừ** (không tính là lỗ hổng trong đợt này): DoS / cạn tài nguyên; secret đã tồn tại sẵn trên đĩa (thuộc phạm vi SEC-02); thiếu rate limit; SSRF chỉ điều khiển được *path* trên host cố định; XSS trong React khi không dùng `dangerouslySetInnerHTML`; các vấn đề "thiếu gia cố (hardening)" không có đường khai thác cụ thể.

---

## 📂 3. PHẠM VI

24 file đang được Git theo dõi (tracked) đã sửa — gồm `CLAUDE.md` và 3 file `*.spec.ts` chỉ đọc để đánh giá độ phủ test — và 12 file mã nguồn mới (untracked); 13 file `docs/*.md` cũ bị xoá thuộc nhóm loại trừ (tài liệu).

*Tên file rút gọn trong bảng này quy về gốc `backend-nestjs/src/` (backend) và `frontend/src/` (frontend).*

| Khu vực | File đã review |
|---|---|
| **Backend – Auth** | `auth/auth.service.ts`, `auth/strategies/jwt.strategy.ts`, `auth/strategies/jwt-refresh.strategy.ts` |
| **Backend – Integrations** | `integrations/pancake/pancake.controller.ts`, `integrations/pancake/pancake.service.ts`, `integrations/facebook/facebook-oauth.controller.ts`, `integrations/facebook/facebook.module.ts`, `integrations/facebook/facebook.service.ts`, **MỚI** `integrations/facebook/meta-catalog.service.ts`, `integrations/viettelpost/viettel-customer.service.ts`, `integrations/viettelpost/viettelpost-sync.service.ts` |
| **Backend – Orders / Build** | `orders/orders.service.ts`, `backend-nestjs/package.json` (`prebuild` dùng `rimraf`) |
| **Frontend** | `app/admin/integrations/page.tsx`, `components/admin/AdsDashboard.tsx`, `components/admin/FacebookConnectCard.tsx`, `components/admin/MessengerInbox.tsx`, `components/admin/ProductActions.tsx`, **MỚI** `components/admin/MetaCatalogCard.tsx`, `hooks/useApi.ts` |
| **Khác** (gốc repo) | `.claude/settings.json` (hooks), `.gitignore`, **MỚI** `scripts/update-todos.py`, `scripts/verify.sh`, `scripts/verify.ps1`, `start-*.bat` |
| **Loại trừ** | `*.spec.ts` (chỉ đọc để đánh giá độ phủ test, không review bảo mật), tài liệu markdown |

---

## 🟡 4. ỨNG VIÊN DƯỚI NGƯỠNG — SEC-08 (mã do SECURITY đề xuất, chờ xác nhận): Chữ ký HMAC webhook không ràng buộc tenant nguồn — IDOR ghi đơn/khách hàng xuyên Store

- **Vị trí**:
  - `backend-nestjs/src/integrations/pancake/pancake.service.ts` — `verifyWebhookSignature()` dòng 24–81 (`whereClause` 34–37, vòng lặp thử secret 60–77, `return true` dòng 75).
  - `backend-nestjs/src/integrations/pancake/pancake.controller.ts` — `handleWebhook()` dòng 124–160 (`@Public()` 125, header `x-pancake-shop-id` 131, `rawBody` fallback 135–137, gọi verify 139, gọi `handleWebhookEvent` 146).
  - `pancake.service.ts` — `handleWebhookEvent` 1576–1595; `handleOrderWebhook` 1597–1603; `handleCustomerWebhook` 1640–1676; `handleProductWebhook` 1678–1684; `handleInventoryWebhook` 1686–1692.
- **Mức độ**: 🟡 **MEDIUM**
- **Độ tin cậy**: **7/10** (dưới ngưỡng 8)
- **Phân loại**: Phân quyền (Authorization) / Phân quyền Đa Tenant (Multi-Tenant Isolation) — IDOR xuyên Store
- **Rủi ro**: Chủ Store đã được duyệt (tenant hợp lệ nhưng có ý đồ xấu) ký webhook bằng secret của mình, bỏ header `x-pancake-shop-id` → tạo/ghi đè đơn `PCK-*`, thao túng `totalSpent`/hạng khách hàng, ép đồng bộ lại sản phẩm của **Store khác** (chi tiết 4.3–4.4).

### 4.1. Thực trạng

(Trong hệ thống này mỗi Store là một tenant.)

1. `handleWebhook` đọc header `x-pancake-shop-id` (dòng 131, khai báo kiểu `string`) nhưng **không validate**; khi client bỏ header, `shopId` là `undefined` lúc chạy (chính code cũng ngầm thừa nhận khả năng này: `shopId || 'unknown'` ở dòng 141).
2. `verifyWebhookSignature(rawBody, signature, shopId)` (dòng 24–81) chỉ thêm điều kiện `shopId` vào `whereClause` **khi có** (dòng 35–37). Không có header → `findMany` trả về **mọi** integration `{ platform: 'PANCAKE', isActive: true }` (dòng 39–48).
3. Vòng lặp dòng 60–77 thử lần lượt `secret = integration.apiSecret || meta.webhookSecret || integration.apiKey` (dòng 62), tính HMAC-SHA256 hex (65–69), so sánh bằng `crypto.timingSafeEqual` (74) và **`return true` ngay khi khớp** (75). Kiểu trả về là `Promise<boolean>` — **hàm không trả về integration nào đã khớp**.
4. Controller truyền **cùng** `shopId` (có thể `undefined`) xuống `handleWebhookEvent(payload, shopId)` (dòng 146).
5. Các handler chọn Store đích bằng `storeIntegration.findFirst({ platform: 'PANCAKE', isActive: true, ...(shopId ? { shopId } : {}) })`:
   - `handleOrderWebhook` 1598–1601 → `syncSingleOrder(orderData, integration.store.id)` 1603.
   - `handleProductWebhook` 1679–1682 và `handleInventoryWebhook` 1687–1690 → `syncAllProducts(integration.storeId)`.
   - `handleCustomerWebhook` (1640–1676) **không giới hạn theo Store nào**: `order.updateMany({ source: 'PANCAKE', userId: null, shippingPhone: { in: phoneTerms } })` dòng 1658–1667 không lọc `storeId`.

   Khi `shopId` là `undefined`, `findFirst` trả về **một Store tuỳ ý** (bản ghi đầu tiên theo thứ tự DB).

➡️ Hệ quả: chữ ký chỉ chứng minh người gửi sở hữu secret của **một Store bất kỳ**, nhưng lại cho phép ghi dữ liệu vào **một Store khác**.

### 4.2. Vì sao kẻ tấn công có điều kiện thực hiện

| Điều kiện | Bằng chứng đã kiểm chứng |
|---|---|
| Mỗi Store có tối đa 1 integration PANCAKE, số Store không giới hạn | `backend-nestjs/prisma/schema.prisma:198` `@@unique([storeId, platform])` |
| `shopId` không phải khoá duy nhất | `schema.prisma:190` `shopId String? @map("shop_id")` — nullable, **không** `@unique` |
| Mỗi MODERATOR sở hữu 1 Store | `schema.prisma:152` `ownerId String @unique` trong `model Store` |
| MODERATOR tự tạo được integration PANCAKE với secret tự chọn | `backend-nestjs/src/integrations/integrations.controller.ts:33` `@Roles('ADMIN', 'STAFF', 'MODERATOR')` trên `@Post()`; `backend-nestjs/src/integrations/integrations.service.ts:41` destructure `{ platform, storeId, ...config }` **không allowlist platform**; 45–50 ép non-ADMIN về `effectiveStoreId` nhưng 61–68 spread `...config` (`apiKey`, `apiSecret`, `isActive`, `shopId`, cả `accessToken`, `metadata`) thẳng vào upsert. Không cần tài khoản Pancake thật — hàm xác thực chỉ so với giá trị lưu trong DB |
| Secret đọc lại được ở dạng plain-text (trùng **SEC-07**) | `integrations.service.ts:22-37` `findMany` chỉ `include` store, không `select` → trả `apiKey`/`apiSecret` đầy đủ; FE hiển thị tại `frontend/src/app/admin/integrations/page.tsx:100-101, 306-308, 330-332, 339-341` |
| MODERATOR chỉ tồn tại sau khi admin duyệt → kẻ tấn công trong mô hình này là **tenant hợp lệ nhưng có ý đồ xấu** (hostile tenant), không phải người lạ trên Internet | `backend-nestjs/src/stores/stores.service.ts:217` store tự đăng ký `isActive: false`; `approveStore` (396–482) tạo user MODERATOR mới (`role: 'MODERATOR'` dòng 469) và kích hoạt Store (476–482); `createStoreAdmin` (293–331) nâng owner lên MODERATOR (315–321) |
| Luồng xác thực HMAC thực sự đang chạy (không phải dead code) | `backend-nestjs/src/main.ts:8` `NestFactory.create(AppModule, { rawBody: true })` |
| Đa tenant Pancake là chế độ triển khai được hỗ trợ | `pancake.service.ts:298-319` `getActivePancakeIntegrations()` duyệt nhiều integration; caller ở 711 và 1113 |
| Nhánh "không header, nhiều integration" **chưa có unit test** | `backend-nestjs/src/integrations/pancake/pancake.service.spec.ts:26-107`: cả 5 test đều truyền `mockShopId = 'shop-101'` (dòng 9); mock `findMany` chỉ trả 1 integration hoặc `[]` |

### 4.3. Kịch bản khai thác

**Kẻ tấn công**: Chủ Store X (MODERATOR, đã được admin duyệt). **Nạn nhân**: Store Y trong cùng hệ thống.

Bước 1 — X tạo integration PANCAKE với secret tự chọn (không cần tài khoản Pancake thật):

```http
POST /api/integrations
Authorization: Bearer <token của MODERATOR X>
Content-Type: application/json

{ "platform": "PANCAKE", "apiSecret": "attacker-secret", "isActive": true }
```

Bước 2 — X gửi webhook giả tới endpoint công khai, ký bằng chính secret của mình, **cố tình bỏ `x-pancake-shop-id`**:

```http
POST /api/integrations/pancake/webhook
x-pancake-signature: <hex(HMAC-SHA256(rawBody, "attacker-secret"))>
Content-Type: application/json

{"type":"orders","data":{"id":987654,"bill_phone_number":"0912345678","total_price":1000000,"status":3}}
```

Bước 3 — `verifyWebhookSignature` thử secret của X, khớp → `return true` (dòng 75), nhưng không ghi nhận integration của X là bên đã khớp.  
Bước 4 — `handleOrderWebhook(data, undefined)` → `findFirst` chọn Store đầu tiên = Store Y (dòng 1598–1601).  
Bước 5 — `syncSingleOrder(data, Y.storeId)`: `fetchOrderDetail(987654, Y.storeId)` dùng key của Y (dòng 1267 → 473–491); id không thuộc shop Pancake của Y nên trả `null`, code **quay về dùng payload do kẻ tấn công gửi** (dòng 1267). Đơn `PCK-987654` được tạo trong Store Y với trạng thái/số tiền/khách hàng do kẻ tấn công đặt (nhánh create 1487–1509).

### 4.4. Rủi ro / Hậu quả

- **Tạo hoặc ghi đè đơn** `PCK-<id>` sang Store Y. Vì `order.orderCode` là `@unique` toàn cục (`schema.prisma:340`) và id Pancake là số nguyên nhỏ, nếu mã đã tồn tại ở bất kỳ Store nào → nhánh update (1466–1486) **xoá `orderItems` cũ và ghi đè trạng thái/số tiền/`storeId`**, tức chuyển hẳn đơn về Store Y.
- **Chuyển trạng thái sang hoặc ra khỏi `COMPLETED`/`DELIVERED`** kích hoạt `updateUserRankAndSpent` (1518–1523) → thao túng `totalSpent` và hạng khách hàng (`usersService.updateUserRank` chỉ ghi `rank`/`points`); hoa hồng affiliate chỉ bị ảnh hưởng gián tiếp nếu tỷ lệ hoa hồng phụ thuộc hạng — chưa kiểm chứng trong đợt này.
- **Tạo/sửa CUSTOMER theo số điện thoại**: điền các trường trống email/name/address/dob hoặc tạo user CUSTOMER mới (196–238, 258–274).
- **Phát thông báo giả tới admin** (1630–1635).
- **Ép đồng bộ lại toàn bộ sản phẩm** của Y qua payload `products`/`inventory` (`syncAllProducts` dòng 1682/1690).

### 4.5. Biến thể tấn công (khi có `shopId`)

Vì `shopId` không unique (`schema.prisma:190`), kẻ tấn công có thể đặt `shopId` của integration mình **trùng** với Store Y rồi gửi kèm header. `findMany` trả cả hai; secret của X vẫn verify; `findFirst` tại 1598 vẫn có thể chọn Y.

### 4.6. Vi phạm quy tắc & lý do điểm 7

- **`docs/Security/rules.md` §1 khoản 3** (Chống Giả mạo Webhook, dòng 11–12): HMAC được thêm nhưng **không ràng buộc đúng tenant nguồn**.
- **`docs/Security/rules.md` §1 khoản 4** (Phân quyền Đa Tenant, dòng 13–14): dữ liệu ghi vào Store khác `effectiveStoreId` của người sở hữu secret.
- **Vì sao chỉ 7/10**: Trước TASK-001, endpoint **không xác thực gì cả** (SEC-01). Đây là **phần vá chưa trọn vẹn** của SEC-01, **không phải lỗi hồi quy (regression)** — bề mặt tấn công đã hẹp lại (yêu cầu là tenant hợp lệ đã được duyệt, thay vì bất kỳ ai trên Internet). Do đó agent phản biện hạ xuống 7/10, dưới ngưỡng 8.

### 4.7. Khắc phục

1. `verifyWebhookSignature` **trả về integration khớp** (`{ id, storeId, shopId }` hoặc `null`) thay vì `boolean`.
2. Truyền `storeId` đã khớp xuống `handleWebhookEvent` để **mọi handler chỉ thao tác trên Store đó**.
3. **Bỏ cơ chế `findFirst` dự phòng (fallback)** trong `handleOrderWebhook`/`handleProductWebhook`/`handleInventoryWebhook`; **giới hạn phạm vi (scope) `handleCustomerWebhook`** theo Store đã khớp.
4. Hoặc **bắt buộc `x-pancake-shop-id`** và chỉ verify secret của integration đó, hoặc **suy tenant duy nhất từ secret khớp** — tuyệt đối không tin một header mà client có thể tự bỏ đi.
5. Thêm unit test (`pancake.service.spec.ts`) với **2 integration active + không truyền `shopId`**, kiểm chứng (assert) dữ liệu được định tuyến về đúng Store sở hữu secret đã xác thực.

---

## 🧪 5. CÁC ỨNG VIÊN ĐÃ XEM XÉT VÀ LOẠI

| # | Ứng viên | Lý do loại + bằng chứng (đã kiểm chứng) |
|:--:|---|---|
| 1 | `/auth/refresh` nhận thêm refresh token qua Bearer | `jwt-refresh.strategy.ts:19` thêm `ExtractJwt.fromAuthHeaderAsBearerToken()`, nhưng `backend-nestjs/src/auth/auth.controller.ts:152-153` vẫn đọc refresh token từ cookie `crm_refresh_token` và `auth.service.ts:240-277` bcrypt-compare với các bản ghi `refreshToken` trong DB (dòng 259) → request chỉ mang Bearer mà không có cookie sẽ không được cấp token mới (401). Access token gửi qua Bearer tới `/auth/refresh` bị từ chối vì sai chữ ký (khác secret). Check mới ở `jwt.strategy.ts:26` vẫn cho qua token **không có** claim `type` (token cũ); rủi ro refresh cookie CŨ dùng được làm access token là hành vi **tồn tại từ trước**, không do thay đổi này gây ra và tự hết khi các token đó hết hạn — mọi nơi ký token trong `src/` (`generateTokens`, `issueSocketTicket`) nay đều gắn `type` |
| 2 | Fallback `JWT_REFRESH_SECRET` → `${JWT_SECRET}_refresh` | `auth.service.ts:389-390` và `jwt-refresh.strategy.ts:10-12`. `backend-nestjs/.env` và `backend-nestjs/.env.prod` **không** đặt tên key `JWT_REFRESH_SECRET` (đã kiểm chỉ tên key, không đọc giá trị) nên prod chạy bằng fallback. Refresh secret được suy ra một cách xác định (deterministic) từ access secret — vốn đã là gốc tin cậy (root of trust) — nên không mở thêm bề mặt tấn công; bước bcrypt-compare với bản ghi `refreshToken` trong DB vẫn chặn JWT giả. Đây chỉ là khuyến nghị gia cố (hardening) → nên đặt `JWT_REFRESH_SECRET` tường minh (`docs/Security/secrets.md` mục 2.A đã liệt kê) |
| 3 | `catalogId` từ body ghép vào URL Graph | `meta-catalog.service.ts:147` `catalogId` = body value ưu tiên, chỉ `.trim()` + kiểm rỗng (148), không validate/URL-encode; ``fetch(`${graphUrl}/${catalogId}/items_batch`)`` dòng 189. Nhưng chỉ điều khiển được **path** trên `graph.facebook.com` (SSRF-path-only → loại), route yêu cầu `@Roles('ADMIN','MODERATOR')` + `INTEGRATIONS_MANAGE` (`facebook-oauth.controller.ts:97-114`), dùng token của chính Store gọi. Không có leo thang đặc quyền |
| 4 | Scope tenant Meta Catalog | `resolveToken` (29–55) lọc theo `effectiveStoreId` cho MODERATOR/STAFF; ADMIN (`null`) fallback `store.findFirst()` (`meta-catalog.service.ts:85, 115, 141`) + connection ACTIVE mới nhất của **bất kỳ** Store (`fbConnection.findFirst` 30–36) — là điểm thiết kế chưa chuẩn (design smell), nhưng ADMIN là vai trò cao nhất toàn hệ thống, không nằm trong mô hình kẻ tấn công ở đây |
| 5 | `getStatus`/`syncProducts` trả nguyên văn `apiResponse` từ Graph API | `meta-catalog.service.ts:217` lưu `apiResponse: metaBatchResponse` vào metadata và trả về; response/error của Graph API **không chứa lại `access_token`**. Không rò rỉ secret |
| 6 | `getRevenueStats` (ViettelPost) | `viettel-customer.service.ts:632` **không được controller nào gọi tới** — chỉ `backend-nestjs/src/integrations/viettelpost/viettel-customer.revenue.spec.ts` gọi (20/35/50). `backend-nestjs/src/admin/admin.controller.ts` có handler cùng tên nhưng gọi `adminService.getRevenueStats` (service khác). Truy vấn Prisma đã tham số hoá (parameterized). Không có bề mặt tấn công |
| 7 | Voucher/tồn kho trong `orders.service.ts` | Thay đổi **siết chặt hơn**: mỗi kiểm tra voucher `throw BadRequestException` thay vì `continue` âm thầm (947–1043, 1099–1142); `userId` là tham số đã xác thực `create(userId, ...)` (dòng 775, gọi từ `backend-nestjs/src/orders/orders.controller.ts:36-40`). Không gây regression |
| 8 | Frontend không `dangerouslySetInnerHTML` | Grep `dangerouslySetInnerHTML`/`innerHTML` trên toàn bộ `frontend/src` → **0** kết quả. Sáu file đã sửa (`AdsDashboard`, `MessengerInbox`, `FacebookConnectCard`, `ProductActions`, `MetaCatalogCard`, `admin/integrations/page`) đều sạch |
| 9 | `scripts/*` + hooks `.claude/settings.json` + `.gitignore` | Không có đầu vào không tin cậy (untrusted input). **Lưu ý**: credentials ViettelPost xuất hiện trong `.claude/settings.json` là **dòng ngữ cảnh đã có từ trước trong diff** (không phải phần thêm mới), ngoài phạm vi đợt này — nhưng **nên xoá/xoay vòng** theo runbook SEC-02 (`docs/Security/secrets.md` mục 2.D). TASK-002 đã ở trạng thái `done` nhưng mục tiêu SEC-02 "không còn credentials thực tế bị commit" chưa thỏa với file này → cần ORCHESTRATOR mở task nối tiếp (không chép giá trị credential vào báo cáo) |

---

## 📝 6. GHI CHÚ NGOÀI PHẠM VI BẢO MẬT (cho tác giả)

1. **`configureWebhook` đăng ký sai loại xác thực với Pancake**: `pancake.service.ts:1694-1727` PUT tới Pancake với `shop.webhook_headers = { 'X-API-KEY': config.apiKey, ... }` (dòng 1711), trong khi hàm xác thực mới lại đòi **chữ ký HMAC ở header `x-pancake-signature`** (controller không hề đọc `X-API-KEY`). Webhook Pancake thật có thể bị **403** nếu Pancake không gửi HMAC. **Cần đối chiếu tài liệu đặc tả webhook của Pancake (`X-API-KEY` hay HMAC `x-pancake-signature`) trước khi deploy.**
2. **`.gitignore` pattern `.env*` quá rộng**: `.gitignore:28` `.env*` (kèm block 27–33) sẽ ignore luôn `.env.example` — file mà `docs/Security/secrets.md:11` khuyến nghị commit làm template. Hiện repo **chưa có** `.env.example` nên chưa ảnh hưởng, nhưng nên thêm ngoại lệ `!.env.example` để tránh về sau.

---

## 🗺️ 7. KẾ HOẠCH HÀNH ĐỘNG (ACTION PLAN)

> Task ID do **ORCHESTRATOR** cấp (báo cáo này **không** tự bịa mã task mới; `SEC-08` là mã rủi ro trong `threat-model.md`, không phải mã task).
>
> **Cập nhật 11/09/2026**: Hạng mục 1 (hoàn thiện SEC-01 / SEC-08) và hạng mục 2 (dòng SEC-08 trong `threat-model.md`) đã được thực hiện trong **`TASK-008`** (`.ai/tasks/review/`) — chi tiết tại `docs/Changelog/CHANGELOG.md` mục `2026-09-07→11`. Các hạng mục còn lại vẫn chờ.

| Việc cần làm | File liên quan (gợi ý `files_allowed`) | Vai trò (theo AGENTS.md) | Ưu tiên |
|---|---|:--|:--:|
| Hoàn thiện SEC-01: `verifyWebhookSignature` trả về integration khớp; truyền `storeId` đã khớp xuống mọi handler; bỏ cơ chế `findFirst` dự phòng; giới hạn phạm vi `handleCustomerWebhook`. **Acceptance**: unit test mới với 2 integration active + không `shopId`, assert dữ liệu định tuyến theo đúng secret đã xác thực (test Pancake trong `backend-nestjs` xanh; quality gate `scripts/verify.sh` / `verify.ps1`) | `backend-nestjs/src/integrations/pancake/pancake.service.ts`, `pancake.controller.ts`, `pancake.service.spec.ts` | `INTEGRATION` / `BACKEND` (`TESTER` chỉ review/chạy test — AGENTS.md cấm TESTER sửa `src/**`) | 🟡 MEDIUM |
| Ghi bổ sung **SEC-08** vào `docs/Security/threat-model.md` (dòng kế tiếp sau SEC-07): *"Chữ ký HMAC webhook không ràng buộc tenant nguồn — IDOR ghi đơn/khách hàng xuyên Store"*, mức 🟡 MEDIUM | `docs/Security/threat-model.md` | `SECURITY` | 🟡 MEDIUM |
| Đặt `JWT_REFRESH_SECRET` tường minh trên môi trường, bỏ lệ thuộc fallback `${JWT_SECRET}_refresh` | env server / `backend-nestjs/.env.prod` (chỉ tên key) | `DEVOPS` / `SECURITY` | 🟢 LOW |
| SEC-07: che (mask) `apiKey`/`apiSecret`/`accessToken` trong `IntegrationsService.findAll` (dùng `select` thay `include`); điều chỉnh form FE tương ứng | `backend-nestjs/src/integrations/integrations.service.ts`, `frontend/src/app/admin/integrations/page.tsx` | `BACKEND` + `FRONTEND` / `SECURITY` | 🟢 LOW |
| Đối chiếu tài liệu đặc tả webhook Pancake (`X-API-KEY` trong `configureWebhook` vs HMAC `x-pancake-signature` trong hàm xác thực) trước khi deploy | `backend-nestjs/src/integrations/pancake/pancake.service.ts:1694-1727` | `INTEGRATION` | 🟢 LOW |
| Thêm ngoại lệ `!.env.example` vào `.gitignore` | `.gitignore` | `DEVOPS` | 🟢 LOW |
| Nối tiếp SEC-02: xoá/xoay vòng credentials ViettelPost còn commit trong `.claude/settings.json` (TASK-002 đã `done` nhưng file này không nằm trong `files_allowed` của nó → cần task mới, ID do ORCHESTRATOR cấp) | `.claude/settings.json`, `docs/Security/secrets.md` | `DEVOPS` / `SECURITY` | 🟠 **HIGH** |

**Đề xuất dòng mới cho `docs/Security/threat-model.md`:**

```markdown
| **SEC-08** | Pancake Webhook | Chữ ký HMAC webhook không ràng buộc tenant nguồn — IDOR ghi đơn/khách hàng xuyên Store | 🟡 **MEDIUM** | `Backlog` |
```

---

## 📎 8. PHỤ LỤC — TRÍCH DẪN ĐÃ KIỂM CHỨNG

*CONFIRMED*: trích dẫn khớp code trên đĩa; *CORRECTED*: bản nháp đầu mô tả sai/thiếu, đã viết lại theo code thực tế. *Tên file rút gọn quy về gốc `backend-nestjs/src/`; `schema.prisma` = `backend-nestjs/prisma/schema.prisma`.*

Toàn bộ 35 khẳng định (`file:line` và hành vi code) trong mục 4–6 đã được 4 agent đối chiếu độc lập với code trên đĩa ngày 07/09/2026: 33 CONFIRMED nguyên văn (đã ghi trực tiếp tại chỗ dùng), 2 CORRECTED, 0 REFUTED / NOT_FOUND. Hai khẳng định phải CORRECTED so với bản nháp đầu:

| Trích dẫn | Trạng thái | Vị trí thực tế |
|---|:--:|---|
| `handleWebhook` `@Public()` | ✅ CORRECTED | `integrations/pancake/pancake.controller.ts:124-160` (`@Public()` 125; header ở dòng 131 khai báo kiểu `string` (không optional) nhưng không được validate → có thể là `undefined` lúc chạy; `rawBody` fallback 135-137 ưu tiên `req?.rawBody`, chỉ khi không có mới `JSON.stringify(payload)`; verify 139; `handleWebhookEvent` 146) |
| Store tự đăng ký `isActive:false`; đường duyệt tạo MODERATOR | ✅ CORRECTED | `stores/stores.service.ts:217`; `approveStore` 396-482 **không** nâng owner gốc mà tạo user MODERATOR mới (role 469) rồi chuyển `ownerId` + kích hoạt (476-482); `createStoreAdmin` 293-331 mới là nơi nâng owner lên MODERATOR (315-321) |

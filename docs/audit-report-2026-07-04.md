# 🔍 BÁO CÁO AUDIT CODE — CRM netvietsoft (2026-07-04)

> Phạm vi: **toàn bộ** `D:\SetupC\WWW\crm` (BE NestJS + FE Next.js), trọng tâm **logic · DB · bảo mật**.
> Cách làm: 5 reviewer song song (bảo mật/tenant · CCM-messenger-AI · đơn hàng/tiền/tích hợp · DB/Prisma · frontend) → dedup → verify các phát hiện nặng nhất bằng đọc mã trực tiếp.
> Trạng thái repo: working tree **sạch**, mọi thay đổi CCM đã commit (`ced6f99` + `61dd887` + `0214458`). Đây là audit codebase, không phải review diff.
> Ký hiệu: ✅ = đã verify trực tiếp trong mã; ⚠ = reviewer báo, chưa verify tay (độ tin cao).

Tổng: **6 🔴 nghiêm trọng · 9 🟠 quan trọng · 7 🟡 nên sửa**. Không có phần nào bắt buộc "viết lại từ đầu"; chủ yếu là **thêm scope/transaction/index** và **thống nhất luồng crediting** — xem mục "Rút gọn / viết lại" ở cuối.

---

## 🔴 NGHIÊM TRỌNG — sửa trước khi chạy thật

### C1. `orders.create()` KHÔNG atomic → mất kho/voucher/hoa hồng khi lỗi ✅
`src/orders/orders.service.ts` (~697–1088). Trừ tồn kho (variant + product), đánh dấu voucher `isUsed`/`usedCount++`, trừ `commissionBalance`… đều là các `await` rời; `order.create()` ở **dòng 1088** nằm ngoài mọi `$transaction`.
- **Hậu quả:** nếu `order.create()` ném lỗi (trùng `orderCode`, rớt kết nối, constraint) → kho đã trừ, voucher đã "cháy", số dư đã trừ, **nhưng không có đơn**. Chạy đồng thời còn cho tồn kho âm (không re-check trong transaction).
- **Sửa:** bọc toàn bộ trừ-kho/voucher/commission + `order.create` trong `this.prisma.$transaction(async (tx) => {…})`; re-check tồn kho bên trong.

### C2. Xoá User → **cascade xoá toàn bộ Order** của khách ✅
`prisma/schema.prisma`: `model Order` → `user User? @relation(..., onDelete: Cascade)`.
- **Hậu quả:** xoá/ẩn 1 tài khoản khách (hoặc purge GDPR) sẽ **xoá sạch lịch sử đơn + order_items + tham chiếu commission** — mất dữ liệu tài chính phải lưu. (Quan hệ `store` đã đúng là `SetNull`, chỉ `userId` sai.)
- **Sửa:** đổi `onDelete: Cascade` → `SetNull` cho `Order.userId` (cột đã `String?`), thêm migration. Rà các cascade khác trỏ về `User` (refresh_token OK, closure OK).

### C3. 3 endpoint `ai-agent.controller.ts` KHÔNG scope theo store → rò rỉ/tamper xuyên tenant ✅
`src/ai-agent/ai-agent.controller.ts`. `AiSuggestion`/`AiAgentConfig`/`AiConversationState` **không có cột `storeId`**, handler query/upsert thẳng theo `conversationId`/`pageId` do client gửi:
- **`GET /ai-agent/suggestions?conversationId=`** (dòng 49–50): STAFF store A đọc `replyText` + `orderDraft` (tên/SĐT/địa chỉ khách) của **store B**.
- **`PUT /ai-agent/config`** (dòng 40–43) + **`GET /config`** (32): đổi/bật AI **AUTO + persona** của page store khác → AI store B tự trả lời khách bằng persona kẻ tấn công cài.
- **`POST /ai-agent/conversations/:id/pause`** (83–84): tắt AI hội thoại store khác (DoS/toàn vẹn).
- (Endpoint `approve` an toàn hơn vì đi qua `messenger.reply` có scope — nhưng vẫn `findUnique` suggestion theo `id` không scope; nên siết luôn.)
- **Sửa:** thêm `storeId` vào 3 model (migration) + verify `conversation.page.storeId === effectiveStoreId` / `page.storeId === effectiveStoreId` trong mọi handler (dùng `getScopedConversation` như messenger đã có).

### C4. Webhook Casso: ký HMAC trên body đã re-serialize + so sánh không hằng-thời-gian + tra đơn toàn cục ⚠
`src/webhooks/casso.controller.ts:44` verify chữ ký trên `JSON.stringify(payload)` (sau ValidationPipe `whitelist:true` đã strip/đổi thứ tự khoá) thay vì **raw bytes** Casso ký; `casso.service.ts:66` so sánh hash bằng `===`.
- **Hậu quả:** (a) webhook hợp lệ có thể bị **từ chối** (chuỗi tái tạo khác chuỗi đã ký); (b) chữ ký không còn ràng buộc nội dung thật → với mô tả `ORDER:<code>` + số tiền khớp (chỉ check lệch 1%), có thể **lật đơn bất kỳ tenant sang PAID/CONFIRMED**.
- **Sửa:** verify trên raw body (`rawBody`/`express.raw`), so sánh bằng `crypto.timingSafeEqual`, và resolve đơn kèm scope store.

### C5. Đơn giao thành công qua **webhook VTP** không cộng doanh thu/hoa hồng/soldCount ✅
`src/webhooks/webhooks.service.ts` (~268–272) set DELIVERED/PAYMENT_COLLECTED bằng `prisma.order.update` thô; **không** gọi `totalSpent`/`calculateCommissions`/`soldCount` (grep = 0 trong file), trong khi `orders.service.updateStatus` (1890–1926) thì có.
- **Hậu quả:** cùng 1 trạng thái, đơn lên DELIVERED **qua VTP** thì khách không tăng `totalSpent` (không lên hạng), sản phẩm không tăng `soldCount`, **người giới thiệu không được trả hoa hồng**; qua UI admin thì có → payout phụ thuộc kênh, sai lệch số liệu.
- **Sửa:** rút phần crediting của `updateStatus` thành 1 hàm dùng chung, gọi từ cả webhook VTP lẫn admin (xem "viết lại" G1).

### C6. Enum trả hàng **`RETURNING` vs `RETURNED`** lệch → hoàn hàng không đảo kho/hoa hồng/voucher ✅
Schema `OrderStatus` chỉ có **`RETURNING`** (dòng 1113). Webhook VTP map 502/510 → `'RETURNING'` (webhooks.service:490). Nhưng `orders.service:1928` `isCancelled = ... || status === 'RETURNED'` — **giá trị không tồn tại**; nhánh void (khôi phục kho, thả voucher, đảo hoa hồng) **không bao giờ chạy** cho hàng hoàn.
- **Hậu quả:** đơn đã giao rồi bị hoàn → khách vẫn giữ `totalSpent`, người giới thiệu vẫn giữ hoa hồng, kho không hoàn, voucher không thả. Sai tiền vĩnh viễn.
- **Sửa:** thay `'RETURNED'` → `'RETURNING'` (hoặc bổ sung cả 2), và cho nhánh void của webhook (webhooks.service:337) bắt luôn `RETURNING`.

---

## 🟠 QUAN TRỌNG

### I1. `setContactDob` cập nhật `User.dob` bằng `updateMany({where:{phone}})` — không scope, không unique ✅
`src/messenger/messenger.service.ts:183`. `MsgContact.phone`/`User.phone` không unique/index. 2 khách (hoặc khách trùng SĐT với tài khoản test/nhân viên) → set sinh nhật ghi đè `dob` **mọi User trùng số**, xuyên store.
- **Sửa:** chỉ update khi khớp **duy nhất 1** User trong đúng store; hoặc bỏ auto-sync, chỉ lưu `MsgContact.dob`.

### I2. `onIncoming` fire-and-forget, không khoá theo hội thoại → AI trả lời trùng ✅
`src/messenger/messenger.service.ts` (~87) gọi `void ai?.onIncoming(conv.id)` mỗi tin IN, không await/không serialize. Khách nhắn 3 tin liên tiếp → 3 vòng `orchestrate` song song → AUTO gửi 3 câu trả lời chồng nhau (SHADOW tạo 3 suggestion trùng).
- **Sửa:** khoá theo `conversationId` (in-memory mutex / debounce), hoặc bỏ qua nếu đã có vòng đang chạy.

### I3. `updateStatus` không kiểm tra chuyển trạng thái hợp lệ → cộng doanh thu/soldCount lặp ⚠
`src/orders/orders.service.ts:1820+`. Chu kỳ DELIVERED→CANCELLED→DELIVERED cộng `totalSpent`/`soldCount` mỗi lần (chỉ commission có chặn re-credit ở 1913). Ghi rời, không transaction.
- **Sửa:** bảng transition hợp lệ + chặn re-credit cho totalSpent/soldCount (như commission) + bọc transaction.

### I4. `customerCancelOrder` không hoàn **variant stock** + không thả voucher, không transaction ⚠
`src/orders/orders.service.ts:2201`. Chỉ `+product.stockQuantity`, bỏ `ProductVariant.stock` (khác với `create()`/`cancelExpiredVietqrOrder` đều hoàn variant), voucher `isUsed` vẫn true.
- **Sửa:** hoàn cả variant stock + thả voucher + bọc `$transaction`.

### I5. Route `/api/admin/integrations/get-shop-id` KHÔNG có guard → lộ thông tin shop Pancake ✅
`frontend/src/app/api/admin/integrations/get-shop-id/route.ts` — `GET()` không `getSession()` (khác các route sync anh em). Bất kỳ ai gọi cũng nhận id/tên/SĐT/email/địa chỉ shop + **echo nguyên `errorText` upstream**.
- **Sửa:** thêm chặn `if (!session || session.role !== 'ADMIN') return 401` như `sync-products/route.ts`; bỏ trả `details: errorText` ra client.

### I6. Tra đơn lọc theo **JSON `metadata`** → full-scan bảng orders ✅
`src/orders/orders.service.ts:1546` `{path:'$.conversationId',equals}` (mở panel CCM mỗi lần); `webhooks.service.ts:669/798`, `vouchers.service.ts:196/343`, `voucher.processor.ts:27` dùng `string_contains` (→ `LIKE '%...%'`). Cột JSON không có generated column/index.
- **Hậu quả:** mỗi lần mở hội thoại / mỗi webhook VTP = full scan bảng `orders`; burst webhook làm nghẽn pool, rớt cập nhật giao/COD.
- **Sửa:** thêm cột thật `conversationId` (+ index) trên `Order` thay vì nhét trong metadata; tra vận đơn theo cột `orderCode`/cột riêng thay vì `string_contains` toàn JSON.

### I7. Idempotency tin nhắn: `findUnique(mid)`-rồi-`create` (race) + `mid` nullable ⚠
`src/messenger/messenger.service.ts:51,390`. Meta retry gửi trùng → 2 lần cùng qua check trước khi insert → 1 lần ném unique-constraint làm hỏng handler (Meta retry tiếp). Tin `mid=null` (echo/system) lọt guard, nhân bản.
- **Sửa:** `upsert` theo `mid` (bỏ findUnique-then-create); xử lý `mid` null riêng.

### I8. FE gọi backend sync KHÔNG kèm auth → tính năng đồng bộ Pancake **hỏng** ✅
`frontend/src/app/api/admin/integrations/sync-products/route.ts:18` (và `sync-categories`) sau khi check session lại `fetch` backend chỉ với `Content-Type` — không forward Cookie/Bearer. Backend endpoint **có** guard (`JwtAuthGuard,RolesGuard`) → gọi này nhận **401**, sync không bao giờ chạy.
- **Sửa:** forward cookie phiên (hoặc gọi qua `apiClientClient`/proxy) để backend nhận diện. (Đây là bug chức năng, không phải lỗ hổng.)

### I9. Refresh token đua giữa `proxy.ts` và `apiClientClient` → mất phiên giữa chừng ⚠
`frontend/src/lib/apiClientClient.ts:91`. Access hết hạn: middleware refresh (xoay cookie) đúng lúc client component 401 gọi `refreshSession()` với token đã cũ → backend từ chối → đăng xuất im lặng (đúng bug "mất phiên" từng gặp). Ngoài ra 403 (thiếu quyền) cũng kích refresh vô ích.
- **Sửa:** gộp refresh về **một nơi** (proxy hoặc client), phân biệt 401-refreshable vs 403-forbidden; đã ghi ở `changelog` như nợ kỹ thuật.

---

## 🟡 NÊN SỬA

- **M1. Tiền dùng `Float`** (schema: Order.subtotal/totalAmount/discountAmount, OrderItem.price, CommissionLedger.amount, User.totalSpent/commissionBalance…) → sai số cộng dồn, lệch cent khi đối soát COD VTP. **Sửa:** chuyển `Decimal` (migration đổi kiểu, rà code parse). ✅ (đã xác nhận nhiều cột `Float`).
- **M2. AUTO reply lỗi bị nuốt** sau khi `create_order` (`ai-agent.service.ts:76` `catch {}`) → đơn đã tạo nhưng khách không nhận xác nhận, không HANDOFF, không log. **Sửa:** lỗi reply → markError/HANDOFF + log. ⚠
- **M3. Orchestrate loop không có trần token tổng** (`anthropic.client.ts:40` chỉ cap mỗi call; loop 4 vòng resend history) → chi phí không kiểm soát với input xấu. **Sửa:** cộng dồn `usage`, dừng khi vượt `dailyTokenCap`. ⚠
- **M4. `FacebookService.refresh(id)` IDOR** (`facebook.service.ts:78`) — không check `storeId` như `disconnect`. Store A refresh token connection store B. **Sửa:** thêm check `c.storeId === effectiveStoreId`. ⚠
- **M5. `oauth-state.util.ts:12` fallback `'dev-secret'`** khi thiếu `META_APP_SECRET`/`JWT_SECRET` → giả mạo state (bind token vào store nạn nhân). **Sửa:** ném lỗi khi thiếu secret thay vì fallback. ⚠
- **M6. `window.open(permalink,'_blank')` thiếu `noopener` + không validate protocol** (`ccm/posts/page.tsx:121,126`; cùng lỗi `VietQRPaymentClient.tsx:133`) → reverse tab-nabbing, `javascript:` URL. **Sửa:** `window.open(url,'_blank','noopener,noreferrer')` + chỉ cho http(s). ⚠
- **M7. `OrderCard` tags dùng `useState(props)` không re-sync + nuốt lỗi PATCH** (`CcmCustomerPanel.tsx:113–116`) → hiện thẻ cũ sau reload, thao tác thất bại vẫn báo thành công. Kèm **M7b**: `CcmImagePicker.tsx:99` key theo `url` có thể trùng (blob vs R2) → chọn/gửi nhầm ảnh, gửi blob: cho Meta. **Sửa:** đọc lại từ props (bỏ state cục bộ hoặc `useEffect` đồng bộ), hiện lỗi khi PATCH fail; key ảnh theo id ổn định.
- **M8. dob `new Date('YYYY-MM-DD')` = UTC** (`messenger.service.ts:180`) → lệch 1 ngày ở VN (UTC+7). **Sửa:** lưu/parse theo local hoặc chỉ giữ chuỗi `YYYY-MM-DD`. ⚠

---

## ✂️ Cần rút gọn / viết lại (không phải bug, để dễ bảo trì)

- **G1. Gộp luồng "crediting khi giao thành công"** (totalSpent + soldCount + commission + referral) đang **lặp** ở `orders.service.updateStatus` và bị **thiếu** ở `webhooks.service` → tách 1 hàm dùng chung `applyDeliveredCredits(orderId, tx)`. Xử lý dứt C5 + I3 cùng lúc. **Đây là điểm "viết lại" đáng giá nhất.**
- **G2. Chuẩn hoá state-machine trạng thái đơn**: 1 bảng transition + 1 hàm `transition(order, next, tx)` gói mọi side-effect (credit/void) trong transaction → xoá rải rác logic ở create/updateStatus/customerCancel/webhook (dứt C1, C6, I3, I4).
- **G3. Bỏ lọc theo JSON metadata** cho dữ liệu truy vấn nóng (`conversationId`, mã vận đơn): nâng thành **cột thật + index** (dứt I6). metadata chỉ nên chứa dữ liệu hiển thị, không dùng để `WHERE`.
- **G4. Gộp refresh token về 1 nơi** (I9) — đang là nợ kỹ thuật ghi sẵn trong changelog.
- **G5. Cân nhắc `APP_GUARD` toàn cục** cho `JwtAuthGuard`+`PermissionsGuard`: hiện bảo vệ hoàn toàn theo từng controller `@UseGuards`; controller mới quên guard = hở mặc định (get-shop-id I5 là ví dụ). Access & refresh JWT hiện **dùng chung `JWT_SECRET`** (`jwt-refresh.strategy.ts:16`) — nên tách secret.

---

## ✅ Phần đã làm ĐÚNG (không cần sửa)
- Module **messenger** scope tốt: `getScopedConversation` ép `page.storeId === effectiveStoreId`.
- **orders** `findOne/findAdminOrders/findByConversation` đều lọc theo `effectiveStoreId`.
- **integrations.findAll/upsert** override `?storeId` bằng `effectiveStoreId` cho non-admin.
- Webhook **Messenger** (`x-hub-signature-256`) và **ViettelPost** đều dùng `timingSafeEqual` đúng.
- Dedup order-list ở `CcmCustomerPanel` theo SĐT thật của contact + merge theo `id` (đã sửa bug "3 đơn").
- `playSound` chỉ phát cho tin IN; optimistic `setStar` rollback qua `loadConversations()`.

---

### Ưu tiên triển khai đề xuất
1. **C1, C5, C6** (tiền/kho — mất mát thật) → làm cùng qua G1+G2.
2. **C3, C4, I5** (bảo mật xuyên tenant / payment forge / lộ PII).
3. **C2** (đổi cascade — 1 migration nhỏ).
4. **I1, I2, I6, I7** rồi tới nhóm 🟡.

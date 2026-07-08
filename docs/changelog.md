# 📜 CHANGELOG / NHẬT KÝ LÀM VIỆC — CRM netvietsoft

> Ghi lại các thay đổi đã làm theo phiên, để không mất ngữ cảnh khi khởi động lại.
> Đọc kèm: `first_readme.txt`, `docs/audit-report.md`.

---

## 2026-07-08 — Voucher theo Đơn hàng: vòng đời tạo/kích hoạt/hiển thị (feat lớn, đã merge + push main)

> Spec: `docs/superpowers/specs/2026-07-08-order-voucher-lifecycle-design.md` · Plan: `docs/superpowers/plans/2026-07-08-order-voucher-lifecycle.md` · Bản đồ nền: `docs/voucher-system-map.md`.
> Làm theo subagent-driven-development trên nhánh `feat/order-voucher-lifecycle` (13 task + review cuối opus fix 3 bug) → merge fast-forward vào `main`, đã push `origin/main` (`5e48995`). **Chưa deploy prod.**

**Yêu cầu nghiệp vụ (chốt với chủ dự án):** NV tự tạo voucher qua form dưới mỗi đơn (không auto-sinh); voucher tự vào ví khách trạng thái CHỜ ngay; chỉ **kích hoạt khi đơn giao thành công + COD ≥ ngưỡng (mặc định 100k, cấu hình được)**; cột duyệt **Auto/Manual** (Manual = admin bấm Duyệt); đơn hủy/hoàn/đổi/giao-thất-bại → **không kích hoạt**; mỗi đơn 1 voucher + QR riêng; QR = link xem trạng thái (bảo vệ đăng nhập); khách định danh SĐT + OTP lần đầu.

**Data model (migration `20260708100000_order_voucher_lifecycle`, additive):** `Voucher.approvalMode` (enum `ApprovalMode` AUTO|MANUAL); `UserVoucher.approvedAt/approvedById` + tập status chuẩn hoá `PENDING|WAITING_APPROVAL|ACTIVE|REJECTED`; `Order.isExchange`; `SystemConfig.order_voucher_config` = `{ codActivationThreshold }` (100000).

**Backend:**
- `VouchersService.syncOrderVoucherActivation(order)` — state machine: PENDING/WAITING_APPROVAL → ACTIVE | WAITING_APPROVAL | REJECTED. Điều kiện ACTIVE: `order.status ∈ {DELIVERED,PAYMENT_COLLECTED,COMPLETED}` + `totalAmount ≥ codThreshold` + `!isExchange`; MANUAL → WAITING_APPROVAL. Reject: `{CANCELLED,REFUNDED,RETURNING,EXCHANGING}` | isExchange | COD < ngưỡng. Idempotent (ACTIVE/REJECTED là chốt).
- Hook engine ở **3 nơi ghi status**: `orders.service.updateStatus` (admin), `webhooks.service` (webhook VTP), `viettelpost-sync.service.reconcileOpenOrders` (cron) — best-effort. `voucher.processor` (cron) delegate sang engine (lưới an toàn; UserVoucher tạo với `unlockAt=now`).
- `createOrderVoucher` +`approvalMode` + auto tạo `UserVoucher` PENDING theo `order.userId`. `getOrderVoucher` trả kèm `userVoucher`. `POST /vouchers/order-voucher/:userVoucherId/approve` (duyệt manual). `GET /vouchers/order-voucher-status/:orderCode` (scoped theo user). `order.isExchange` → prepend `[ĐƠN ĐỔI]` vào note + đẩy VTP.
- Định danh khách: `POST /auth/send-login-otp` + `/auth/otp-login` (tái dùng OTP; cookie đa subdomain; **chỉ role CUSTOMER**).

**Frontend:** form voucher admin (Auto/Manual + trạng thái ví khách + nút Duyệt) + ô "Đơn đổi" (OrderInfoClient); block "🎁 Voucher thưởng" ở chi tiết đơn khách; hồ sơ khách admin hiện status/nguồn + **fix bug hiển thị voucher % (`'PERCENTAGE'`→`'PERCENT'`)**; ví khách nhãn "⏳ Chờ cửa hàng duyệt"; trang `/portal/voucher-status` (bảo vệ portal layout); QR (ExportQRButton) trỏ trang status thay `campaign=qr_claim`; UI đăng nhập SĐT+OTP ở `/login`.

**Verify:** 20 unit test (state machine/threshold/approve/status) + 4 kịch bản E2E thật với DB local (AUTO→ACTIVE, MANUAL→WAITING_APPROVAL→ACTIVE, COD<100k→REJECTED, đơn đổi→REJECTED) + FE/BE tsc sạch + review cuối opus.

**Còn lại (minor, ngoài phạm vi):** E2 chưa auto edit-push VTP cho đơn đã đẩy (chỉ ghép note + prefill dialog); `handleUnlockVoucher` cũ (claim-QR) còn sót nhưng không dùng cho order-voucher. Deploy prod: migrate additive an toàn, nhớ `migrate status` (còn 3 migration 2026-07-06 nếu prod chưa chạy).

---

## 2026-07-07 — Bỏ UploadThing, chuyển toàn bộ upload ảnh sang R2

> **Nguyên nhân:** upload ảnh sản phẩm lỗi `Missing token — UPLOADTHING_TOKEN` (env chưa/không còn cấu hình token UploadThing v7). Chọn hướng tự chủ: dùng chung hệ upload R2 (đã có sẵn cho CCM), bỏ phụ thuộc SaaS ngoài.

- **BE** `upload.controller.ts`: thêm `POST /upload/review-image` — cho **mọi user đã đăng nhập** (không `@Roles` ⇒ RolesGuard cho qua; hợp với ảnh đánh giá của khách), validate ảnh + ≤8MB, đẩy R2 folder `reviews`, **không** ghi thư viện media dùng chung.
- **FE**:
  - `lib/uploadR2.ts`: thêm `uploadReviewImageToR2(file)`.
  - `ImageUpload.tsx` (ảnh sản phẩm/logo, admin): thay `useUploadThing` → `uploadToR2(file,'images')`; bỏ prop `endpoint` (sửa 2 chỗ gọi: ProductForm, StoreProfileForm).
  - `ReviewImageUploader.tsx` (ảnh đánh giá, khách): upload nhiều ảnh tuần tự qua `uploadReviewImageToR2`, state `isUploading` cục bộ.
  - **Xoá:** `lib/uploadthing.ts`, `app/api/uploadthing/{core,route}.ts`, `lib/jwt.ts` (orphan). Gỡ `uploadthing`+`@uploadthing/react` khỏi `package.json`.
  - `next.config.ts`: thêm host R2 `pub-…r2.dev` vào `remotePatterns` (giữ `uploadthing.com` để ảnh cũ vẫn hiển thị).
- **Không migrate dữ liệu**: ảnh cũ trên UploadThing vẫn hiển thị; ảnh mới đi R2. `UPLOADTHING_TOKEN` không còn cần.
- Verify: FE `tsc` + `next build` ✅; BE `nest build` ✅.
- ⚠️ **Deploy**: khi kéo lên VPS, `yarn install` (frontend) sẽ prune 2 package UploadThing; R2 env prod đã có sẵn (`R2_*` trong `backend-nestjs/.env.prod`).

### Dọn ảnh mồ côi R2 (chính sách B — xóa tức thì khi thay/gỡ ảnh)
- `R2Service`: thêm `keyFromUrl(url)` (tách key, bỏ qua URL ngoài R2) + `deleteObject(key)` (SigV4 DELETE, 404 coi như OK).
- `MediaCleanupService` (mới, `src/upload/media-cleanup.service.ts`): `deleteImageIfUnreferenced(url, {productId?})` — bỏ qua URL không thuộc R2; nếu còn **product khác** hoặc **store** nào trỏ tới URL → GIỮ; ngược lại xóa record `media_assets` + file R2. Best-effort (lỗi R2 chỉ log, không ném — không làm hỏng luồng lưu/xóa).
- Hook (server-side, chạy SAU khi commit — tránh xóa sớm khi user bấm Hủy):
  - `products.service.update` — khi `imageUrl` đổi → dọn ảnh cũ.
  - `products.service.remove` — sản phẩm bị xóa → dọn ảnh.
  - `stores.service.update` — khi `logoUrl` đổi → dọn logo cũ.
- Wiring: `UploadModule` export `MediaCleanupService`; `ProductsModule` + `StoresModule` import `UploadModule`.
- **Giới hạn đã biết**: kiểm tra tham chiếu chỉ soi `product.imageUrl` + `store.logoUrl` — KHÔNG soi ảnh đính kèm trong chat/nơi khác. Vì mỗi lần upload sinh file uuid riêng nên trùng thực tế hiếm; nếu sau này cần chặt hơn thì bổ sung điều kiện tham chiếu.

---

## 2026-07-06 — Reskin toàn bộ theo handoff + merge main + deploy production + fix login đa subdomain

> ✅ **ĐÃ COMMIT + MERGE main + PUSH origin/main + DEPLOY lên production (lestgoai.com).** Nhánh làm: `feat/ccm-redesign` → merge vào `main`. Gap thiết kế: `docs/design-gap-brief.md`, `docs/design-gap-crm-redesign.md`.

### A. Reskin CCM (cổng `/ccm`) theo `Newdesign/design_handoff_crm_ccm`
- Tokens CCM vào `globals.css` @theme (`--color-ccm-*`: brand `#3c55e6`, primary `#4f68ee`, app `#eef1f8`, chat `#f6f8fd`, active `#e9efff`, border `#e6e9f2`).
- Reskin 4 màn: **Hội thoại** (rail 60px + list 318px + panel 300px, bubble OUT `#4f68ee` radius `16 16 5 16`/IN trắng, header, composer + popover, OrderCard stepper), **Đơn hàng · Bài viết · Thống kê**. Giữ nguyên wiring (23+24 useState, mọi handler).
- **12 tab Cài đặt** reskin (layout sidebar 252px + general/tags/ai/quick-reply/shipping/interface + calls/rotation/sync/tools/permissions/history).
- **Rail icon đồng nhất**: thay 10 emoji → 10 SVG line lucide (message-square/mail/funnel/star/phone/phone-off/clock/calendar/globe/users).
- **Map (wire) phần thiết kế còn trống**: badge AI + chip 🎂 header (data sẵn có); **toggle giới tính** (cột MỚI `MsgContact.gender` + endpoint `POST /messenger/conversations/:id/contact-gender` + `setContactGender` sync `User.gender` khi SĐT khớp duy nhất; hook + FE nút xoay ♂/♀/⚧). Migration `20260704140000_msg_contact_gender`.

### B. Reskin toàn bộ CRM admin (`/admin`) theo `Newdesign/handoff_crm_redesign` (~23 màn)
- Tokens CRM vào @theme (`--color-crm-*`: primary `#2563eb`, app `#f7f8fb`, border `#eceef2`, th `#f9fafb`, zebra `#f7f9fc`, row-hover `#eff6ff`).
- **Lô 1**: Shell (Sidebar 248px + brand header + lucide icon + footer avatar; topbar ⌘K + menu avatar), Dashboard, Khách hàng, Đơn hàng, Sản phẩm.
- **Lô 2**: Chi tiết khách/đơn, CustomerSearch (chips) + Actions, Kho&danh mục (MasterDataManager+CategoryTree), Voucher, Cửa hàng+Nguồn đơn, Nhân viên+Ranks, Vòng quay, Hoa hồng/Referral, Analytics/PnL+ad-map, System (QR/my-store).
- **Lô 3** (khổng lồ): **Ads Meta** (AdsDashboard 2 view + KPI tuỳ chỉnh + cây campaign), **Khách hàng Viettel 5 tab** (+ `_ui.tsx` tab bar, tạo đơn, chi tiết), **CSKH 7 tab** (14 file SMS suite).
- Giữ nguyên wiring toàn bộ; FE typecheck sạch. Vài chỗ wire thêm bằng endpoint sẵn có: toggle voucher (`PATCH /vouchers/:id`), inline ±/Lưu tỉ lệ vòng quay (`PUT /spin/admin/prizes/:id`), permissions matrix controlled.
- **GAP** (thiết kế có, thiếu backend — giữ template, ghi trong `docs/design-gap-crm-redesign.md`): ⌘K palette, biểu đồ 7 ngày dashboard, duyệt hoa hồng, điều kiện vòng quay, role/status nhân viên, chi tiêu tháng ad-map, QR VietQR, ghi chú khách, Hủy/In vận đơn, banner/OAuth token Ads, 3 tab Viettel placeholder…

### C. Git + Deploy
- Commit `5bead69` (reskin + gộp audit-fix 07-04) → merge `06726a4` vào `main` (pull 6 commit deploy của remote, **0 conflict** — khác file). Push `origin/main`.
- Deploy production qua `deploy.sh` (git reset --hard origin/main + build-on-server + pm2). DB dev local gặp drift migration remote (`create_order_sources...`, `reconcile_schema_drift` báo 1050/1061) → `prisma migrate resolve --applied`.
- ⚠️ **3 migration mới cần `migrate deploy` trên DB prod**: `credits_applied`, `conversation_id`+**FK orders.user_id Cascade→SetNull**, `msg_contacts.gender`.

### D. Fix login production đa subdomain (commit `6b96ef9`)
- **Bug**: cookie auth set không có `Domain` → host-only `api.lestgoai.com` → middleware `proxy.ts` ở FE `lestgoai.com` không đọc được → login xong đá về `/login?returnTo=/admin` (loop).
- **Fix**: `auth.controller.ts` thêm `domain: process.env.COOKIE_DOMAIN` vào mọi `cookie()`/`clearCookie` (local undefined = host-only, giữ nguyên). Prod đặt `COOKIE_DOMAIN=.lestgoai.com` + `CORS=https://lestgoai.com,https://admin.lestgoai.com` trong `.env`. Sau đó `build` + `pm2 restart --update-env`. Verify: `set-cookie` có `Domain=.lestgoai.com` → vào `/admin` OK. Tài khoản admin prod: phone `0909090909`.

---

## 2026-07-04 (phiên audit-fix) — Sửa 15 lỗi 🔴+🟠 (tiền/đơn · bảo mật · DB)

> ⚠️ **CHƯA COMMIT** — trên `main`. Báo cáo nguồn: `docs/audit-report-2026-07-04.md`. Verify: tsc BE+FE sạch; jest xanh (trừ 1 test VietQR `expireOverdueVietqrOrders` **pre-existing** — fail y hệt trên HEAD sạch, không liên quan).
> **CẦN CHẠY `prisma migrate deploy` khi restart BE** (2 migration mới: `20260704120000_order_credits_applied`, `20260704130000_order_conversation_and_user_setnull`).

### Tiền/đơn (gộp G1+G2 — `orders.service.ts` + `webhooks.service.ts`)
- **C1**: `create()` — bọc trừ kho/voucher/commissionBalance + `order.create` trong 1 `$transaction` (lỗi giữa chừng → rollback hết).
- **C5+C6+I3**: tách `applyDeliveredCredits`/`revertDeliveredCredits` (idempotent qua cột mới `Order.creditsApplied`, bọc transaction) + `applyStatusSideEffects(orderId,status)` dùng chung. Webhook VTP DELIVERED/PAYMENT_COLLECTED/COMPLETED → cộng; CANCELLED/REFUNDED/**RETURNING** → đảo (sửa enum `'RETURNED'`→`'RETURNING'`). Hết cộng lặp khi đảo trạng thái.
- **I4**: `customerCancelOrder` — bọc transaction, hoàn **ProductVariant.stock** (không chỉ product) + thả voucher đã áp.

### Bảo mật
- **C3**: 3 endpoint `ai-agent.controller` (suggestions/config/pause + approve) nay verify quyền qua `messenger.assertConversationInStore` / `assertPageInStore` (thêm 2 method public) — chặn đọc draft/PII + đổi persona AUTO xuyên store. (Không cần thêm cột storeId.)
- **C4**: webhook Casso verify HMAC trên **raw body** (`req.rawBody`) thay vì `JSON.stringify`, so sánh **`timingSafeEqual`**.
- **I5**: route `/api/admin/integrations/get-shop-id` thêm guard ADMIN + bỏ leak `errorText`.
- **I8**: `sync-products`/`sync-categories` route gọi backend qua `apiClient` (forward token) — sync hết bị 401.
- **I9**: `apiClientClient` chỉ refresh khi **401** (bỏ 403) — hết mất phiên do xoay token thừa.

### DB / logic
- **C2**: `Order.userId` `onDelete: Cascade`→**`SetNull`** (xoá khách không xoá lịch sử đơn).
- **I6**: thêm cột thật **`Order.conversationId` + index** (backfill từ metadata); `findByConversation` + tạo đơn CCM dùng cột này thay vì lọc JSON (hết full-scan khi mở panel). *(Còn vài `string_contains` trackingCode ở webhook/voucher — tần suất thấp, chưa đổi.)*
- **I1**: `setContactDob` chỉ đồng bộ `User.dob` khi SĐT khớp **duy nhất 1** user (hết ghi đè nhầm).
- **I2**: `AiAgentService.onIncoming` khoá in-memory per-conversation (tin đến dồn dập không sinh reply trùng).
- **I7**: ingest tin nhắn bắt lỗi `P2002` khi `create` (Meta retry trùng `mid`) → bỏ qua, không tăng counter.

> 🟡 M1–M8 (Float→Decimal, AUTO reply nuốt lỗi, token cap…) **ngoài phạm vi** đợt này (chọn 🔴+🟠).

---

## 2026-07-02 → 07-03 (phiên CCM tiếp) — Sao ưu tiên · Sinh nhật · Icon Pancake · Bài viết/Thống kê thật · Biến #{} · Ảnh R2 · Polish

> ⚠️ **CHƯA COMMIT** — nối tiếp working tree trên `main`. Chi tiết feature-map: `docs/09-ccm-workspace.md`.

### A. Sao ưu tiên (star) trên avatar — list + 3A
- List hội thoại + avatar 3A: **ngôi sao** trên avatar, nhân viên bấm để đánh dấu ưu tiên, xoay vòng **trắng → vàng → xanh → đỏ → tắt** (`nextStar()`, `STAR_COLORS`). Sao trắng = opacity 50%; cỡ **25px** cả 2 nơi. Rail thêm bộ lọc ★ (chỉ hiện hội thoại có sao).
- BE: `POST /messenger/conversations/:id/star` + `messenger.service.setStar`; cột `MsgConversation.star` (migration `20260702090000_conversation_star`). `setStar` optimistic ở `useMessengerChat`.

### B. Sinh nhật khách (🎂) trên 3A
- Icon 🎂 ở hàng icon 3A → mở date-picker (dd/mm/yyyy), chữ đen; lưu ngày sinh khách, **đồng bộ vào hồ sơ/ds khách** (User.dob) khi khớp SĐT.
- BE: `POST /messenger/conversations/:id/contact-dob` + `setContactDob` (ghi `MsgContact.dob`, sync `User.dob`); cột `MsgContact.dob` (migration `20260702100000_contact_dob`).

### C. Thay icon header bằng SVG Pancake thật
- Copy 16 SVG Pancake vào `frontend/public/ccm-icons/`; thay các icon emoji ở header 3A khớp sạch (🔗 share, giới tính, 🎂 cake, phân công user_circle_plus, toggle panel apps-list-detail). Rail giữ emoji (SVG màu chọi nền xanh).

### D. Bài viết `/ccm/posts` — lấy THẬT (Graph API)
- Bỏ mock; `GET /messenger/pages/:externalId/posts` (`meta-messenger.client.fetchPagePosts` dùng `published_posts` + page token) → `messenger.service.listPagePosts`.
- Giữ layout template (panel lọc trái) + chọn page + **ô tìm 250px** + lọc **Từ ngày → Đến ngày** (client theo `createdTime`).
- Mỗi bài: ảnh + text **bấm mở URL bài viết** (permalink, tab mới); hàng **`ID: …` + icon ⧉ copy**.

### E. Thống kê `/ccm/stats` + `/stats/pages` — số liệu thật
- `GET /messenger/stats?days=` (`messenger.service.stats`) — đếm tin/hội thoại thật N ngày gần đây thay số mock.

### F. Composer — chèn sản phẩm thật (3C) + biến #{}
- Icon 🛍️ mở popup có **ô search sản phẩm** → `GET /products/search` (debounce), hiện ảnh+tên+giá, click chèn `Tên - Giá đ`.
- **Trả lời nhanh (⚡)**: editor đa nội dung (chủ đề → phím tắt → nhiều nội dung: ảnh/file/emoji/sản phẩm/biến) + ô search chủ đề. Khi gửi **resolve biến `#{...}`** (`lib/resolveVars.ts`): tên khách/nhân viên/ngày, `#SEX{a|b|c}`, spin `#{a|b}`, `#{TODAY(DD/MM/YYYY)}`.

### G. Ảnh/tài liệu đẩy R2 (thay UploadThing)
- `lib/uploadR2.ts` `uploadToR2(file, folder)` → `POST /upload/media` (module `src/upload/` ký AWS SigV4 tay, không SDK) + `GET /upload/media/list`. Cấu hình R2 lấy từ NovelApp. `CcmImagePicker` = thư viện media dùng chung (list từ BE, yêu thích ở localStorage). Model `MediaAsset` (migration `20260701130000_media_assets`).

### H. Polish khác
- Popup 📅 rail (Lọc theo ngày + nội dung): 3 ô **Từ ngày / Đến ngày / Nội dung-tên-SĐT** để **chữ đen** (`text-gray-900`).
- `/admin/*`: nền menu phải + top bar → `#f0f2f5` (AdminHeader/AdminSidebar).
- `/admin/viettel-customers/customers`: **Xuất Excel ⬇** (icon ở thẻ "Số khách") + chân trang phân trang (chọn 10/20/50/100/200, mặc định **50**). Sửa lỗi key trùng `${status}-${i}`.

### Verify
- Typecheck FE+BE sạch từng bước; BE restart boot sạch (routes `/messenger/*`, `/upload/*` live). Migration đã `migrate deploy`.

---

## 2026-07-01 (phiên AI) — AI chốt đơn qua chat CCM (khung, chạy mock)

> ⚠️ **CHƯA COMMIT** (working tree, trên main). Spec: `docs/superpowers/specs/2026-07-01-ai-chot-don-chat-design.md`; plan: `docs/superpowers/plans/2026-07-01-ai-chot-don-chat.md`. Thực thi kiểu subagent-driven (implementer/task).
> Cần **`ANTHROPIC_API_KEY`** để chạy thật (đã thêm placeholder rỗng vào `.env`); thiếu key → AI tắt êm, chat tay vẫn chạy.

### Module BE mới `src/ai-agent/` (không cài SDK — dùng fetch)
- **`anthropic.client.ts`** — gọi Anthropic Messages API bằng `fetch` (`x-api-key`, `anthropic-version`), parse text + tool_use; `isEnabled()`; tắt êm khi thiếu key.
- **`ai-tools.ts`** — `AI_TOOLS` (search_products / create_order / request_handoff / add_labels) + `AiToolsService.handle`. `create_order` chỉ chạy khi `input.customerConfirmed===true`; hỗ trợ `dryRun` (SHADOW không tạo đơn thật, chỉ trả orderDraft).
- **`ai-agent.service.ts`** — `onIncoming` (guard: enabled/mode, state ACTIVE, tin cuối IN, cửa sổ 24h) + `orchestrate` (vòng lặp Claude+tools, AUTO gửi reply thật + tạo đơn PENDING, SHADOW lưu `AiSuggestion`). `DEFAULT_PERSONA` ép quy tắc "nhắc lại đơn + xin xác nhận trước khi chốt". Lỗi Claude → `markError` (gắn nhãn "AI lỗi" + HANDOFF).
- **`ai-agent.controller.ts`** — `GET/PUT /ai-agent/config` (theo page + cờ `configured`), `GET /ai-agent/suggestions`, `POST /ai-agent/suggestions/:id/approve` (gửi reply + tạo đơn từ draft), `POST /ai-agent/conversations/:id/pause`.
- **DI**: cắt vòng Messenger↔AiAgent — MessengerService lấy `AiAgentService` qua `ModuleRef` lúc chạy (không inject constructor); AiAgentModule import MessengerModule một chiều.
- **Hook**: `messenger.service.handleMessaging` sau emit realtime → `if (IN) moduleRef.get(AiAgentService).onIncoming(conv.id)` (fire-and-forget).

### DB
- Model + migration `20260701140000_ai_agent`: `ai_agent_configs` (per page: enabled/mode/persona/dailyTokenCap), `ai_conversation_states` (status ACTIVE|HANDOFF|PAUSED, slots, tokensToday), `ai_suggestions` (shadow/audit). Đơn AI = Order PENDING + `metadata.aiGenerated/source=CCM_AI` (không đổi schema Order).

### FE
- **`/ccm/settings/ai`**: chọn page + bật/tắt + mode (OFF/SHADOW/AUTO) + persona + trần token; cảnh báo khi thiếu key.
- **Khu chat**: thẻ **Gợi ý AI (shadow)** trên composer (Gửi/Sửa/Bỏ) + nút **🤖⏸ Tiếp quản** (tạm dừng AI).

### Test/verify
- Jest ai-agent: 13 pass (client/tools/orchestrator, mock Claude). Typecheck BE+FE sạch. BE boot sạch, routes `/ai-agent/*` live.

### Chưa làm / follow-up
- Chạy thật (cần key) + rollout Shadow→Auto (Task 11).
- Token cap accounting theo ngày (mới có guard cơ bản), size chart nguồn dữ liệu, đẩy Viettel (v2).

---

## 2026-07-01 (phiên CCM) — Đơn hàng/Viettel · Thẻ · Header · Rail lọc · Cài đặt (nối chat) · Âm báo · Thư mục ảnh

> ⚠️ **CHƯA COMMIT** — toàn bộ thay đổi phiên này còn trong working tree. Chi tiết feature-map: `docs/09-ccm-workspace.md`.
> Nguyên tắc: **tái dùng backend có sẵn**, chỉ thêm vài endpoint nhỏ; phần chưa có model → **template hoặc lưu localStorage**.

### A. CCM Tạo đơn + Danh sách đơn (nối orders CRM thật)
- **Form "Tạo đơn"** (`components/ccm/CcmCustomerPanel.tsx` FRAME 4C): picker sản phẩm `GET /products/search` + thanh toán + `POST /orders/admin` (guest order, `metadata.source=CCM`, `conversationId`, `psid`). Tab **Thông tin** hiện đơn THẬT của khách.
- **`/ccm/orders`**: bảng `GET /orders/admin` (lọc trạng thái/tìm/phân trang) + nút 🚚 Đẩy VTP mỗi dòng.
- **Thẻ đơn chi tiết** (FRAME 4B): mã/luồng trạng thái/người nhận/địa chỉ/SP/tổng/giờ/ghi chú + badge VTP + mã vận đơn (kiểu Pancake).
- **BE thêm** (`orders.controller`+`orders.service`): `GET /orders/by-conversation/:id` (lọc `metadata.conversationId`); `PATCH /orders/:id/carrier-info` (ghi `metadata.carrier`); `updateAdminFields` nhận thêm `customerTags`.
- Sửa lỗi: đơn tạo xong không hiện (do tra theo SĐT contact rỗng) → nay tra theo **conversationId** + gộp theo SĐT thật của contact (không dùng số gõ tay → hết kéo nhầm đơn khách khác trùng số).

### B. Đẩy Viettel Post (`components/ccm/CcmViettelPushDialog.tsx`)
- Dialog: chọn tỉnh/huyện/xã VTP (`/viettelpost/address/*`, có toggle "địa danh mới") → tra cước `POST /viettelpost/price` → chọn dịch vụ → **đẩy** `POST /viettelpost/orders`. Liên kết CRM↔VTP qua `orderReference = orderCode`; đẩy xong ghi mã vận đơn về `metadata.carrier`.
- Thẻ đơn hiện **trạng thái giao hàng LIVE** từ `GET /viettelpost/customers/:code` (statusName, chấm đỏ).

### C. Cài đặt ĐVVC (`app/ccm/settings/shipping/page.tsx`)
- Viettel Post = read-only từ **`GET /viettelpost/config`** (BE mới, che SĐT sender, không lộ user/pass); 17 hãng khác = template "chưa tích hợp".

### D. Hệ thống Thẻ (order/customer tags)
- `CcmCustomerPanel`: catalog `ORDER_TAGS`/`CUSTOMER_TAGS` + `TagPicker`; lưu `metadata.tags`/`metadata.customerTags` qua `PATCH /orders/:id/admin-update`.

### E. Chat header (FRAME 3A) dựng lại kiểu Pancake
- [3A-L] avatar+tên+👁 phụ trách+📞+nhãn, hàng icon nhỏ 🔗🕐👤🎂 (có tooltip).
- [3A-R] 4 icon: **👤⁺ Phân công NV** (dropdown chọn NV thật — BE mới `POST /messenger/conversations/:id/assign-user` + `messenger.service.assignToUser`, hook `useMessengerChat.assignTo`+`staff` từ `/admin/staff/members`) · ☷ Tất cả HT khách · 🏷️ Nhãn (picker từ catalog thẻ) · ▭ Thông tin (bật/tắt Cột 4).

### F. Cột 1 = RAIL LỌC danh sách hội thoại (client-side)
- 💬 Tất cả · 💭 Chưa đọc · ✉️ Lọc tin nhắn(AI template) · ★(template) · 📞 Có SĐT · 📵 Không SĐT · 🕐 Chưa trả lời(+3 sort) · 📅/🗂️(template) · 👥 Lọc nhân viên(multi-select). Áp qua `visibleConversations` + chip lọc + Xoá lọc.

### G. Cài đặt NỐI THẲNG vào chat (`lib/useCcmSettings.ts` — store localStorage + pub/sub)
- **Hỗ trợ trả lời** (`settings/quick-reply`): CRUD mẫu → composer ⚡ đọc trực tiếp.
- **Thẻ hội thoại** (`settings/tags`): CRUD catalog (name+màu) → picker 🏷️ + màu chip ở list.
- **Giao diện** (`settings/interface`): prefs (hiện NV phụ trách / SĐT / tên thẻ đầy đủ) → list đọc live.
- **Cài đặt chung** (`settings/page`): **âm báo THẬT** (`lib/ccmSounds.ts` — Web Audio, 6 âm, nghe thử) + bật/tắt; `useMessengerChat` phát âm khi có tin realtime.

### H. Thư mục ảnh (`components/ccm/CcmImagePicker.tsx`)
- Nút 🖼️ mở popup kiểu Pancake: upload nhiều ảnh qua **UploadThing** (`productImage`), "gần đây"/"yêu thích" (localStorage), chọn nhiều (badge số) → gửi từng ảnh qua `reply({attachmentUrl})`.

### CÒN LẠI (chưa làm — cần backend)
- **Phân quyền**: wire được (có `User.staffPermissions` + `/admin/staff/members`) — cần thêm `PATCH /admin/staff/:id/permissions`.
- **Chế độ xoay vòng**: cần model config + engine auto-assign.
- **Lịch sử**: có model `MessageAuditLog` nhưng chưa có endpoint + chưa ghi log.
- Dữ liệu quick-reply/thẻ/prefs/ảnh đang lưu **localStorage** (theo trình duyệt) — chuyển sang bảng backend khi cần dùng chung team.

---

## 2026-06-30 (phiên 3) — Meta Ads nâng cấp · Messenger Inbox · Pancake UI templates

> ⚠️ **Vị trí code:** các thay đổi backend + FE (trừ template Pancake) đã commit trên nhánh **`fix/meta-ads-module`** (`439fff2`, `e55dd8f`, `ae601ba`), **chưa merge vào `main`**. Template Pancake (`/pancake/*`) hiện còn **untracked** trong working tree. → Cần merge/đồng bộ nhánh.

### A. Meta Ads — nâng cấp (commit 439fff2)
- **Scope đa cửa hàng** (quy tắc #4): `AdsController` thêm `PermissionsGuard` + `@Permissions(INTEGRATIONS_*)` + `@GetEffectiveStoreId()`; service scope qua `account.storeId`. `getConfig`→`getConfigs()` (mỗi store 1 credentials); sync gắn `store_id` cho account.
- **Queue**: `POST /ads/sync` đẩy job vào BullMQ `ads-sync` (Redis trống → fallback inline). Processor `ads-sync.processor.ts`.
- **Tiền tệ**: quy đổi minor-unit theo currency (`minorFactor`: USD ÷100, VND ÷1, BHD ÷1000) cho budget/balance/amount_spent/spend_cap; spend insights giữ nguyên.
- **Cột giàu dữ liệu** AdAccount (accountStatus/balance/amountSpent/spendCap/fundingSource/business…) + model **AdBusiness** (BM). Migration `20260630140000_ad_rich_pages_bm`, `20260630180000_ad_funding_details`.

### B. Meta Ads — restructure URL + danh sách tài khoản + Fanpage (commit e55dd8f)
- URL mới: **`/admin/adsmeta/accall`** (bảng danh sách tài khoản) + **`/admin/adsmeta/[accountId]`** (dashboard); **`/admin/ads`** → redirect. Sidebar `AdsSidebarMenu` cập nhật.
- Bảng tài khoản (`AdsAccountsList`): Status · Cách thanh toán (`funding_source_details.display_string`) · Tiền tệ · Dư nợ · Limit · Đã tiêu · Loại TK (BM/CN) — header tối + sort. Cột `fundingDetails Json` trên AdAccount.
- **Menu Fanpage** (`/admin/adsmeta/pages`, `AdsPagesList`): list page + **7 quyền (tasks)** ADVERTISE/ANALYZE/CREATE_CONTENT/MESSAGING/MODERATE/MANAGE/VIEW_MONETIZATION_INSIGHTS. Endpoint `GET /ads/pages`; model `AdPage` mở rộng (tasks/fanCount/link/verification…). Migration `20260630190000_ad_page_fields`. Sync page gộp vào `/ads/sync`.

### C. Messenger Inbox — chat với khách của Page (commit e55dd8f + ae601ba)
- Module `src/messenger`: model `msg_pages/contacts/conversations/messages` (migration `20260701090000_messenger_inbox`, `20260701100000_messenger_assign_labels`). Quyền `MESSENGER_VIEW/SEND`.
- Webhook (PUBLIC) verify chữ ký `X-Hub-Signature-256` (raw body, `rawBody:true` ở main.ts) → ingest idempotent theo `mid`. Realtime qua gateway `admin-notifications` (`messenger:message`).
- REST scope đa cửa hàng; **reply** Send API (chặn ngoài cửa sổ 24h, gửi ảnh URL); subscribe/backfill/register page. **GĐ3**: tìm kiếm, gán nhân viên (assignedUserId), nhãn (labels).
- FE `/admin/messenger` (3 cột). Spec/plan: `docs/superpowers/specs|plans/2026-06-30-messenger-inbox*`.

### D. Pancake UI templates (chưa commit — `/pancake/*`)
- Workspace full-screen kiểu Pancake (top-nav riêng, auth như admin): **Hội thoại · Đơn hàng · Bài viết · Thống kê (9 trang) · Cài đặt (11 trang)**. Toàn bộ là **template mock** (UI kit `components/pancake/ui.tsx`, biểu đồ SVG tự vẽ) — sẽ ghép logic từng phần sau. Chi tiết: `docs/09-pancake-workspace.md`.

---

## 2026-06-30 — Tính năng: Phân tích Lãi/Lỗ sản phẩm (Phase 1)
- Module mới `src/analytics`: `GET /analytics/product-pnl`, `GET/PUT /analytics/ad-map`. Bảng mới `AdProductMap` (map campaign Meta → sản phẩm, migration `20260630200000_add_ad_product_map`, áp DB thủ công như các lần trước).
- Công thức: doanh thu = đơn COD đã thu (PAYMENT_COLLECTED/COMPLETED), ngày = paidAt??updatedAt (gom theo ngày UTC); cost = `productionPrice`×qty; quảng cáo = AdInsight.spend của campaign đã map; vận hành = 0 (Phase 2). Hàm thuần `buildPnlReport` (`src/analytics/pnl.util.ts`) + unit test PASS.
- Đơn item không có productId (Pancake/Viettel) → khớp theo tên SP chuẩn hoá; không khớp → nhóm "Chưa khớp". Sản phẩm thiếu Giá sản xuất → cảnh báo ⚠.
- FE: nhóm "Phân tích" → 2 màn `/admin/analytics` (Lãi/Lỗ, lọc kỳ/nguồn + bung theo ngày) + `/admin/analytics/ad-mapping` (gán campaign→SP). Spec/plan: `docs/superpowers/{specs,plans}/2026-06-30-product-pnl-analytics*`.
- ✅ Đã chạy `prisma generate` (dừng BE → generate → khởi động lại nest watch) — giải quyết luôn việc treo của `productionPrice` ở mục dưới.
- Phase 2 (sau): Google Ads, chi phí vận hành (bảng riêng), map adset/ad, precompute hằng đêm.

## 2026-06-30 — Meta Ads Dashboard UI (drill-down, cột động, kéo–thả) + nền tảng Thống kê tiền hàng Viettel

> Chi tiết tính năng: `docs/08-ads-dashboard-ui.md`.

### Frontend — `components/admin/AdsDashboard.tsx` (trang `/admin/adsmeta/*`)
- **Dashboard KPI**: lưới 7 cột; mặc định Chi tiêu · Kết quả · Tổng giá trị lượt mua · Avg ROAS ·
  Avg Ads Cost · Avg CP/kết quả · Hiển thị · Click · CTR. Popup **⚙ Chỉ số** (13 loại) tích chọn +
  **kéo–thả** thẻ để sắp xếp. Lưu `localStorage` (`adsDash.kpis.v1`).
- **Bộ lọc**: thêm nút nhanh **Hôm nay/Hôm qua/Tuần này/Tuần trước/Tháng này/Quý này/Tất cả**
  (active tô xanh `#375DED`); **mặc định = Hôm nay**.
- **Bảng chiến dịch**: header nền `#375DED` chữ trắng đậm, sọc `#F5F9FC`, hover `#EBEBEB`.
  - **Drill-down 3 cấp**: chiến dịch → nhóm QC → quảng cáo (lazy-load, thụt lề).
  - **Sort** mọi cột (▲/▼). **Kéo–thả cột** đổi vị trí ("Chiến dịch" ghim đầu).
  - **Ẩn/hiện cột** qua popup ⚙ Cột (nhóm Cơ bản / Chỉ số FB). Lưu `localStorage` (`adsDash.cols.v1`).
  - **Cột động**: 1 cột cho mỗi `action_type` FB; **cột Giá trị mua / ROAS / % Ads Cost**;
    cột "Kết quả" hiện **nhãn loại** (Lượt mua/Tin nhắn…).
  - **Menu thao tác dòng** (⋯): Sao chép ID · Mở Meta Ads Manager.

### Backend — `src/integrations/ads`
- `ads.service`: gộp `actions`/`actionValues` (JSON) theo từng `action_type` (`aggregateByKey` +
  `sumActions`/`sumActionValues`); suy `resultType`; tính `purchaseValue` (dedup ưu tiên
  `omni_purchase`→pixel→purchase…), `roas`, `adsCostPct`. `/ads/summary` bổ sung 3 chỉ số này.
- Endpoint mới: `GET /ads/campaigns/:id/adsets`, `GET /ads/adsets/:id/ads` (cùng shape `/ads/campaigns`).

### Backend — Viettel Thống kê tiền hàng (FE chưa làm)
- DB: cột `send_date` (từ `ORDER_SYSTEMDATE`) + index trên `viettel_customers`
  (migration `20260630150000_add_viettel_send_date`). Gán khi sync (webhook + enrich).
- Script backfill `scripts/backfill-viettel-send-date.ts` (19 dòng cập nhật, dùng Prisma + parseDate
  để đồng nhất timezone với truy vấn).
- Endpoint `GET /viettelpost/revenue-stats?from&to` → gộp count/cod/fee theo trạng thái + tổng
  (lọc theo ngày gửi, bỏ DRAFT). Test `viettel-customer.revenue.spec.ts`. Spec:
  `docs/superpowers/specs/2026-06-30-viettel-revenue-stats-design.md`.

### Khác
- Sidebar (`AdminSidebar.tsx`): rộng `w-64`; nhãn nhóm màu `#2140da` in đậm; `isActive` khớp tiền tố
  dài nhất (route cha không sáng cùng route con).
- Viettel modal "Sửa KH" (`viettel-customers/customers/page.tsx`): không đóng khi click nền.

### ⚙ Vận hành
- `corepack yarn@stable` **lỗi offline** (TLS) → chạy binary local `node_modules/.bin/nest.cmd` /
  `next.cmd`. CRM backend chạy `nest start` (không `--watch`) cho ổn định; sửa BE xong restart tay.

## 2026-06-30 — Sửa form sản phẩm: giá sản xuất + định dạng số + thu gọn slug

### Backend
- **DB**: thêm cột `production_price DOUBLE NULL` trên `products` (Prisma: `productionPrice Float? @map("production_price")`).
  - ⚠ KHÔNG dùng được `prisma migrate dev`: 2 migration trùng timestamp `20260630140000` (`add_viettel_cod_pay_status` + `ad_rich_pages_bm`) → shadow DB replay sai thứ tự (P3006/`viettel_customers` not found). DB **thật** vẫn "up to date".
  - Cách đã làm: tạo file `prisma/migrations/20260630190000_add_production_price/migration.sql` (ALTER thủ công) → `prisma db execute` áp vào DB thật → `prisma migrate resolve --applied` ghi nhận. Cột đã tồn tại trong DB.
- **DTO**: `CreateProductDto` thêm `productionPrice?` (`@IsOptional @IsNumber @Min(0)`); `UpdateProductDto` kế thừa qua PartialType. Service `create`/`update` spread `...productData` nên field tự lưu, không sửa thêm.

### ✅ ĐÃ XONG `prisma generate` (cập nhật cùng ngày)
- Đã dừng BE → `npx prisma generate` → khởi động lại nest watch (kèm Phase 1 Phân tích Lãi/Lỗ ở mục trên). Prisma client đã nhận `productionPrice` (và `AdProductMap`). PATCH/POST `/products` kèm `productionPrice` chạy bình thường.

### Frontend — `components/admin/ProductForm.tsx` (dùng chung tạo + sửa SP)
- **Định dạng số (giá)**: 3 ô giá (gốc/sản xuất/sale) + ô giá biến thể đổi `type=number` → `type=text inputMode=numeric`, hiển thị **ngăn nghìn dấu chấm kiểu VN, KHÔNG thập phân** (helper `formatPriceInput`/`onlyDigits`, `Intl.NumberFormat('vi-VN')`), căn phải. State lưu chuỗi chữ số thô; `parseFloat` lúc submit. Trọng lượng/Tồn kho giữ `type=number`.
- **Ô Giá sản xuất (MỚI)**: nằm giữa Giá gốc và Giá sale. Khối giá tách lại: hàng tiền `md:grid-cols-3` (gốc/sản xuất/sale), hàng kho vận `grid-cols-2` (trọng lượng/tồn kho).
- **Slug thu gọn**: `max-w-xs`, `text-xs`, padding nhỏ, label xám nhạt (đỡ chiếm chỗ).
- Types thêm `productionPrice` ở: `ProductForm` (3 interface + state init + payload submit), `[id]/EditProductClient.tsx` (`ProductFormProduct` + `ProductSubmitPayload`), `create-product/CreateProductClient.tsx` (`ProductSubmitPayload`). Trang `[id]/page.tsx` fetch `/products/:id` typed `ProductFormProduct` → tự nhận field.

## 2026-06-30 — ViettelPost: đồng bộ trạng thái thanh toán COD (đối soát)

### Vấn đề
- Trạng thái đối soát COD (đã nhận tiền hay chưa) KHÔNG có trên API partner `partner.viettelpost.vn/v2`, chỉ có ở portal `viettelpost.vn`.

### Giải pháp (`ViettelpostCodService`)
- Gọi `POST https://api.viettelpost.vn/api/supperapp/get-list-order-by-status-v2` (`SOURCE:'WEB'`) bằng **token WEB/SSO** — backend không tự mint được (login USER/PASS chỉ ra token MOBILE bị từ chối) → **admin dán token** từ DevTools portal, lưu `SystemConfig.VIETTEL_WEB_TOKEN`. Đọc hạn từ claim `exp` của JWT.
- `syncCodStatuses(180 ngày)`: map `ORDER_NUMBER`↔`trackingCode` (bỏ `DRAFT-`) → ghi `codPayStatus`/`codPayStatusName`/`codPaySyncedAt` vào `viettel_customers`. COD_STATUS: `KHONG_CO_COD|CHUA_NHAN_COD|CHO_NHAN_COD|DA_NHAN_COD`. Token hết hạn → `{tokenExpired:true}`.
- Endpoints (controller): `GET /api/viettelpost/cod-token` · `POST /api/viettelpost/cod-token {token}` (ADMIN) · `POST /api/viettelpost/cod-sync`. Cron mỗi giờ (`VIETTEL_COD_SYNC=false` để tắt; `VIETTEL_COD_SYNC_CRON` đổi lịch) — chỉ chạy khi có token & chưa hết hạn.
- DB: thêm cột `codPayStatus`/`codPayStatusName`/`codPaySyncedAt` trên `viettel_customers`.

## 2026-06-30 — Tính năng mới: kéo TOÀN BỘ Meta (Facebook) Ads về CRM

### Mục tiêu
Đồng bộ tất cả chiến dịch + chỉ số tài khoản quảng cáo Meta về CRM, lưu kèm JSON gốc đầy đủ để AI phân tích sau (không bỏ sót field). Thiết kế chuẩn hoá để cắm thêm nền tảng (Google/TikTok/Zalo) sau. Spec: `docs/superpowers/specs/2026-06-30-meta-ads-ingestion-design.md`.

### DB (5 bảng mới — migration `20260630120000_add_ad_tables`, chỉ thêm bảng)
- `ad_accounts`, `ad_campaigns`, `ad_sets`, `ads`, `ad_insights`. Mỗi bảng có cột `raw Json` = payload gốc. `ad_insights` lưu chỉ số **theo NGÀY** mọi cấp (campaign/adset/ad), unique `(platform, level, entity_external_id, date)`. Tiền dùng `Float`, lượt dùng `Int` (theo convention dự án).

### Backend (`src/integrations/ads/`)
- `meta/meta-ads.client.ts` — Graph API v21 + tự phân trang. `meta/meta-ads.connector.ts` — kéo account/campaign/adset/ad + insights theo ngày, map chuẩn hoá, suy `results`/`cost-per-result` từ `actions`.
- `ads-sync.service.ts` — `syncAll(90 ngày)` upsert idempotent; `@Cron` mỗi 3h (tắt bằng env `ADS_SYNC_ENABLED=false`).
- `ads.service.ts` + `ads.controller.ts` (`/api/ads`, guard ADMIN/MODERATOR): `POST /sync`, `GET /accounts|summary|campaigns|campaigns/:id/insights`.
- `AdsModule` đăng ký trong `app.module.ts`.

### Credentials (qua trang Kết nối) — hỗ trợ NHIỀU tài khoản / Business Manager
- Cấu hình ở **Hệ thống → Kết nối → thẻ Meta Ads**: Access Token (`ads_read`) + (tuỳ chọn) **Business ID** + (tuỳ chọn) **Ad Account ID** + bật Active. Lưu vào `StoreIntegration(platform='META_ADS')` (`accessToken` + `metadata.businessId` + `metadata.adAccountId`). Fallback env `META_ADS_ACCESS_TOKEN` / `META_ADS_BUSINESS_ID` / `META_ADS_ACCOUNT_ID`.
- **Liệt kê tài khoản** (connector `listAdAccounts`): danh sách `act_id` tường minh (ngăn cách phẩy) → nếu trống + có Business ID thì `{bm}/owned_ad_accounts` + `client_ad_accounts` → nếu trống thì `/me/adaccounts`. Sync **loop qua MỌI account**, kết quả trả `accounts` + `perAccount[]`. Thiếu token → `configured:false`, không crash.

### Frontend
- Trang **`/admin/ads`** ("Quảng cáo"): thẻ KPI + lọc tài khoản/khoảng ngày + nút Đồng bộ ngay + bảng campaign (dùng `lib/format.ts`). Đọc `?accountId=` để lọc theo tài khoản.
- **Sidebar menu cây** (`AdsSidebarMenu`): Quảng cáo → Meta Ads → BM → danh sách tài khoản (động từ `/ads/accounts`); click tài khoản → `/admin/ads?accountId=<id>`; "Tất cả tài khoản" → `/admin/ads`.
- Trang Kết nối + `[platform]` thêm nhận diện `META_ADS`. Type `IntegrationMetadata.adAccountId`.

### Verify
- Backend + Frontend `tsc --noEmit` sạch. Migration apply OK (5 bảng hiện trong DB). ⚠ Sync dữ liệu THẬT cần Access Token Meta + ad account id (chưa nhập → khung chạy, chưa có dữ liệu). ROAS (ghép spend↔doanh thu) ngoài phạm vi v1.

## 2026-06-30 — Admin UX: click dòng vào chi tiết/sửa + copy SĐT

### Khách hàng (`/admin/customers`)
- [CustomersTableClient.tsx](../frontend/src/components/admin/CustomersTableClient.tsx): click khoảng trống của dòng → `router.push('/admin/customers/{id}')` (cursor-pointer).
- Cột SĐT thành nút copy (icon `Copy` hiện khi hover) → bấm số tự copy + toast góc phải "✓ Đã copy Số: xxx".
- `stopPropagation` ở ô checkbox, nút copy SĐT, link "Chi tiết" → thao tác riêng, không kích hoạt mở chi tiết.

### Danh mục (`/admin/categories`)
- Categories KHÔNG có trang chi tiết riêng → sửa qua modal trong `CategoryRowActions`. Nâng state mở-modal lên [CategoryTree.tsx](../frontend/src/components/admin/CategoryTree.tsx) (`editId`), truyền xuống [CategoryRowActions.tsx](../frontend/src/components/admin/CategoryRowActions.tsx) dạng controlled (`editOpen`/`onEditOpenChange`, fallback nội bộ nếu không truyền).
- Click khoảng trống của dòng → mở modal "Sửa Danh mục". Ô hành động (Sửa/Xóa/mở rộng) `stopPropagation` để không kích hoạt 2 lần.

### Click dòng → sửa cho 7 trang quản trị khác
Cùng pattern (click khoảng trống dòng → mở sửa; `stopPropagation` ở ô nút/Select/link), gom theo component dùng chung:
- [MasterDataManager.tsx](../frontend/src/components/admin/MasterDataManager.tsx) → click dòng `openEditModal(item)`. Phủ **4 trang**: `/admin/order-sources`, `/admin/units`, `/admin/materials`, `/admin/suppliers`.
- [VoucherTableClient.tsx](../frontend/src/components/admin/VoucherTableClient.tsx) (`/admin/vouchers`) + [ReferralVoucherTable.tsx](../frontend/src/components/admin/ReferralVoucherTable.tsx) (`/admin/referral-vouchers`) → click dòng `setEditVoucher(voucher)` (modal `EditVoucherModal`).
- [OrderVouchersTableClient.tsx](../frontend/src/components/admin/OrderVouchersTableClient.tsx) (`/admin/order-vouchers`) → KHÔNG có modal; click dòng `router.push('/admin/orders/{orderId}?from=order-vouchers')` (chỉ khi có `orderId`). Chặn lan ở ô `Select` trạng thái + ô hành động + link mã đơn.

### Verify
- Frontend `tsc --noEmit`: sạch. Thuần đổi hành vi UI (không đụng endpoint/model).

## 2026-06-30 — Refactor: gom định dạng số về `lib/format.ts` (1 nguồn duy nhất)

### Vấn đề
- ~40 file FE tự viết `new Intl.NumberFormat('vi-VN', …)` cục bộ → trùng lặp, lệch kiểu (`đ` / `₫` / `VND`).
- 4 chỗ `toLocaleString()` THIẾU locale (`admin/page.tsx` ×2, `integrations/[platform]/page.tsx` ×2) → SSR (Node) có thể ra dấu phẩy `1,234,567` thay vì `1.234.567`.

### Fix
- Tạo `frontend/src/lib/format.ts` — nguồn duy nhất, 6 hàm (giữ NGUYÊN 6 kiểu output đang dùng): `formatNumber` (`1.234.567`), `formatVnd` (`… đ`), `formatVndTight` (`…đ`), `formatVndText` (`… VND`), `formatVndSymbol` (`… ₫`), `formatCompact` (`1,2 N`). Tất cả locale `vi-VN`, dấu CHẤM ngăn nghìn.
- ~40 file bỏ formatter cục bộ → import/delegate util; giữ nguyên tên helper & call-site (vd `const money = formatVnd`, hoặc wrapper 1 dòng) nên KHÔNG đổi output, KHÔNG đụng call-site.
- Sửa 4 chỗ `toLocaleString()` thiếu locale.
- Bổ sung quy tắc vào `docs/07-quy-tac-code.md` C.8 + `frontend/src/lib/README.md`.

### Verify
- `tsc --noEmit` sạch. Grep: không còn `new Intl.NumberFormat` ngoài `format.ts`; không còn `toLocaleString()` thiếu locale (date `toLocaleString('vi-VN')` giữ nguyên). Commit `b9492e0` (42 files).

## 2026-06-30 — Fix: địa chỉ người nhận VTP "lấy về" bị cụt (chỉ số nhà)

### Triệu chứng
- Trang `/admin/viettel-customers` cột **Địa chỉ** hiện cụt: `"57"`, `"."`, `"g21, Phước Tân Tổ 13"` — thiếu phường/quận/tỉnh.

### Root cause
- `viettel-customer.service.ts → enrichFromDetail()` (nhánh reconcile/enrich từ `order/detail-v2`) ưu tiên SAI:
  `RECEIVER_HOME_NO || RECEIVER_ADDRESS`. VTP trả CẢ HAI: `RECEIVER_HOME_NO` = số nhà (`"57"`),
  `RECEIVER_ADDRESS` = địa chỉ ĐẦY ĐỦ (`"57 Đường Đào Tấn, P.Bình Thuận, Q.Hải Châu, TP.Đà Nẵng"`).
  Vì home_no truthy nên luôn chọn số nhà, bỏ địa chỉ đầy đủ → lưu cụt.

### Fix
- Đảo thứ tự: `receiverAddress = RECEIVER_ADDRESS || RECEIVER_HOME_NO` (đầy đủ trước, số nhà chỉ là fallback).
- **Backfill** 16 dòng cũ từ `detailPayload.RECEIVER_ADDRESS` (mọi dòng enriched đều đã lưu sẵn full detail) — không cần gọi lại VTP.

### Verify
- Backend `tsc --noEmit`: sạch. Query DB sau fix: 6/6 dòng mẫu hiện địa chỉ đầy đủ. Xác minh `detail-v2?o=` trả `RECEIVER_ADDRESS` đầy đủ bằng token thật.

## 2026-06-30 — Form tạo đơn ViettelPost: địa danh mới + ghi chú mặc định + nháp/hủy

### Người nhận — toggle "Địa danh mới" (2 cấp, sau sáp nhập 1/7/2025)
- Công tắc trong card Người nhận: TẮT = hệ cũ 3 cấp (Tỉnh→Huyện→Xã, API cũ); BẬT = hệ mới 2 cấp **Tỉnh→Phường/Xã** (ẩn Quận/Huyện).
- Backend mới (v3, host `partner.viettelpost.vn/v3` qua `authService.getV3`):
  - `GET /api/viettelpost/address/provinces-new` → `categories/listProvinceNew`.
  - `GET /api/viettelpost/address/wards-new?provinceId=` → **`categories/listWardsNew?provinceId=`** (đã XÁC MINH với API thật: trả `{WARDS_ID, WARDS_NAME, PROVINCE_ID}`, xã gắn thẳng vào tỉnh). Lưu ý tên đúng là `listWardsNew` (Wards số nhiều + New), KHÔNG phải listWardNew/listWardByProvince.
- `createOnVtp` thêm cờ `useNewAddress` → gửi `RECEIVER_DISTRICT: 0`, giữ `RECEIVER_WARD`. FE chuẩn hoá key tỉnh/xã linh hoạt (`normProvince/normWard`).

### Ghi chú mặc định
- `orderNote` mặc định = "Tuyệt đối không cho thử hàng… Bưu tá quay video khi khách mở hàng…" + nút "↺ Ghi chú mặc định".

### Mã đơn hàng tự sinh
- Ô "Mã đơn hàng" prefill `CHYSHOP<n>`, `n = tổng đơn VTP thật (không tính DRAFT-) + 1`. Backend `GET /api/viettelpost/next-order-ref` → `ViettelCustomerService.nextOrderRef`. FE prefill khi mở form đơn mới + sau "Tạo đơn khác"; mở nháp thì giữ mã đã lưu. Vẫn sửa tay được. ⚠ Đếm-tổng nên có thể trùng nếu xoá đơn cũ — chấp nhận theo yêu cầu.

### COD tự bám tổng giá trị + style
- Ô COD (Tiền thu hộ) tự điền = **Tổng giá trị hàng** (`totalValue`) qua effect; cờ `codTouched` ngừng tự đồng bộ khi user sửa tay. Hydrate nháp → `codTouched=true` (giữ COD đã lưu); "Tạo đơn khác" → `false` (bám lại). Ô COD hiển thị **đậm + đỏ** (`font-bold text-red-600`).

### Nháp + 3 nút hành động
- **Lưu nháp**: `POST /api/viettelpost/drafts` (ADMIN/STAFF) → lưu vào `viettel_customers` với `trackingCode='DRAFT-<ts>-<rand>'`, `status=null`, `statusName='Nháp'`, **toàn bộ form** lưu vào `detailPayload._draft.dto` (mở lại sửa được). KHÔNG đẩy VTP. Reconcile chạy trên `prisma.order` nên không đụng nháp.
- **Xoá nháp**: `DELETE /api/viettelpost/drafts/:code` (chỉ xoá dòng tiền tố `DRAFT-`).
- Form `create/page.tsx` nhận `?draft=DRAFT-...` → GET customer, hydrate từ `detailPayload.dto`, nạp lại dropdown địa chỉ theo chế độ.
- Đẩy đơn từ nháp: `createOnVtp` nhận `draftCode` → tạo đơn thật xong tự `deleteDraft` (nuốt lỗi).
- **Bộ nút**: `🚀 Tạo đơn & đẩy VTP` · `💾 Lưu nháp` · `🗑 Xoá nháp` (khi đang sửa nháp) / `✖ Hủy` (đơn mới).
- **Hủy đơn đã đẩy VTP**: màn hình kết quả sau khi tạo có nút `🚫 Hủy đơn` → `update-status {type:4}` (UpdateOrder TYPE=4). (Trang chi tiết `[code]` vẫn có sẵn hành động này.)
- Danh sách `viettel-customers`: dòng `DRAFT-` hiện badge "📝 Nháp", click mở `create?draft=...` thay vì trang chi tiết.

### Verify
- Backend `tsc --noEmit`: sạch. Frontend `tsc --noEmit`: sạch.
- Endpoint địa danh mới ĐÃ xác minh với API thật (token Login OK): `listProvinceNew` (34 tỉnh) + `listWardsNew?provinceId=` (vd Hà Nội 126 xã).
- ⚠ Tạo đơn thật (`order/createOrder`) với ward hệ mới CHƯA test end-to-end (mới dừng ở tra cứu địa chỉ).

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
- `processViettelPostWebhook`: nếu không tìm thấy đơn khớp (trackingCode / ORDER_REFERENCE / `PCK-{id}`) → **tạo đơn mới** `source='VIETTEL'`, userId=null, orderCode=ORDER_NUMBER, totalAmount từ COD, status map từ ORDER_STATUS (100/101→null, fallback PENDING khi tạo mới; 102/200/201/300/301→SHIPPED; 500/505→PAYMENT_COLLECTED; 501/515→DELIVERED; 502/510→RETURNING; 503/504/107→CANCELLED; còn lại→null), trackingCode vào metadata.
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

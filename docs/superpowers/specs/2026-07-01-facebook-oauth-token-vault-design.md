# Thiết kế: OAuth "Kết nối Facebook" (đa BM) + Token Vault mã hoá

> Trạng thái: ĐÃ DUYỆT · Ngày: 2026-07-01 · Phục vụ công ty (multi-tenant-ready cho SaaS sau).

## 1. Mục tiêu & phạm vi v1
Cho admin **đăng nhập Facebook (OAuth)** → app tự lấy **long-lived user token** → **khám phá & connect TẤT CẢ** BM / ad account / page của nick đó. Token lưu **mã hoá** (AES-256-GCM), tự **refresh** trước hết hạn. **Bổ sung** song song cách dán System User token (giữ fallback).

**Trong v1:** OAuth connect + token vault + discovery (auto tất cả) + list/gỡ connection + refresh cron + nối token vào sync Ads/Messenger. FE: nút "Kết nối Facebook" + danh sách connection ở trang Kết nối.
**Ngoài v1:** picker chọn từng BM/tài khoản; KMS; billing/onboarding SaaS; đăng bài/quản lý ads ghi ngược.

## 2. Điều kiện tiên quyết (ops)
- **Meta App** (đã có) bật **Facebook Login**; khai **Redirect URI** = `META_OAUTH_REDIRECT_URI` (HTTPS; local dùng tunnel).
- **App Review (Advanced Access)** cho scope: `public_profile,email,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_read_user_content,pages_manage_posts,pages_messaging,ads_read,ads_management,business_management` — chưa review chỉ chạy với admin/test ở Dev mode.
- Env: `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`, `TOKEN_ENC_KEY` (32 byte, hex/base64).

## 3. Data model (Prisma — 1 bảng mới)
- **FbConnection**: `id, storeId?, fbUserId, fbName?, tokenEnc @db.Text, tokenIv, tokenTag, tokenExpiresAt?, scopes?, status @default("ACTIVE"), lastRefreshAt?, raw Json?, createdAt, updatedAt`. `@@unique([storeId, fbUserId])`, `@@map("fb_connections")`.
- Tái dùng (đã có `storeId`): `AdBusiness / AdAccount / AdPage / MsgPage`. Discovery upsert vào đây; **page token lưu PLAINTEXT vào `MsgPage.accessToken`** (giữ đúng cách messenger.service đang dùng — không đổi để tránh phải giải mã ở chỗ gửi tin). CHỈ **user token** (giá trị cao, long-lived) mới vault mã hoá trong FbConnection. *(v1 trade-off; mã hoá page token + decrypt-at-use để giai đoạn sau.)*

## 4. Token Vault — `src/integrations/facebook/token-vault.ts`
- `encrypt(plain): { enc, iv, tag }` và `decrypt({enc,iv,tag}): string` dùng `aes-256-gcm`, key = `Buffer(TOKEN_ENC_KEY)` (32 byte). Hàm `pack()/unpack()` gộp thành 1 chuỗi `iv:tag:ct` (base64) để lưu MsgPage.accessToken.
- Thuần, không phụ thuộc Nest → unit test dễ (roundtrip).

## 5. State signer — `oauth-state.util.ts`
- `sign({storeId,userId,nonce,ts})` = base64url(payload) + "." + HMAC-SHA256(env secret). `verify(state)` kiểm chữ ký + TTL ≤ 10 phút. Chống CSRF.

## 6. Client — `facebook-oauth.client.ts` (HTTP thuần)
- `exchangeCode(code)` → short token (`GET /oauth/access_token?client_id&redirect_uri&client_secret&code`).
- `toLongLived(shortToken)` → long-lived (`grant_type=fb_exchange_token`) → `{ token, expiresInSec }`.
- `getEdge/getNode` (tái dùng pattern MetaAdsClient) cho discovery.

## 7. Discovery — `facebook-discovery.service.ts`
Input: `(userToken, storeId)`. Gọi & upsert idempotent:
- `/me?fields=id,name` → trả fbUserId/name.
- `/me/businesses?fields=id,name,verification_status` → upsert `AdBusiness`.
- Mỗi BM: `/{bm}/owned_ad_accounts` + `/{bm}/client_ad_accounts` (fields giàu như connector) → upsert `AdAccount` (storeId); `/{bm}/owned_pages` + `/{bm}/client_pages` → upsert `AdPage`.
- `/me/adaccounts` → upsert `AdAccount`.
- `/me/accounts?fields=id,name,category,tasks,access_token,...` → upsert `AdPage` + `MsgPage` (accessToken = page_token **plaintext**, xem mục 3).
Trả `{ businesses, adAccounts, pages }` (số lượng).

## 8. Service + Controller — `facebook.service.ts`, `facebook-oauth.controller.ts`
- `startUrl(storeId,userId)` → URL dialog + state.
- `handleCallback(code, state)` → verify state → `exchangeCode`→`toLongLived` → `/me` → upsert **FbConnection** (token mã hoá) → `discovery.run(token, storeId)` → trả summary.
- `listConnections(storeId)` (mask token) · `disconnect(id, storeId)` · `refresh(id)`.
- Endpoints (prefix /api):
  - `GET /integrations/facebook/oauth/start` — guard JWT+Roles(ADMIN,MODERATOR)+Permissions(INTEGRATIONS_MANAGE); trả `{ url }` (FE tự mở) hoặc 302.
  - `GET /integrations/facebook/oauth/callback` — **@Public** (FB gọi); verify state; xong redirect `FRONTEND_URL/admin/integrations?fb=ok|error`.
  - `GET /integrations/facebook/connections` — INTEGRATIONS_VIEW, scope effectiveStoreId.
  - `DELETE /integrations/facebook/connections/:id` — INTEGRATIONS_MANAGE.
  - `POST /integrations/facebook/connections/:id/refresh` — INTEGRATIONS_MANAGE.

## 9. Nối vào Ads/Messenger (không phá cũ)
- `MetaAdsConnector.getConfigs()` mở rộng: ngoài `StoreIntegration(META_ADS)`, đọc thêm mọi `FbConnection(status=ACTIVE)` → `{ storeId, token: decrypt(...), businessId: null, accountIds: [] }`. Sync Ads chạy nguyên si.
- Messenger `registerPages` cũng đọc token từ FbConnection (hoặc MsgPage đã có token discovery sẵn).

## 10. Refresh — `@Cron('0 */6 * * *')`
- Tìm FbConnection `tokenExpiresAt < now + 7 ngày`, status ACTIVE → `toLongLived(decrypt(token))` gia hạn → cập nhật token+expiresAt+lastRefreshAt. Lỗi 190/thu hồi → `status=EXPIRED`.

## 11. FE
- Trang `/admin/integrations`: nút **"Kết nối Facebook"** → `GET .../oauth/start` lấy `url` → mở popup/redirect. Sau callback về `?fb=ok` → toast + reload danh sách. Component list connection (tên nick, số BM/tài khoản/page, nút Gỡ). Giữ thẻ dán token cũ.

## 12. Bảo mật / lỗi
- Token KHÔNG bao giờ trả FE (list chỉ mask). `state` HMAC + TTL. Callback public nhưng verify state chặt; state sai → redirect `?fb=error`. App Secret + `TOKEN_ENC_KEY` chỉ trong env. Local proxy chặn TLS outbound → exchange/discovery lỗi cert ở local (chạy prod hoặc `NODE_EXTRA_CA_CERTS`); callback (FB→ta) inbound không ảnh hưởng.

## 13. Test
- Unit (Jest): token-vault roundtrip + sai key; oauth-state sign/verify + hết hạn + giả mạo; discovery mapping (mock fetch) upsert đúng.
- Live: cần Meta App + redirect HTTPS + login nick admin.

## 14. Quyết định mặc định
- Auto-connect tất cả (không picker). Giữ dán-token fallback. AES-256-GCM key env. Refresh cron 6h. **Chỉ vault user token** (FbConnection); page token plaintext trong MsgPage (v1).
- `token-vault.pack()`/`unpack()` (dạng `iv:tag:ct`) vẫn viết sẵn để dùng cho FbConnection lưu gọn nếu muốn; nhưng schema FbConnection dùng 3 cột riêng `tokenEnc/tokenIv/tokenTag` cho rõ ràng.

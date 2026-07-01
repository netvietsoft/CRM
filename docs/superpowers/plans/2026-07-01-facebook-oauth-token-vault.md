# Facebook OAuth "Kết nối" (đa BM) + Token Vault — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development hoặc superpowers:executing-plans. Steps dùng checkbox `- [ ]`.

**Goal:** Admin đăng nhập Facebook (OAuth) → app tự lấy long-lived user token (mã hoá lưu) → khám phá & connect tất cả BM/ad account/page; nối token vào sync Ads/Messenger; refresh tự động. Bổ sung song song cách dán System User token.

**Architecture:** Module `src/integrations/facebook`: token-vault (AES-256-GCM), oauth-state (HMAC), oauth client (exchange code→long-lived), discovery (upsert AdBusiness/AdAccount/AdPage/MsgPage), service+controller (start/callback/list/disconnect/refresh cron). `MetaAdsConnector.getConfigs()` đọc thêm FbConnection.

**Tech Stack:** NestJS, Prisma+MySQL, crypto (aes-256-gcm/hmac), fetch Graph v19, Jest; FE Next.js.

## Global Constraints
- Prefix `/api`; guard `JwtAuthGuard+RolesGuard+PermissionsGuard`; scope non-admin `@GetEffectiveStoreId()`.
- Callback `GET /integrations/facebook/oauth/callback` phải `@Public()` (FB gọi).
- Token user mã hoá AES-256-GCM (key `TOKEN_ENC_KEY` 32 byte). Page token PLAINTEXT trong `MsgPage.accessToken` (không đổi messenger).
- Env: `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`, `TOKEN_ENC_KEY`, `FRONTEND_URL`, `META_GRAPH_URL`(có).
- Scope OAuth: `public_profile,email,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_read_user_content,pages_manage_posts,pages_messaging,ads_read,ads_management,business_management`.
- Giữ nguyên StoreIntegration(META_ADS) dán tay.

---

### Task 1: Prisma FbConnection + migration
**Files:** Modify `prisma/schema.prisma`; Create `prisma/migrations/20260701110000_fb_connection/migration.sql`.
**Produces:** model `FbConnection`.
- [ ] Thêm model:
```prisma
model FbConnection {
  id             String    @id @default(uuid())
  storeId        String?   @map("store_id")
  fbUserId       String    @map("fb_user_id")
  fbName         String?   @map("fb_name") @db.Text
  tokenEnc       String    @map("token_enc") @db.Text
  tokenIv        String    @map("token_iv")
  tokenTag       String    @map("token_tag")
  tokenExpiresAt DateTime? @map("token_expires_at")
  scopes         String?   @db.Text
  status         String    @default("ACTIVE")
  lastRefreshAt  DateTime? @map("last_refresh_at")
  raw            Json?
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  @@unique([storeId, fbUserId])
  @@map("fb_connections")
}
```
- [ ] migration.sql: `CREATE TABLE fb_connections (...)` + unique index `(store_id, fb_user_id)`.
- [ ] `npx prisma migrate deploy && npx prisma generate` (dừng backend nếu khóa DLL).
- [ ] Commit.

### Task 2: token-vault (AES-256-GCM) — TDD
**Files:** Create `src/integrations/facebook/token-vault.ts`, `token-vault.spec.ts`.
**Produces:** `encryptToken(plain): {enc,iv,tag}`, `decryptToken({enc,iv,tag}): string`.
- [ ] Test: roundtrip `decryptToken(encryptToken('abc123')) === 'abc123'`; sai key → throw/khác.
```ts
it('mã hoá rồi giải mã ra đúng chuỗi', () => {
  process.env.TOKEN_ENC_KEY = '0'.repeat(64); // 32 byte hex
  const p = encryptToken('secret-token');
  expect(p.iv && p.tag && p.enc).toBeTruthy();
  expect(decryptToken(p)).toBe('secret-token');
});
```
- [ ] Run → FAIL. 
- [ ] Impl: key = `Buffer.from(process.env.TOKEN_ENC_KEY,'hex')` (32 byte); `createCipheriv('aes-256-gcm',key,iv)`; trả base64 enc/iv/tag; decrypt dùng `createDecipheriv` + `setAuthTag`.
- [ ] Run → PASS. Commit.

### Task 3: oauth-state (HMAC) — TDD
**Files:** Create `src/integrations/facebook/oauth-state.util.ts`, `.spec.ts`.
**Produces:** `signState(obj): string`, `verifyState(state): obj | null` (null nếu sai chữ ký/hết hạn >10p).
- [ ] Test: `verifyState(signState({storeId:'s',userId:'u',nonce:'n',ts:Date.now()}))` trả lại obj; đổi 1 ký tự → null; ts cũ 20 phút → null.
- [ ] Run → FAIL.
- [ ] Impl: payload=base64url(JSON); sig=HMAC-SHA256(`META_APP_SECRET`,payload); state=`payload.sig`; verify timingSafeEqual + ts TTL.
- [ ] Run → PASS. Commit.

### Task 4: OAuth client — TDD (mock fetch)
**Files:** Create `src/integrations/facebook/facebook-oauth.client.ts`, `.spec.ts`.
**Produces:** `exchangeCode(code): Promise<string>`, `toLongLived(short): Promise<{token,expiresInSec}>`, `getEdge(path,token)`, `getNode(id,fields,token)`.
- [ ] Test: mock `global.fetch`; `exchangeCode('c')` gọi `/oauth/access_token` với client_id/secret/redirect_uri/code, trả `access_token`.
- [ ] Run → FAIL.
- [ ] Impl: GRAPH v19; build query; throw `Error(json.error.message)` khi !ok. `toLongLived` dùng `grant_type=fb_exchange_token` trả `{token:access_token, expiresInSec:expires_in}`. getEdge phân trang.
- [ ] Run → PASS. Commit.

### Task 5: Discovery service — TDD (mock)
**Files:** Create `src/integrations/facebook/facebook-discovery.service.ts`, `.spec.ts`.
**Consumes:** OAuth client, PrismaService.
**Produces:** `run(userToken, storeId): Promise<{me:{id,name}, businesses:number, adAccounts:number, pages:number}>`.
- [ ] Test (mock client + prisma): `run` gọi `/me`, `/me/businesses`, `/me/adaccounts`, `/me/accounts`; upsert adBusiness/adAccount/adPage/msgPage đúng số lần; msgPage.accessToken = page_token plaintext.
- [ ] Run → FAIL.
- [ ] Impl: `/me?fields=id,name`; `/me/businesses?fields=id,name,verification_status`→upsert AdBusiness; mỗi bm owned/client_ad_accounts (fields giàu) + owned/client_pages; `/me/adaccounts`; `/me/accounts?fields=id,name,category,tasks,access_token,fan_count,followers_count,link,verification_status,is_published`→upsert AdPage + MsgPage(storeId, accessToken=page.access_token, tasks, subscribed giữ nguyên). Dedup theo externalId. Tiền tệ dùng minorFactor (copy từ meta-ads.connector) cho balance/budget.
- [ ] Run → PASS. Commit.

### Task 6: Facebook service
**Files:** Create `src/integrations/facebook/facebook.service.ts`.
**Produces:** `startUrl(storeId,userId):string`, `handleCallback(code,state):Promise<summary>`, `listConnections(storeId)`, `disconnect(id,storeId)`, `refresh(id)`, `refreshExpiring()` (cron helper).
- [ ] `startUrl`: `https://www.facebook.com/v19.0/dialog/oauth?client_id&redirect_uri&state=signState(...)&scope=<SCOPES>&auth_type=rerequest`.
- [ ] `handleCallback`: verifyState→null thì throw; exchangeCode→toLongLived; `/me`; upsert FbConnection (encryptToken(token) → tokenEnc/iv/tag, tokenExpiresAt=now+expiresInSec, scopes, status ACTIVE); `discovery.run(token, storeId)`; trả summary.
- [ ] `listConnections`: chọn field KHÔNG gồm token; `disconnect`: scope-check + delete; `refresh(id)`: decrypt→toLongLived→update; `refreshExpiring`: query expiresAt<now+7d ACTIVE → refresh, lỗi→status EXPIRED.
- [ ] Commit.

### Task 7: Controller + endpoints
**Files:** Create `src/integrations/facebook/facebook-oauth.controller.ts`.
- [ ] `GET oauth/start` (INTEGRATIONS_MANAGE, @GetEffectiveStoreId, @GetUser) → `{ url: service.startUrl(storeId, user.id) }`.
- [ ] `GET oauth/callback` (@Public) → try `handleCallback` → redirect `${FRONTEND_URL}/admin/integrations?fb=ok`; catch → `?fb=error&msg=`.
- [ ] `GET connections` (INTEGRATIONS_VIEW) · `DELETE connections/:id` · `POST connections/:id/refresh` (INTEGRATIONS_MANAGE).
- [ ] Commit.

### Task 8: Nối token vào Ads sync
**Files:** Modify `src/integrations/ads/meta/meta-ads.connector.ts` (`getConfigs`).
- [ ] Trong `getConfigs()`: sau khi build configs từ StoreIntegration/env, query `prisma.fbConnection.findMany({where:{status:'ACTIVE'}})` → mỗi cái push `{storeId, token: decryptToken({enc:tokenEnc,iv:tokenIv,tag:tokenTag}), businessId:null, accountIds:[]}`. Import `decryptToken`.
- [ ] Commit. (Test: unit hiện có vẫn pass; thêm assert getConfigs gộp fbConnection nếu khả thi.)

### Task 9: Refresh cron + Module wiring
**Files:** Create `src/integrations/facebook/facebook.module.ts`; Modify `app.module.ts`; thêm `@Cron` trong service.
- [ ] `@Cron('0 */6 * * *') refreshCron()` → `refreshExpiring()` (tắt bằng env `FB_REFRESH_ENABLED=false`).
- [ ] Module: providers (service, client, discovery), controller; imports PrismaModule. Đăng ký AppModule.
- [ ] `tsc --noEmit` sạch + boot thấy routes `/api/integrations/facebook/*`. Commit.

### Task 10: FE — nút Kết nối + danh sách
**Files:** Modify `frontend/src/app/admin/integrations/page.tsx` (hoặc component thẻ kết nối); Create `frontend/src/components/admin/FacebookConnectCard.tsx`.
- [ ] Nút "Kết nối Facebook" → `GET /integrations/facebook/oauth/start` lấy `url` → `window.location.href=url` (hoặc popup). Đọc `?fb=ok|error` khi quay lại → toast + reload.
- [ ] List connections (`GET /integrations/facebook/connections`) — tên nick, ngày, nút Gỡ (`DELETE`), nút Làm mới (`POST refresh`).
- [ ] `tsc --noEmit` FE sạch. Commit.

### Task 11: Env + docs
**Files:** `.env.example` (nếu có), `docs/05-integrations-webhooks.md`.
- [ ] Thêm env mẫu + mục "Facebook OAuth (đa BM) + token vault" (luồng, endpoint, scope, ops setup redirect URI + App Review).
- [ ] Commit.

## Self-Review
- **Coverage:** vault(T2), state(T3), client(T4), discovery(T5), service(T6), endpoints(T7), nối Ads(T8), refresh+wiring(T9), FE(T10), env/docs(T11), model(T1). ✓ Khớp spec mục 3–13.
- **Placeholder:** code chính có thật; discovery/service mô tả bước cụ thể + tái dùng pattern connector.
- **Type consistency:** `encryptToken`/`decryptToken` shape `{enc,iv,tag}` dùng nhất quán T2↔T6↔T8; FbConnection cột `tokenEnc/tokenIv/tokenTag` khớp; page token plaintext (không mã hoá) nhất quán spec mục 3.

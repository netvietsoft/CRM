# Meta (Facebook) Ads — Kéo toàn bộ chiến dịch + chỉ số về CRM

**Goal:** Đồng bộ TẤT CẢ dữ liệu tài khoản quảng cáo Meta (campaign / ad set / ad + chỉ số theo ngày) về CRM, lưu kèm JSON gốc đầy đủ để AI phân tích sau, và hiển thị dashboard quản trị.

**Nguyên tắc cốt lõi (theo yêu cầu):** *Không bỏ sót dữ liệu.* Mỗi bản ghi lưu cả cột chuẩn hoá (cho dashboard) **và** cột `raw Json` chứa nguyên payload API → không mất field nào dù chưa model hoá.

**Tech:** NestJS + Prisma (MySQL), Next.js 16. Theo pattern `integrations/` hiện có (mirror `viettelpost`). Meta Marketing API **Graph API v21.0**.

---

## Global Constraints
- Tiền tệ VND, số nguyên đồng ở UI; chỉ số tiền lưu `Decimal(18,2/4)`.
- Locale hiển thị số: dùng `frontend/src/lib/format.ts` (KHÔNG tự viết Intl).
- Endpoint admin: guard `JwtAuthGuard, RolesGuard, PermissionsGuard` + `@Roles('ADMIN','MODERATOR')`.
- Migration: thêm **bảng MỚI** (không sửa bảng cũ) qua file `prisma/migrations/<ts>_add_ad_tables/migration.sql` + `prisma migrate deploy` (KHÔNG `migrate dev`).
- Credentials: đọc từ `StoreIntegration` (platform `META_ADS`: `accessToken` = token, `metadata.adAccountId` = `act_...`); fallback env `META_ADS_ACCESS_TOKEN` / `META_ADS_ACCOUNT_ID`. Thiếu → connector trả trạng thái "chưa cấu hình", không crash.
- Mọi call Graph API qua 1 client có phân trang (`paging.next`) + xử lý lỗi (token hết hạn, rate-limit) → log, không vỡ sync.

---

## 1. Model dữ liệu (Prisma) — bảng mới

- **`AdAccount`** (`ad_accounts`): `platform`, `externalId` (act_id), `name`, `currency`, `timezoneName`, `status`, `lastSyncedAt`, `raw`. Unique `(platform, externalId)`.
- **`AdCampaign`** (`ad_campaigns`): `accountId`→AdAccount, `externalId`, `name`, `status`, `objective`, `dailyBudget`, `lifetimeBudget`, `startTime`, `stopTime`, `raw`. Unique `(platform, externalId)`.
- **`AdSet`** (`ad_sets`): `accountId`, `campaignId?`, `externalId`, `name`, `status`, `dailyBudget`, `lifetimeBudget`, `optimizationGoal`, `billingEvent`, `targeting Json`, `startTime`, `stopTime`, `raw`. Unique `(platform, externalId)`.
- **`Ad`** (`ads`): `accountId`, `campaignId?`, `adSetId?`, `externalId`, `name`, `status`, `creative Json`, `raw`. Unique `(platform, externalId)`.
- **`AdInsight`** (`ad_insights`) — **lõi chỉ số, theo NGÀY, mọi cấp**: `platform`, `level` (`account|campaign|adset|ad`), `entityExternalId`, `accountId`, `campaignId?`, `adSetId?`, `adId?`, `date @db.Date`, `spend`, `impressions`, `reach`, `clicks`, `uniqueClicks`, `ctr`, `cpc`, `cpm`, `frequency`, `results`, `costPerResult`, `actions Json`, `actionValues Json`, `raw Json`. Unique `(platform, level, entityExternalId, date)`; index `(accountId,date)`, `(campaignId,date)`.

`storeId String?` trên AdAccount (không FK, coupling lỏng). Số đếm lớn dùng `BigInt?`.

## 2. Connector Meta (`integrations/ads/meta/`)
- `meta-ads.client.ts` — wrapper Graph API: `get(path, params)` gắn `access_token`, tự phân trang gộp `data[]`, ném `MetaAdsError` có mã.
- `meta-ads.connector.ts`:
  - `fetchAccount()` → `GET /act_<id>?fields=id,name,currency,timezone_name,account_status`.
  - `fetchCampaigns()` → `/act_<id>/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time` (+phân trang).
  - `fetchAdSets()`, `fetchAds()` tương tự (đủ field + `effective_status`, `creative` cho ad).
  - `fetchInsights(level, since, until)` → `/act_<id>/insights?level=<level>&time_increment=1&time_range={since,until}&fields=date_start,campaign_id,adset_id,ad_id,spend,impressions,reach,clicks,unique_clicks,ctr,cpc,cpm,frequency,actions,action_values` → map mỗi dòng → `AdInsight` (giữ `raw`). `results`/`costPerResult` suy từ `actions` (ưu tiên action_type chuyển đổi chính; nếu không có → null, vẫn giữ actions đầy đủ).

## 3. Sync (`ads-sync.service.ts`)
- `syncAll(accountId?)`: upsert AdAccount → campaigns → adsets → ads → insights cả 4 cấp cho **90 ngày gần nhất** (cấu hình qua tham số/`days`). Upsert idempotent theo unique key. Cập nhật `lastSyncedAt`.
- `@Cron` mỗi 3h (env `ADS_SYNC_ENABLED=false` để tắt; mặc định chạy nếu có credentials).
- Trả tóm tắt `{ accounts, campaigns, adSets, ads, insightRows }`.

## 4. API (`ads.controller.ts`, prefix `/api/ads`, admin-guard)
- `POST /ads/sync` (body `{ days? }`) → chạy `syncAll`, trả tóm tắt.
- `GET /ads/accounts` → list AdAccount + lastSyncedAt.
- `GET /ads/summary?from&to&accountId?` → KPI gộp từ AdInsight level=campaign: tổng spend/impressions/reach/clicks/results, CTR/CPC/CPM trung bình có trọng số.
- `GET /ads/campaigns?from&to&accountId?` → mỗi campaign + chỉ số cộng dồn trong khoảng.
- `GET /ads/campaigns/:id/insights?from&to` → chuỗi theo ngày (cho biểu đồ/AI).
- (Cấu hình token) tái dùng `integrations` config hiện có hoặc endpoint `POST /ads/config` lưu `StoreIntegration(META_ADS)`.

## 5. Module & đăng ký
- `AdsModule` (PrismaModule) → providers: MetaAdsClient, MetaAdsConnector, AdsSyncService; controller AdsController. Import vào `app.module.ts`. ScheduleModule đã forRoot sẵn.

## 6. UI — `/admin/ads` ("Quảng cáo")
- Thẻ KPI: tổng chi tiêu, hiển thị, reach, click, CTR, CPC, CPM, kết quả, cost/result.
- Lọc: tài khoản + khoảng ngày (mặc định 30 ngày) + nút "Đồng bộ ngay" (gọi `/ads/sync`) + hiện `lastSyncedAt`.
- Bảng campaign: tên, trạng thái, mục tiêu, ngân sách, chi tiêu, hiển thị, click, CTR, CPC, CPM, kết quả, cost/result — dùng `formatNumber`/`formatVnd`. Click campaign → drill chuỗi theo ngày (sau).
- Thêm mục **"Quảng cáo"** vào sidebar (nhóm *Chiến dịch*).

## Phụ thuộc / rủi ro
- **Cần access token Meta (ads_read) + `act_<id>`** để kéo dữ liệu thật; chưa có thì pipeline build xong vẫn chờ token.
- Map `results`/`costPerResult` phụ thuộc loại chuyển đổi → v1 lấy action_type ưu tiên (`purchase`/`onsite_conversion...`), còn lại giữ trong `actions` (AI dùng sau).
- ROAS (spend ↔ doanh thu CRM) **ngoài phạm vi v1**.

## Verify
- Backend/Frontend `tsc --noEmit` sạch. Migration apply OK (bảng mới hiện trong DB). Sync với token thật trả >0 dòng insight; KPI/bảng FE hiển thị đúng định dạng số.

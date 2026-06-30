# Spec: Phân tích Lãi/Lỗ sản phẩm (Product P&L Analytics) — Phase 1

> Ngày: 2026-06-30. Trạng thái: đã duyệt design, chờ duyệt spec → writing-plans.
> Đọc kèm: `docs/02-backend-modules.md` (ADS, ORDERS, PRODUCTS), `docs/04-database.md`,
> `docs/superpowers/specs/2026-06-30-meta-ads-ingestion-design.md`.

## 1. Mục tiêu

Cho phép admin xem **lãi/lỗ theo từng sản phẩm, theo ngày** (và tổng theo khoảng ngày),
ghép dữ liệu **chi tiêu quảng cáo** (Meta) với **đơn hàng đa nguồn** (Viettel/Pancake/Web…).

Kết quả ví dụ (1 dòng/sản phẩm trong khoảng ngày x–y):
> Mẫu A: Quảng cáo `xx`, Doanh thu COD `xx`, Cost sản phẩm `xx`, Vận hành `xx`, **Tổng lãi `xx`**.

## 2. Phạm vi

### Trong Phase 1
- Nguồn ads: **chỉ Meta** (dữ liệu đã đồng bộ sẵn trong `AdInsight`). Khung thiết kế đa-platform.
- Gán ad → sản phẩm: **map thủ công ở cấp Campaign** (1 campaign → 1 sản phẩm).
- Doanh thu: **chỉ đơn COD đã thu** (`paymentMethod = COD` và `status ∈ {PAYMENT_COLLECTED, COMPLETED}`).
- Cost sản phẩm: `Product.productionPrice × quantity` (field "Giá sản xuất" đã thêm 2026-06-30).
- Vận hành: **tạm = 0**, vẫn hiển thị cột (bảng chi phí vận hành làm ở Phase 2).
- Tính **on-the-fly** (không precompute).

### Ngoài Phase 1 (ghi nhận, làm sau)
- Google Ads (tích hợp mới — dự án riêng).
- Map ở cấp AdSet/Ad (bảng đã đỡ sẵn, luật "cấp cụ thể hơn thắng").
- Chia tỷ lệ spend khi 1 campaign quảng cáo nhiều sản phẩm.
- Bảng chi phí Vận hành (per-order/per-product) + đưa vào công thức.
- Precompute hằng đêm (`ProductDailyPnl`) nếu báo cáo chậm.

## 3. Quyết định & lý do
- **On-the-fly** thay vì precompute: ít code, luôn đúng realtime, ra giá trị ngay; quy mô dữ liệu hiện tại chịu được. Cấu trúc service tách riêng để nâng lên precompute sau mà không đổi API.
- **Map thủ công** thay vì auto-match theo tên: chính xác, không phụ thuộc quy ước đặt tên (Meta campaign name không có chuẩn chứa SKU trong dữ liệu hiện tại).
- **Map cấp Campaign**: đa số shop chạy 1 campaign/1 mẫu → ít entity phải gán nhất, đủ dùng cho v1.

## 4. Mô hình dữ liệu

### 4.1 Bảng mới `AdProductMap` (Prisma `model AdProductMap`, `@@map("ad_product_maps")`)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | String @id @default(uuid()) | |
| storeId | String? `@map("store_id")` | coupling lỏng (như `AdAccount.storeId`), scope đa cửa hàng |
| platform | String @default("META") | đa-platform sau |
| level | String | 'campaign' (v1). Để sẵn 'adset'\|'ad' |
| adEntityExternalId | String `@map("ad_entity_external_id")` | externalId của campaign (khớp `AdCampaign.externalId`) |
| productId | String `@map("product_id")` | FK Product (onDelete: Cascade) |
| createdAt/updatedAt | DateTime | |

Ràng buộc: `@@unique([platform, level, adEntityExternalId])` (1 entity chỉ map 1 SP).
Index: `@@index([productId])`, `@@index([storeId])`.
Quan hệ: `product Product @relation(...)` — thêm `adProductMaps AdProductMap[]` vào `Product`.

⚠ Áp DB **không dùng `prisma migrate dev`** (repo có migration trùng timestamp `20260630140000`
làm hỏng shadow DB). Cách làm: tạo file migration thủ công `prisma/migrations/<ts>_add_ad_product_map/migration.sql`
(`CREATE TABLE ad_product_maps ...`) → `prisma db execute` áp DB thật → `prisma migrate resolve --applied`
→ `prisma generate` (cần backend dừng vì EPERM khoá engine DLL).

### 4.2 Tái dùng (không đổi)
- `AdInsight.spend` theo `date` + `campaignId`/`accountId` (mức campaign đã đồng bộ).
- `AdCampaign` (externalId, name, accountId) — nguồn danh sách campaign cho màn gán.
- `Order` (source, paymentMethod, status, paidAt/updatedAt, storeId) + `OrderItem` (productId, productName, quantity, price).
- `Product.productionPrice`.

## 5. Logic tính toán (service)

### 5.1 Phân giải `OrderItem` → Product
1. Nếu `OrderItem.productId` không null → dùng trực tiếp.
2. Nếu null → khớp `normalize(OrderItem.productName)` với `normalize(Product.name)` (lower + trim + bỏ dấu cách thừa). Khớp duy nhất → gán; không khớp/đa khớp → nhóm **"Chưa khớp"** (productId = null bucket).

### 5.2 Doanh thu COD & Cost theo sản phẩm
- Lọc đơn: `paymentMethod = COD` AND `status ∈ {PAYMENT_COLLECTED, COMPLETED}` AND (storeId scope) AND (source ∈ filter nếu có) AND ngày ghi nhận trong [from,to].
  - **Ngày ghi nhận doanh thu**: `paidAt` nếu có, else `updatedAt`. (Quyết định để phân bổ "hàng ngày".)
- Với mỗi `OrderItem` của các đơn đó:
  - Doanh thu COD += `price × quantity`.
  - Cost SP += `productionPrice(product) × quantity` (productionPrice null → 0, đánh dấu "thiếu giá vốn").
- Gom theo product (và theo `date` nếu `groupBy=day`).

### 5.3 Quảng cáo theo sản phẩm
- Với mỗi `AdProductMap(level='campaign')`: lấy `AdInsight` (level campaign) có `campaignId` ↔ `adEntityExternalId`, `date ∈ [from,to]`, (platform filter), (account/store scope).
- Quảng cáo(product) += Σ `spend`. Gom theo `date` nếu cần.

### 5.4 Tổng hợp mỗi dòng
```
operations = 0            // Phase 1
profit = revenueCod - costProduct - adSpend - operations
margin = revenueCod > 0 ? profit / revenueCod : null
```
- Dòng **Tổng cộng**: cộng tất cả.
- Nhóm **"Chưa khớp"**: doanh thu/cost của item không phân giải được product (ad spend không thuộc nhóm này).
- Sản phẩm có spend nhưng 0 doanh thu vẫn hiện (lỗ = -adSpend).

## 6. API (NestJS, prefix `/api`, module `src/analytics`)

Quyền v1: `@Roles('ADMIN','MODERATOR')` (KHÔNG thêm permission mới ở Phase 1 — đủ dùng, tránh phình
seed permission). Non-admin (MODERATOR) scope theo `effectiveStoreId` qua `@GetEffectiveStoreId()`.

### 6.1 Báo cáo
`GET /analytics/product-pnl`
Query: `from` (ISO date), `to`, `storeId?`, `platform?` (mặc định META), `source?` (CSV nhiều nguồn), `groupBy=product|day` (mặc định product).
Trả:
```jsonc
{
  "from": "...", "to": "...",
  "rows": [
    { "productId": "...", "productName": "Mẫu A",
      "adSpend": 0, "revenueCod": 0, "costProduct": 0, "operations": 0,
      "profit": 0, "margin": 0.0,
      "missingProductionPrice": false,
      "daily": [ { "date":"YYYY-MM-DD", "adSpend":0, "revenueCod":0, "costProduct":0, "operations":0, "profit":0 } ] // chỉ khi groupBy=day hoặc khi bung dòng
    }
  ],
  "unmatched": { "revenueCod": 0, "costProduct": 0 },
  "totals": { "adSpend": 0, "revenueCod": 0, "costProduct": 0, "operations": 0, "profit": 0 }
}
```

### 6.2 Gán quảng cáo ↔ sản phẩm
- `GET /analytics/ad-map?platform=META&accountId=<adAccount.id>`
  → `[{ campaignExternalId, campaignName, status, spend30d?, productId|null, productName|null }]`
  (left join `AdProductMap` để biết đã map chưa).
- `PUT /analytics/ad-map`
  Body: `{ platform:'META', level:'campaign', adEntityExternalId, productId|null }` (null = gỡ map).
  → upsert theo unique key.

## 7. Frontend

Nhóm sidebar **"Phân tích"** (đã tồn tại) — **thay** item `Tổng quan phân tích` bằng 2 item:
1. `Lãi/Lỗ sản phẩm` → `/admin/analytics`
2. `Gán quảng cáo ↔ SP` → `/admin/analytics/ad-mapping`
(Quyền `ADMIN_MODERATOR` như hiện tại.)

### 7.1 `/admin/analytics` — Lãi/Lỗ sản phẩm
- **Bộ lọc**: khoảng ngày (preset: Hôm nay / 7 ngày / Tháng này / Tùy chọn) · chọn tài khoản ads (hoặc tất cả) · nguồn đơn (multi: Viettel/Pancake/Web…) · Gộp theo: Sản phẩm | Ngày.
- **Bảng** (zebra, theo quy ước dự án — lẻ `bg-gray-100`, chẵn `bg-white`, hover `bg-blue-50/40`):
  Cột: Sản phẩm · Quảng cáo · Doanh thu COD · Cost SP · Vận hành · **Tổng lãi** · Biên %.
  - Tổng lãi: xanh (≥0) / đỏ (<0). Định dạng tiền VN (dấu chấm) qua `@/lib/format`.
  - Dòng **Tổng cộng** (sticky cuối). Dòng **"Chưa khớp"** riêng (nhạt nhân cảnh báo).
  - Bấm dòng sản phẩm → bung chi tiết **theo ngày** (gọi groupBy=day cho product đó, hoặc trả sẵn `daily`).
  - Đánh dấu sản phẩm **thiếu Giá sản xuất** (icon ⚠ + tooltip) để nhắc nhập.
- Server component fetch qua `apiClient` (như dashboard) + client component cho bộ lọc tương tác (như `RevenueStats`).

### 7.2 `/admin/analytics/ad-mapping` — Gán quảng cáo ↔ SP
- Chọn tài khoản ads (dropdown từ `/ads/accounts`).
- Bảng campaign của tài khoản: Tên campaign · Trạng thái · (Chi tiêu 30 ngày) · **Sản phẩm** (component `Select` search sản phẩm) · nút Lưu (hoặc auto-save onChange) gọi `PUT /analytics/ad-map`.
- Campaign chưa map nổi bật để dễ thấy việc cần làm.

## 8. Không làm (YAGNI Phase 1)
- Không tự match theo tên. Không chia tỷ lệ spend đa-sản-phẩm. Không Google. Không precompute.
  Không sửa luồng đồng bộ ads. Không thêm chi phí vận hành thực (=0).

## 9. Rủi ro / lưu ý
- Đơn Pancake/Viettel thường `OrderItem.productId = null` → phụ thuộc khớp tên; tên lệch → rơi vào "Chưa khớp". Màn báo cáo phải show rõ nhóm này để admin biết độ phủ.
- `productionPrice` chưa nhập cho nhiều SP → cost = 0 làm lãi ảo cao; phải cảnh báo trực quan.
- `prisma generate` cần backend dừng (EPERM) — đồng bộ với việc còn treo của field `productionPrice`.
- Spend mức campaign: nếu sau này muốn map adset/ad, cần đảm bảo không double-count (luật cấp cụ thể hơn thắng — Phase 2).

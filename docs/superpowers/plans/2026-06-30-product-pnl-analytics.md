# Product P&L Analytics (Phase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho admin xem lãi/lỗ theo từng sản phẩm (và theo ngày) bằng cách ghép chi tiêu quảng cáo Meta với doanh thu đơn COD đã thu.

**Architecture:** Backend NestJS module mới `src/analytics` tính **on-the-fly**: lấy spend từ `AdInsight` qua bảng map mới `AdProductMap` (campaign→sản phẩm), lấy doanh thu/cost từ `Order/OrderItem` + `Product.productionPrice`. Logic tổng hợp tách thành hàm thuần `buildPnlReport` (unit-test). Frontend: 2 trang dưới nhóm sidebar "Phân tích".

**Tech Stack:** NestJS + Prisma (MySQL) + class-validator; Next.js App Router (server page + client component) + Tailwind; Jest.

## Global Constraints
- Backend global prefix `/api` (route `@Controller('analytics')` → `/api/analytics`).
- Quyền v1: `@Roles('ADMIN','MODERATOR')`, KHÔNG thêm permission mới. `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` BẮT BUỘC giữ `PermissionsGuard` vì nó set `request.effectiveStoreId` (ADMIN=null, MODERATOR=store của họ).
- Doanh thu = đơn `paymentMethod='COD'` AND `status ∈ {PAYMENT_COLLECTED, COMPLETED}`.
- Ngày ghi nhận doanh thu = `paidAt ?? updatedAt`. Gom theo **ngày UTC** (`toISOString().slice(0,10)`) — cùng cách với `AdInsight.date` (@db.Date). Đây là đơn giản hoá v1.
- Cost sản phẩm = `Product.productionPrice × quantity` (null → 0, đánh dấu thiếu).
- Vận hành (operations) = `0` ở v1 (vẫn trả/hiện cột).
- Map ad→SP: chỉ `level='campaign'`, `platform='META'`.
- ⚠ `prisma migrate dev` KHÔNG dùng được (migration trùng timestamp `20260630140000` hỏng shadow DB). Áp DB thủ công: tạo file migration SQL → `prisma db execute` → `prisma migrate resolve --applied` → `prisma generate`.
- ⚠ `prisma generate` cần **dừng backend dev server** (port 3901) vì EPERM khoá `query_engine-windows.dll.node`.
- Định dạng tiền: dùng `@/lib/format` (`formatVnd`/`formatNumber`), ngăn nghìn dấu chấm, không thập phân.
- Bảng zebra theo quy ước dự án: dòng lẻ `bg-gray-100`, chẵn `bg-white`, hover `hover:bg-blue-50/40`.

## File Structure
**Backend (mới, trừ app.module + schema):**
- `prisma/schema.prisma` — thêm `model AdProductMap` + quan hệ trong `Product` (modify).
- `prisma/migrations/20260630200000_add_ad_product_map/migration.sql` — create table (create).
- `src/analytics/pnl.util.ts` — hàm thuần `buildPnlReport` + types (create).
- `src/analytics/pnl.util.spec.ts` — unit test (create).
- `src/analytics/dto/upsert-ad-map.dto.ts` — DTO cho PUT (create).
- `src/analytics/analytics.service.ts` — fetch prisma + gọi util (create).
- `src/analytics/analytics.controller.ts` — 3 endpoint (create).
- `src/analytics/analytics.module.ts` — module (create).
- `src/app.module.ts` — đăng ký `AnalyticsModule` (modify).

**Frontend (mới, trừ sidebar):**
- `src/components/admin/AdminSidebar.tsx` — thay 1 item placeholder bằng 2 item (modify).
- `src/app/admin/analytics/page.tsx` — server page P&L (create).
- `src/app/admin/analytics/AnalyticsClient.tsx` — client lọc + bảng (create).
- `src/app/admin/analytics/ad-mapping/page.tsx` — server page (create).
- `src/app/admin/analytics/ad-mapping/AdMappingClient.tsx` — client gán (create).

**Docs:** `docs/02-backend-modules.md`, `docs/04-database.md`, `docs/changelog.md` (modify).

---

### Task 1: DB — model AdProductMap + migration + generate

**Files:**
- Modify: `prisma/schema.prisma` (model Product ~263, cuối file vùng Ad*)
- Create: `prisma/migrations/20260630200000_add_ad_product_map/migration.sql`

**Interfaces:**
- Produces: bảng `ad_product_maps`; Prisma model `AdProductMap`; quan hệ `Product.adProductMaps`.

- [ ] **Step 1: Thêm model vào schema** — thêm khối sau ngay dưới `model AdPage { ... }` (cuối vùng Ad*):

```prisma
model AdProductMap {
  id                 String   @id @default(uuid())
  storeId            String?  @map("store_id")
  platform           String   @default("META")
  level              String   // 'campaign' (v1); để sẵn 'adset' | 'ad'
  adEntityExternalId String   @map("ad_entity_external_id")
  productId          String   @map("product_id")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  product            Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([platform, level, adEntityExternalId])
  @@index([productId])
  @@index([storeId])
  @@map("ad_product_maps")
}
```

- [ ] **Step 2: Thêm quan hệ ngược vào model Product** — trong `model Product`, ngay dưới dòng `usedInCombos   ProductComboItem[] @relation("ComboChildProduct")` thêm:

```prisma
  adProductMaps  AdProductMap[]
```

- [ ] **Step 3: Tạo file migration SQL**

```sql
-- Bảng map quảng cáo (campaign) -> sản phẩm, phục vụ phân tích lãi/lỗ
CREATE TABLE `ad_product_maps` (
    `id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `level` VARCHAR(191) NOT NULL,
    `ad_entity_external_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ad_product_maps_platform_level_ad_entity_external_id_key`(`platform`, `level`, `ad_entity_external_id`),
    INDEX `ad_product_maps_product_id_idx`(`product_id`),
    INDEX `ad_product_maps_store_id_idx`(`store_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ad_product_maps` ADD CONSTRAINT `ad_product_maps_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Áp DB thật + ghi nhận migration**

Run (trong `backend-nestjs`):
```bash
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260630200000_add_ad_product_map/migration.sql
npx prisma migrate resolve --applied 20260630200000_add_ad_product_map
```
Expected: `Script executed successfully.` + `Migration ... marked as applied.`

- [ ] **Step 5: Generate client** — DỪNG backend dev server (port 3901) trước, rồi:

Run: `npx prisma generate`
Expected: `Generated Prisma Client`. (Nếu EPERM → backend còn chạy, tắt rồi chạy lại.)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260630200000_add_ad_product_map
git commit -m "feat(db): them bang ad_product_maps (map campaign -> san pham)"
```

---

### Task 2: Backend — hàm thuần buildPnlReport + unit test (TDD)

**Files:**
- Create: `src/analytics/pnl.util.ts`
- Test: `src/analytics/pnl.util.spec.ts`

**Interfaces:**
- Produces:
  - `PnlLine { productId: string|null; productName: string; date: string; revenue: number; cost: number; missingCost: boolean }`
  - `PnlAdSpend { productId: string; productName: string; date: string; spend: number }`
  - `PnlReport { rows: PnlRow[]; unmatched: { revenueCod: number; costProduct: number }; totals: { adSpend, revenueCod, costProduct, operations, profit } }`
  - `PnlRow { productId: string|null; productName: string; adSpend; revenueCod; costProduct; operations; profit; margin: number|null; missingProductionPrice: boolean; daily: PnlRowDaily[] }`
  - `buildPnlReport(lines: PnlLine[], adSpend: PnlAdSpend[]): PnlReport`

- [ ] **Step 1: Viết test thất bại** — `src/analytics/pnl.util.spec.ts`:

```ts
import { buildPnlReport, PnlLine, PnlAdSpend } from './pnl.util';

describe('buildPnlReport', () => {
  it('tính lãi = doanh thu - cost - quảng cáo, gộp theo sản phẩm + ngày', () => {
    const lines: PnlLine[] = [
      { productId: 'A', productName: 'Mẫu A', date: '2026-06-01', revenue: 300000, cost: 150000, missingCost: false },
      { productId: 'A', productName: 'Mẫu A', date: '2026-06-02', revenue: 300000, cost: 150000, missingCost: false },
      { productId: null, productName: 'Lạ', date: '2026-06-01', revenue: 50000, cost: 0, missingCost: false },
    ];
    const adSpend: PnlAdSpend[] = [
      { productId: 'A', productName: 'Mẫu A', date: '2026-06-01', spend: 100000 },
    ];
    const r = buildPnlReport(lines, adSpend);

    expect(r.rows).toHaveLength(1);
    const a = r.rows[0];
    expect(a.productId).toBe('A');
    expect(a.revenueCod).toBe(600000);
    expect(a.costProduct).toBe(300000);
    expect(a.adSpend).toBe(100000);
    expect(a.operations).toBe(0);
    expect(a.profit).toBe(200000); // 600k - 300k - 100k - 0
    expect(a.margin).toBeCloseTo(200000 / 600000);
    expect(a.daily).toHaveLength(2);
    expect(a.daily.find(d => d.date === '2026-06-01')!.profit).toBe(50000); // 300k-150k-100k

    expect(r.unmatched).toEqual({ revenueCod: 50000, costProduct: 0 });
    expect(r.totals.profit).toBe(200000);
  });

  it('sản phẩm chỉ có quảng cáo, 0 doanh thu → lỗ = -spend; đánh dấu thiếu giá vốn', () => {
    const lines: PnlLine[] = [
      { productId: 'B', productName: 'Mẫu B', date: '2026-06-01', revenue: 100000, cost: 0, missingCost: true },
    ];
    const adSpend: PnlAdSpend[] = [
      { productId: 'C', productName: 'Mẫu C', date: '2026-06-01', spend: 80000 },
    ];
    const r = buildPnlReport(lines, adSpend);
    const c = r.rows.find(x => x.productId === 'C')!;
    expect(c.revenueCod).toBe(0);
    expect(c.profit).toBe(-80000);
    const b = r.rows.find(x => x.productId === 'B')!;
    expect(b.missingProductionPrice).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `npx jest src/analytics/pnl.util.spec.ts`
Expected: FAIL — `Cannot find module './pnl.util'`.

- [ ] **Step 3: Viết implementation** — `src/analytics/pnl.util.ts`:

```ts
export interface PnlLine {
  productId: string | null; // null = không khớp sản phẩm
  productName: string;
  date: string; // 'YYYY-MM-DD'
  revenue: number;
  cost: number;
  missingCost: boolean;
}

export interface PnlAdSpend {
  productId: string;
  productName: string;
  date: string; // 'YYYY-MM-DD'
  spend: number;
}

export interface PnlRowDaily {
  date: string;
  adSpend: number;
  revenueCod: number;
  costProduct: number;
  operations: number;
  profit: number;
}

export interface PnlRow {
  productId: string | null;
  productName: string;
  adSpend: number;
  revenueCod: number;
  costProduct: number;
  operations: number;
  profit: number;
  margin: number | null;
  missingProductionPrice: boolean;
  daily: PnlRowDaily[];
}

export interface PnlReport {
  rows: PnlRow[];
  unmatched: { revenueCod: number; costProduct: number };
  totals: { adSpend: number; revenueCod: number; costProduct: number; operations: number; profit: number };
}

interface Acc {
  productName: string;
  missingCost: boolean;
  daily: Map<string, { adSpend: number; revenueCod: number; costProduct: number }>;
}

const emptyDay = () => ({ adSpend: 0, revenueCod: 0, costProduct: 0 });

/** Tổng hợp lãi/lỗ theo sản phẩm (+ chi tiết theo ngày). operations = 0 ở v1. */
export function buildPnlReport(lines: PnlLine[], adSpend: PnlAdSpend[]): PnlReport {
  const byProduct = new Map<string, Acc>();
  const unmatched = { revenueCod: 0, costProduct: 0 };

  const ensure = (id: string, name: string): Acc => {
    let acc = byProduct.get(id);
    if (!acc) {
      acc = { productName: name, missingCost: false, daily: new Map() };
      byProduct.set(id, acc);
    } else if (!acc.productName && name) {
      acc.productName = name;
    }
    return acc;
  };

  for (const ln of lines) {
    if (!ln.productId) {
      unmatched.revenueCod += ln.revenue;
      unmatched.costProduct += ln.cost;
      continue;
    }
    const acc = ensure(ln.productId, ln.productName);
    if (ln.missingCost) acc.missingCost = true;
    const d = acc.daily.get(ln.date) ?? emptyDay();
    d.revenueCod += ln.revenue;
    d.costProduct += ln.cost;
    acc.daily.set(ln.date, d);
  }

  for (const s of adSpend) {
    const acc = ensure(s.productId, s.productName);
    const d = acc.daily.get(s.date) ?? emptyDay();
    d.adSpend += s.spend;
    acc.daily.set(s.date, d);
  }

  const rows: PnlRow[] = [];
  const totals = { adSpend: 0, revenueCod: 0, costProduct: 0, operations: 0, profit: 0 };

  for (const [productId, acc] of byProduct) {
    const daily: PnlRowDaily[] = [...acc.daily.entries()]
      .map(([date, v]) => ({
        date,
        adSpend: v.adSpend,
        revenueCod: v.revenueCod,
        costProduct: v.costProduct,
        operations: 0,
        profit: v.revenueCod - v.costProduct - v.adSpend - 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const adSpendSum = daily.reduce((s, d) => s + d.adSpend, 0);
    const revenueCod = daily.reduce((s, d) => s + d.revenueCod, 0);
    const costProduct = daily.reduce((s, d) => s + d.costProduct, 0);
    const profit = revenueCod - costProduct - adSpendSum - 0;

    rows.push({
      productId,
      productName: acc.productName,
      adSpend: adSpendSum,
      revenueCod,
      costProduct,
      operations: 0,
      profit,
      margin: revenueCod > 0 ? profit / revenueCod : null,
      missingProductionPrice: acc.missingCost,
      daily,
    });

    totals.adSpend += adSpendSum;
    totals.revenueCod += revenueCod;
    totals.costProduct += costProduct;
    totals.profit += profit;
  }

  rows.sort((a, b) => b.revenueCod - a.revenueCod || b.adSpend - a.adSpend);
  return { rows, unmatched, totals };
}
```

- [ ] **Step 4: Chạy test để thấy pass**

Run: `npx jest src/analytics/pnl.util.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/analytics/pnl.util.ts src/analytics/pnl.util.spec.ts
git commit -m "feat(analytics): ham thuan buildPnlReport + unit test"
```

---

### Task 3: Backend — DTO + service (fetch prisma) + module + đăng ký

**Files:**
- Create: `src/analytics/dto/upsert-ad-map.dto.ts`, `src/analytics/analytics.service.ts`, `src/analytics/analytics.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `buildPnlReport`, `PnlLine`, `PnlAdSpend` (Task 2); `PrismaService`.
- Produces: `AnalyticsService.productPnl(effectiveStoreId, from, to, platform, source)`, `.listAdMap(effectiveStoreId, platform, accountId?)`, `.upsertAdMap(effectiveStoreId, dto)`; `UpsertAdMapDto`.

- [ ] **Step 1: DTO** — `src/analytics/dto/upsert-ad-map.dto.ts`:

```ts
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertAdMapDto {
  @ApiPropertyOptional({ default: 'META' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ default: 'campaign' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ description: 'externalId của campaign (AdCampaign.externalId)' })
  @IsString()
  @IsNotEmpty()
  adEntityExternalId: string;

  @ApiProperty({ nullable: true, description: 'productId; null = gỡ map' })
  @ValidateIf((o) => o.productId !== null && o.productId !== undefined)
  @IsString()
  productId: string | null;
}
```

- [ ] **Step 2: Service** — `src/analytics/analytics.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildPnlReport, PnlLine, PnlAdSpend } from './pnl.util';
import { UpsertAdMapDto } from './dto/upsert-ad-map.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeName(s: string | null | undefined): string {
    return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private toDayStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private parseSources(source?: string): string[] | undefined {
    if (!source) return undefined;
    const arr = source.split(',').map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }

  async productPnl(
    effectiveStoreId: string | null,
    fromStr: string,
    toStr: string,
    platform = 'META',
    source?: string,
  ) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    const sources = this.parseSources(source);

    // --- Đơn COD đã thu, theo ngày paidAt ?? updatedAt ---
    const orders = await this.prisma.order.findMany({
      where: {
        paymentMethod: 'COD',
        status: { in: ['PAYMENT_COLLECTED', 'COMPLETED'] },
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
        ...(sources ? { source: { in: sources } } : {}),
        OR: [
          { paidAt: { gte: from, lte: to } },
          { paidAt: null, updatedAt: { gte: from, lte: to } },
        ],
      },
      select: {
        paidAt: true,
        updatedAt: true,
        items: { select: { productId: true, productName: true, quantity: true, price: true } },
      },
    });

    // --- Lookup sản phẩm (theo id + theo tên chuẩn hoá) ---
    const products = await this.prisma.product.findMany({
      where: effectiveStoreId ? { storeId: effectiveStoreId } : {},
      select: { id: true, name: true, productionPrice: true },
    });
    const prodById = new Map(products.map((p) => [p.id, p]));
    const byName = new Map<string, { id: string; name: string; productionPrice: number | null }>();
    const dupNames = new Set<string>();
    for (const p of products) {
      const key = this.normalizeName(p.name);
      if (byName.has(key)) dupNames.add(key);
      else byName.set(key, p);
    }

    const lines: PnlLine[] = [];
    for (const o of orders) {
      const date = this.toDayStr(o.paidAt ?? o.updatedAt);
      for (const it of o.items) {
        let prod = it.productId ? prodById.get(it.productId) : undefined;
        if (!prod && !it.productId && it.productName) {
          const key = this.normalizeName(it.productName);
          if (!dupNames.has(key)) prod = byName.get(key);
        }
        const qty = it.quantity || 0;
        const productionPrice = prod?.productionPrice ?? null;
        lines.push({
          productId: prod?.id ?? null,
          productName: prod?.name ?? (it.productName || 'Không tên'),
          date,
          revenue: (it.price || 0) * qty,
          cost: (productionPrice ?? 0) * qty,
          missingCost: !!prod && productionPrice === null,
        });
      }
    }

    // --- Spend theo sản phẩm qua map campaign ---
    const maps = await this.prisma.adProductMap.findMany({
      where: {
        platform,
        level: 'campaign',
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      select: { adEntityExternalId: true, productId: true },
    });

    const adSpend: PnlAdSpend[] = [];
    if (maps.length) {
      const extIds = [...new Set(maps.map((m) => m.adEntityExternalId))];
      const camps = await this.prisma.adCampaign.findMany({
        where: { platform, externalId: { in: extIds } },
        select: { id: true, externalId: true },
      });
      const prodByExt = new Map(maps.map((m) => [m.adEntityExternalId, m.productId]));
      const prodByCampId = new Map<string, string>();
      for (const c of camps) {
        const pid = prodByExt.get(c.externalId);
        if (pid) prodByCampId.set(c.id, pid);
      }
      const campIds = [...prodByCampId.keys()];
      if (campIds.length) {
        const insights = await this.prisma.adInsight.findMany({
          where: {
            platform,
            level: 'campaign',
            campaignId: { in: campIds },
            date: { gte: from, lte: to },
            ...(effectiveStoreId ? { account: { storeId: effectiveStoreId } } : {}),
          },
          select: { campaignId: true, date: true, spend: true },
        });
        for (const ins of insights) {
          const pid = ins.campaignId ? prodByCampId.get(ins.campaignId) : undefined;
          if (!pid) continue;
          adSpend.push({
            productId: pid,
            productName: prodById.get(pid)?.name ?? '',
            date: this.toDayStr(ins.date),
            spend: ins.spend ?? 0,
          });
        }
      }
    }

    const report = buildPnlReport(lines, adSpend);
    return { from: fromStr, to: toStr, ...report };
  }

  async listAdMap(effectiveStoreId: string | null, platform = 'META', accountId?: string) {
    const campaigns = await this.prisma.adCampaign.findMany({
      where: {
        platform,
        ...(accountId ? { accountId } : {}),
        ...(effectiveStoreId ? { account: { storeId: effectiveStoreId } } : {}),
      },
      orderBy: { name: 'asc' },
      select: { externalId: true, name: true, status: true },
    });
    const extIds = campaigns.map((c) => c.externalId);
    const maps = extIds.length
      ? await this.prisma.adProductMap.findMany({
          where: { platform, level: 'campaign', adEntityExternalId: { in: extIds } },
          select: { adEntityExternalId: true, productId: true, product: { select: { id: true, name: true } } },
        })
      : [];
    const mapByExt = new Map(maps.map((m) => [m.adEntityExternalId, m]));
    return campaigns.map((c) => {
      const m = mapByExt.get(c.externalId);
      return {
        campaignExternalId: c.externalId,
        campaignName: c.name,
        status: c.status,
        productId: m?.productId ?? null,
        productName: m?.product?.name ?? null,
      };
    });
  }

  async upsertAdMap(effectiveStoreId: string | null, dto: UpsertAdMapDto) {
    const platform = dto.platform || 'META';
    const level = dto.level || 'campaign';
    if (dto.productId === null || dto.productId === undefined) {
      await this.prisma.adProductMap.deleteMany({
        where: { platform, level, adEntityExternalId: dto.adEntityExternalId },
      });
      return { ok: true, removed: true };
    }
    const map = await this.prisma.adProductMap.upsert({
      where: {
        platform_level_adEntityExternalId: { platform, level, adEntityExternalId: dto.adEntityExternalId },
      },
      create: {
        platform,
        level,
        adEntityExternalId: dto.adEntityExternalId,
        productId: dto.productId,
        storeId: effectiveStoreId ?? null,
      },
      update: { productId: dto.productId },
    });
    return { ok: true, id: map.id };
  }
}
```

- [ ] **Step 3: Module** — `src/analytics/analytics.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```
> Lưu ý: `AnalyticsController` được tạo ở Task 4 — nếu build ở task này sẽ lỗi thiếu file; tạo controller trước hoặc build sau Task 4. (Plan này gộp build vào Task 4.)

- [ ] **Step 4: Đăng ký trong app.module** — `src/app.module.ts`: thêm import (cạnh các import module khác) và thêm `AnalyticsModule` vào mảng `imports` (sau `OrderSourcesModule`):

```ts
import { AnalyticsModule } from './analytics/analytics.module';
```
```ts
    OrderSourcesModule,
    AnalyticsModule,
```

- [ ] **Step 5: Commit**

```bash
git add src/analytics/dto src/analytics/analytics.service.ts src/analytics/analytics.module.ts src/app.module.ts
git commit -m "feat(analytics): service P&L + ad-map (chua co controller)"
```

---

### Task 4: Backend — controller + build verify

**Files:**
- Create: `src/analytics/analytics.controller.ts`

**Interfaces:**
- Consumes: `AnalyticsService` (Task 3), guards/decorators auth.
- Produces: `GET /api/analytics/product-pnl`, `GET /api/analytics/ad-map`, `PUT /api/analytics/ad-map`.

- [ ] **Step 1: Controller** — `src/analytics/analytics.controller.ts`:

```ts
import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { AnalyticsService } from './analytics.service';
import { UpsertAdMapDto } from './dto/upsert-ad-map.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('product-pnl')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Lãi/lỗ theo sản phẩm (đơn COD đã thu + spend Meta đã map)' })
  productPnl(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('platform') platform?: string,
    @Query('source') source?: string,
  ) {
    return this.analytics.productPnl(effectiveStoreId, from, to, platform || 'META', source);
  }

  @Get('ad-map')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'DS campaign + sản phẩm đã gán (cho màn gán)' })
  listAdMap(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('platform') platform?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.analytics.listAdMap(effectiveStoreId, platform || 'META', accountId);
  }

  @Put('ad-map')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Gán/gỡ campaign -> sản phẩm (productId=null để gỡ)' })
  upsertAdMap(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: UpsertAdMapDto,
  ) {
    return this.analytics.upsertAdMap(effectiveStoreId, dto);
  }
}
```

- [ ] **Step 2: Build backend**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi. (Nếu lỗi `Property 'adProductMap' does not exist on PrismaService` → Task 1 Step 5 `prisma generate` chưa chạy.)

- [ ] **Step 3: Verify endpoint thủ công** — khởi động backend, gọi (cookie admin):

Run:
```bash
curl -s "http://localhost:3901/api/analytics/product-pnl?from=2026-06-01&to=2026-06-30" -H "Cookie: crm_access_token=<TOKEN>" | head -c 400
```
Expected: JSON có `rows`, `unmatched`, `totals` (rows có thể rỗng nếu chưa map campaign). Không 500.

- [ ] **Step 4: Commit**

```bash
git add src/analytics/analytics.controller.ts
git commit -m "feat(analytics): controller product-pnl + ad-map"
```

---

### Task 5: Frontend — sidebar 2 menu con

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx` (nhóm `Phân tích`)

**Interfaces:**
- Produces: route `/admin/analytics`, `/admin/analytics/ad-mapping` trong sidebar.

- [ ] **Step 1: Thay item placeholder** — đổi khối nhóm "Phân tích" thành:

```tsx
  {
    label: 'Phân tích',
    items: [
      { name: 'Lãi/Lỗ sản phẩm', href: '/admin/analytics', roles: ADMIN_MODERATOR },
      { name: 'Gán quảng cáo ↔ SP', href: '/admin/analytics/ad-mapping', roles: ADMIN_MODERATOR },
    ],
  },
```
> `isActive` dùng "khớp dài nhất thắng" nên `/admin/analytics` không sáng nhầm khi ở `/admin/analytics/ad-mapping`. Không cần sửa logic.

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(analytics): them 2 menu con duoi nhom Phan tich"
```

---

### Task 6: Frontend — màn Gán quảng cáo ↔ SP

**Files:**
- Create: `src/app/admin/analytics/ad-mapping/page.tsx`, `src/app/admin/analytics/ad-mapping/AdMappingClient.tsx`

**Interfaces:**
- Consumes: `GET /ads/accounts`, `GET /analytics/ad-map?accountId=`, `PUT /analytics/ad-map`, `GET /products/admin`.
- Produces: trang gán map.

- [ ] **Step 1: Server page** — `src/app/admin/analytics/ad-mapping/page.tsx`:

```tsx
export const dynamic = 'force-dynamic';
import AdMappingClient from './AdMappingClient';

export default function AdMappingPage() {
  return <AdMappingClient />;
}
```

- [ ] **Step 2: Client** — `src/app/admin/analytics/ad-mapping/AdMappingClient.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface AdAccount { id: string; name: string | null; }
interface AdMapRow {
  campaignExternalId: string;
  campaignName: string | null;
  status: string | null;
  productId: string | null;
  productName: string | null;
}
interface ProductOption { id: string; name: string; sku?: string | null; }
interface AdminProductsResponse { data: ProductOption[]; }

export default function AdMappingClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [rows, setRows] = useState<AdMapRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      apiClientClient.get<AdAccount[]>('/ads/accounts'),
      apiClientClient.get<AdminProductsResponse>('/products/admin', { params: { limit: 1000 } }),
    ])
      .then(([accs, prodRes]) => {
        const list = Array.isArray(accs) ? accs : [];
        setAccounts(list);
        setProducts(prodRes.data || []);
        if (list.length) setAccountId(list[0].id);
      })
      .catch(() => setMsg('Lỗi tải tài khoản/sản phẩm'));
  }, []);

  const loadRows = useCallback(async (accId: string) => {
    if (!accId) return;
    setLoading(true);
    try {
      const list = await apiClientClient.get<AdMapRow[]>('/analytics/ad-map', { params: { accountId: accId } });
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setMsg('Lỗi tải danh sách campaign');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRows(accountId); }, [accountId, loadRows]);

  const saveMap = async (extId: string, productId: string) => {
    setSavingId(extId);
    setMsg('');
    try {
      await apiClientClient.put('/analytics/ad-map', {
        platform: 'META',
        level: 'campaign',
        adEntityExternalId: extId,
        productId: productId || null,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.campaignExternalId === extId
            ? { ...r, productId: productId || null, productName: products.find((p) => p.id === productId)?.name ?? null }
            : r,
        ),
      );
    } catch {
      setMsg('Lỗi lưu map');
    } finally {
      setSavingId(null);
    }
  };

  const productOptions = [
    { value: '', label: '— Không gán —' },
    ...products.map((p) => ({ value: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name })),
  ];

  return (
    <div className="py-2">
      <h1 className="mb-1 text-2xl font-bold text-gray-800">Gán quảng cáo ↔ Sản phẩm</h1>
      <p className="mb-4 text-sm text-gray-500">Gán mỗi chiến dịch Meta cho 1 sản phẩm để phân tích lãi/lỗ tính được tiền quảng cáo.</p>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-gray-600">Tài khoản ads:</span>
        <Select
          className="w-72"
          value={accountId}
          onChange={setAccountId}
          placeholder="Chọn tài khoản"
          options={accounts.map((a) => ({ value: a.id, label: a.name || a.id }))}
        />
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3">Chiến dịch</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 w-80">Sản phẩm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Chưa có chiến dịch (đồng bộ Meta trước).</td></tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.campaignExternalId} className={`${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'} hover:bg-blue-50/40`}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{r.campaignName || r.campaignExternalId}</span>
                    {!r.productId && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">chưa gán</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.status || '—'}</td>
                  <td className="px-4 py-3">
                    <Select
                      className="w-72"
                      size="sm"
                      value={r.productId || ''}
                      onChange={(v) => saveMap(r.campaignExternalId, v)}
                      placeholder={savingId === r.campaignExternalId ? 'Đang lưu…' : '— Không gán —'}
                      options={productOptions}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify** — mở `/admin/analytics/ad-mapping`: chọn tài khoản → thấy campaign; chọn sản phẩm → lưu (reload trang vẫn giữ map). Nếu chưa đồng bộ Meta thì bảng rỗng (đúng).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/analytics/ad-mapping
git commit -m "feat(analytics): man gan quang cao <-> san pham"
```

---

### Task 7: Frontend — màn Lãi/Lỗ sản phẩm

**Files:**
- Create: `src/app/admin/analytics/page.tsx`, `src/app/admin/analytics/AnalyticsClient.tsx`

**Interfaces:**
- Consumes: `GET /analytics/product-pnl?from&to&source`, `GET /order-sources` (lọc nguồn).
- Produces: trang báo cáo P&L.

- [ ] **Step 1: Server page** — `src/app/admin/analytics/page.tsx`:

```tsx
export const dynamic = 'force-dynamic';
import AnalyticsClient from './AnalyticsClient';

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
```

- [ ] **Step 2: Client** — `src/app/admin/analytics/AnalyticsClient.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVnd } from '@/lib/format';
import Select from '@/components/ui/Select';

interface PnlRowDaily { date: string; adSpend: number; revenueCod: number; costProduct: number; operations: number; profit: number; }
interface PnlRow {
  productId: string | null;
  productName: string;
  adSpend: number; revenueCod: number; costProduct: number; operations: number;
  profit: number; margin: number | null; missingProductionPrice: boolean;
  daily: PnlRowDaily[];
}
interface PnlReport {
  from: string; to: string;
  rows: PnlRow[];
  unmatched: { revenueCod: number; costProduct: number };
  totals: { adSpend: number; revenueCod: number; costProduct: number; operations: number; profit: number };
}
interface OrderSource { code: string; name: string; }

// preset khoảng ngày (YYYY-MM-DD theo local)
function ymd(d: Date): string {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}
function presetRange(p: string): { from: string; to: string } {
  const now = new Date();
  const to = ymd(now);
  if (p === 'today') return { from: to, to };
  if (p === '7d') { const f = new Date(now); f.setDate(f.getDate() - 6); return { from: ymd(f), to }; }
  // month
  const f = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: ymd(f), to };
}

const profitClass = (v: number) => (v < 0 ? 'text-red-600' : 'text-green-600');

export default function AnalyticsClient() {
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState(() => presetRange('month').from);
  const [to, setTo] = useState(() => presetRange('month').to);
  const [source, setSource] = useState('');
  const [sources, setSources] = useState<OrderSource[]>([]);
  const [data, setData] = useState<PnlReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiClientClient.get<OrderSource[]>('/order-sources').then((s) => setSources(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async (f: string, t: string, src: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { from: f, to: t };
      if (src) params.source = src;
      const res = await apiClientClient.get<PnlReport>('/analytics/product-pnl', { params });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(from, to, source); }, [from, to, source, fetchData]);

  const applyPreset = (p: string) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = presetRange(p);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="py-2">
      <h1 className="mb-1 text-2xl font-bold text-gray-800">Lãi/Lỗ sản phẩm</h1>
      <p className="mb-4 text-sm text-gray-500">Doanh thu đơn COD đã thu − giá vốn (Giá sản xuất) − tiền quảng cáo Meta (theo map) − vận hành.</p>

      {/* Bộ lọc */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          className="w-40" size="sm" value={preset} onChange={applyPreset}
          options={[
            { value: 'today', label: 'Hôm nay' },
            { value: '7d', label: '7 ngày' },
            { value: 'month', label: 'Tháng này' },
            { value: 'custom', label: 'Tùy chọn' },
          ]}
        />
        {preset === 'custom' && (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
            <span className="text-gray-400">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          </>
        )}
        <Select
          className="w-48" size="sm" value={source} onChange={setSource}
          placeholder="Tất cả nguồn"
          options={[{ value: '', label: 'Tất cả nguồn' }, ...sources.map((s) => ({ value: s.code, label: s.name }))]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3 text-right">Quảng cáo</th>
              <th className="px-4 py-3 text-right">Doanh thu COD</th>
              <th className="px-4 py-3 text-right">Cost SP</th>
              <th className="px-4 py-3 text-right">Vận hành</th>
              <th className="px-4 py-3 text-right">Tổng lãi</th>
              <th className="px-4 py-3 text-right">Biên %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Đang tính…</td></tr>
            ) : !data || data.rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Chưa có dữ liệu trong khoảng này.</td></tr>
            ) : (
              data.rows.map((r, idx) => {
                const id = r.productId || `row-${idx}`;
                const open = !!expanded[id];
                return (
                  <>
                    <tr
                      key={id}
                      onClick={() => toggle(id)}
                      className={`cursor-pointer ${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'} hover:bg-blue-50/40`}
                    >
                      <td className="px-4 py-3">
                        <span className="mr-1 text-gray-400">{open ? '▾' : '▸'}</span>
                        <span className="font-medium text-gray-800">{r.productName}</span>
                        {r.missingProductionPrice && (
                          <span className="ml-2 text-amber-600" title="Sản phẩm chưa nhập Giá sản xuất → cost = 0, lãi bị ảo cao">⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{formatVnd(r.adSpend)}</td>
                      <td className="px-4 py-3 text-right">{formatVnd(r.revenueCod)}</td>
                      <td className="px-4 py-3 text-right">{formatVnd(r.costProduct)}</td>
                      <td className="px-4 py-3 text-right">{formatVnd(r.operations)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${profitClass(r.profit)}`}>{formatVnd(r.profit)}</td>
                      <td className={`px-4 py-3 text-right ${profitClass(r.profit)}`}>{r.margin === null ? '—' : `${Math.round(r.margin * 100)}%`}</td>
                    </tr>
                    {open && r.daily.map((d) => (
                      <tr key={`${id}-${d.date}`} className="bg-blue-50/20 text-xs text-gray-600">
                        <td className="px-4 py-2 pl-10">{d.date}</td>
                        <td className="px-4 py-2 text-right">{formatVnd(d.adSpend)}</td>
                        <td className="px-4 py-2 text-right">{formatVnd(d.revenueCod)}</td>
                        <td className="px-4 py-2 text-right">{formatVnd(d.costProduct)}</td>
                        <td className="px-4 py-2 text-right">{formatVnd(d.operations)}</td>
                        <td className={`px-4 py-2 text-right ${profitClass(d.profit)}`}>{formatVnd(d.profit)}</td>
                        <td className="px-4 py-2"></td>
                      </tr>
                    ))}
                  </>
                );
              })
            )}
          </tbody>
          {data && data.rows.length > 0 && (
            <tfoot>
              {(data.unmatched.revenueCod > 0 || data.unmatched.costProduct > 0) && (
                <tr className="bg-amber-50 text-amber-800">
                  <td className="px-4 py-3 font-medium">Chưa khớp sản phẩm</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">{formatVnd(data.unmatched.revenueCod)}</td>
                  <td className="px-4 py-3 text-right">{formatVnd(data.unmatched.costProduct)}</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3"></td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-800">
                <td className="px-4 py-3">Tổng cộng</td>
                <td className="px-4 py-3 text-right">{formatVnd(data.totals.adSpend)}</td>
                <td className="px-4 py-3 text-right">{formatVnd(data.totals.revenueCod)}</td>
                <td className="px-4 py-3 text-right">{formatVnd(data.totals.costProduct)}</td>
                <td className="px-4 py-3 text-right">{formatVnd(data.totals.operations)}</td>
                <td className={`px-4 py-3 text-right ${profitClass(data.totals.profit)}`}>{formatVnd(data.totals.profit)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check frontend**

Run (trong `frontend`): `npx tsc --noEmit`
Expected: không lỗi liên quan file mới. (Lưu ý JSX fragment `<>...</>` trong `.map` cần key trên thẻ con — đã đặt; nếu cảnh báo key, bọc `<Fragment key={id}>` từ `react`.)

- [ ] **Step 4: Verify** — mở `/admin/analytics`: đổi preset/nguồn → bảng cập nhật; bấm dòng SP → bung theo ngày; lãi xanh/lỗ đỏ; dòng Tổng cộng + "Chưa khớp" hiển thị.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/analytics/page.tsx src/app/admin/analytics/AnalyticsClient.tsx
git commit -m "feat(analytics): man Lai/Lo san pham (loc + bang + theo ngay)"
```

---

### Task 8: Docs + verify tổng thể

**Files:**
- Modify: `docs/02-backend-modules.md`, `docs/04-database.md`, `docs/changelog.md`

- [ ] **Step 1: docs/04-database.md** — trong `## 3. Catalog` (hoặc cuối nhóm Ads), thêm:

```markdown
- **AdProductMap** — map quảng cáo→sản phẩm: storeId?, platform, level('campaign'), adEntityExternalId (=AdCampaign.externalId), productId. Unique(platform,level,adEntityExternalId). Dùng cho phân tích lãi/lỗ.
```

- [ ] **Step 2: docs/02-backend-modules.md** — thêm mục module mới:

```markdown
## ANALYTICS (`src/analytics`)
Phân tích lãi/lỗ theo sản phẩm (on-the-fly). Quyền ADMIN/MODERATOR (scope effectiveStoreId).

| Method | Path | Việc |
|---|---|---|
| GET | /analytics/product-pnl?from&to&platform&source | Lãi/lỗ theo SP (+ daily) |
| GET | /analytics/ad-map?platform&accountId | DS campaign + SP đã gán |
| PUT | /analytics/ad-map | Gán/gỡ campaign→SP (productId=null để gỡ) |

**Logic**: doanh thu = đơn COD (PAYMENT_COLLECTED/COMPLETED), ngày = paidAt??updatedAt; cost = productionPrice×qty; quảng cáo = AdInsight.spend của campaign đã map (`AdProductMap`); vận hành = 0 (v1). Hàm thuần `buildPnlReport` (pnl.util.ts) tổng hợp. Đơn item không có productId → khớp theo tên; không khớp → nhóm "Chưa khớp".
```

- [ ] **Step 3: docs/changelog.md** — thêm mục đầu (dưới `---` đầu tiên):

```markdown
## 2026-06-30 — Tính năng: Phân tích Lãi/Lỗ sản phẩm (Phase 1)
- Module `src/analytics`: `GET /analytics/product-pnl`, `GET/PUT /analytics/ad-map`. Bảng mới `AdProductMap` (map campaign Meta → sản phẩm).
- Công thức/ngày/cost/vận hành: xem `docs/superpowers/specs/2026-06-30-product-pnl-analytics-design.md`.
- FE: nhóm "Phân tích" → 2 màn `/admin/analytics` (Lãi/Lỗ) + `/admin/analytics/ad-mapping` (gán).
- Phase 2 (sau): Google Ads, chi phí vận hành, map adset/ad, precompute.
```

- [ ] **Step 4: Verify build cả 2 phía**

Run (backend): `npx tsc --noEmit -p tsconfig.json` → không lỗi.
Run (frontend): `npx tsc --noEmit` → không lỗi.
Run (backend): `npx jest src/analytics/pnl.util.spec.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/02-backend-modules.md docs/04-database.md docs/changelog.md
git commit -m "docs(analytics): cap nhat tai lieu module phan tich lai/lo"
```

---

## Self-Review Notes (cho người thực thi)
- **Phụ thuộc Task 1 Step 5 (`prisma generate`)**: mọi truy cập `prisma.adProductMap.*` ở Task 3/4 chỉ build được sau khi generate. Nếu backend đang chạy → tắt rồi generate.
- **Lệch múi giờ**: gom theo ngày UTC (v1). Đơn cuối/đầu ngày VN có thể rơi sang ngày kế. Chấp nhận ở Phase 1.
- **1 campaign nhiều SP**: toàn bộ spend gán cho 1 SP đã map (chưa chia tỷ lệ) — đúng giới hạn spec.
- **Totals KHÔNG gồm "Chưa khớp"** (chỉ cộng các dòng sản phẩm); nhóm "Chưa khớp" hiển thị riêng ở tfoot.
- **JSX Fragment trong map (Task 7)**: nếu linter báo thiếu key trên `<>`, đổi `<>` → `import { Fragment } from 'react'` và `<Fragment key={id}>`.
</content>
</invoke>

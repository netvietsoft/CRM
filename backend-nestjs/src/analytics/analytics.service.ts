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

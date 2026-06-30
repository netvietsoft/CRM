import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const n = (v: number | null | undefined) => v ?? 0;

/** Truy vấn/tổng hợp chỉ số quảng cáo cho dashboard (đọc từ AdInsight level=campaign). */
@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateWhere(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
    const w: { gte?: Date; lte?: Date } = {};
    if (from) w.gte = new Date(from);
    if (to) w.lte = new Date(to);
    return w.gte || w.lte ? w : undefined;
  }

  /** Điều kiện scope đa cửa hàng: non-admin (effectiveStoreId != null) chỉ thấy account của store mình. */
  private accountScope(effectiveStoreId: string | null) {
    return effectiveStoreId ? { account: { storeId: effectiveStoreId } } : {};
  }

  private derive(spend: number, impressions: number, clicks: number, results: number) {
    return {
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      cpc: clicks ? spend / clicks : 0,
      cpm: impressions ? (spend / impressions) * 1000 : 0,
      costPerResult: results ? spend / results : 0,
    };
  }

  async listAccounts(effectiveStoreId: string | null) {
    return this.prisma.adAccount.findMany({
      where: effectiveStoreId ? { storeId: effectiveStoreId } : {},
      orderBy: { createdAt: 'asc' },
      select: { id: true, externalId: true, platform: true, name: true, currency: true, status: true, lastSyncedAt: true },
    });
  }

  async summary(effectiveStoreId: string | null, from?: string, to?: string, accountId?: string) {
    const where: Record<string, unknown> = { level: 'campaign', ...this.accountScope(effectiveStoreId) };
    const dr = this.dateWhere(from, to);
    if (dr) where.date = dr;
    if (accountId) where.accountId = accountId;
    const agg = await this.prisma.adInsight.aggregate({
      where,
      _sum: { spend: true, impressions: true, reach: true, clicks: true, uniqueClicks: true, results: true },
    });
    const s = agg._sum;
    const spend = n(s.spend), impressions = n(s.impressions), clicks = n(s.clicks), results = n(s.results);
    return {
      spend,
      impressions,
      reach: n(s.reach),
      clicks,
      uniqueClicks: n(s.uniqueClicks),
      results,
      ...this.derive(spend, impressions, clicks, results),
    };
  }

  async campaigns(effectiveStoreId: string | null, from?: string, to?: string, accountId?: string) {
    const where: Record<string, unknown> = { level: 'campaign', ...this.accountScope(effectiveStoreId) };
    const dr = this.dateWhere(from, to);
    if (dr) where.date = dr;
    if (accountId) where.accountId = accountId;

    const grouped = await this.prisma.adInsight.groupBy({
      by: ['campaignId'],
      where,
      _sum: { spend: true, impressions: true, reach: true, clicks: true, results: true },
    });
    const ids = grouped.map((g) => g.campaignId).filter((x): x is string => !!x);
    const camps = await this.prisma.adCampaign.findMany({
      where: { id: { in: ids } },
      select: { id: true, externalId: true, name: true, status: true, objective: true, dailyBudget: true, lifetimeBudget: true },
    });
    const cmap = new Map(camps.map((c) => [c.id, c]));

    return grouped
      .filter((g) => g.campaignId)
      .map((g) => {
        const c = cmap.get(g.campaignId as string);
        const spend = n(g._sum.spend), impressions = n(g._sum.impressions), clicks = n(g._sum.clicks), results = n(g._sum.results);
        return {
          id: g.campaignId,
          externalId: c?.externalId ?? null,
          name: c?.name ?? null,
          status: c?.status ?? null,
          objective: c?.objective ?? null,
          dailyBudget: c?.dailyBudget ?? null,
          lifetimeBudget: c?.lifetimeBudget ?? null,
          spend,
          impressions,
          reach: n(g._sum.reach),
          clicks,
          results,
          ...this.derive(spend, impressions, clicks, results),
        };
      })
      .sort((a, b) => b.spend - a.spend);
  }

  async campaignInsights(effectiveStoreId: string | null, campaignId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { level: 'campaign', campaignId, ...this.accountScope(effectiveStoreId) };
    const dr = this.dateWhere(from, to);
    if (dr) where.date = dr;
    return this.prisma.adInsight.findMany({
      where,
      orderBy: { date: 'asc' },
      select: { date: true, spend: true, impressions: true, reach: true, clicks: true, results: true, ctr: true, cpc: true, cpm: true },
    });
  }
}

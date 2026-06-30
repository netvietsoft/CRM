import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const n = (v: number | null | undefined) => v ?? 0;

type AdMeta = { externalId: string | null; name: string | null; status: string | null; objective: string | null; dailyBudget: number | null; lifetimeBudget: number | null };

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

  // Ưu tiên xác định "loại kết quả" (giống connector.deriveResults): mua > lead > tin nhắn > click.
  private readonly RESULT_PRIORITY = [
    'offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase', 'onsite_conversion.purchase',
    'onsite_web_purchase', 'onsite_app_purchase', 'onsite_web_app_purchase',
    'onsite_conversion.lead', 'lead', 'onsite_web_lead', 'onsite_conversion.lead_grouped',
    'onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection',
    'link_click',
  ];

  /** Cộng dồn actions theo action_type qua nhiều dòng insight → { action_type: tổng value }. */
  private sumActions(list: Array<{ actions: unknown }>): Record<string, number> {
    const m: Record<string, number> = {};
    for (const ins of list) {
      const acts = ins.actions;
      if (!Array.isArray(acts)) continue;
      for (const a of acts as Array<{ action_type?: string; value?: unknown }>) {
        const t = a?.action_type;
        if (!t) continue;
        m[t] = (m[t] ?? 0) + (Number(a.value) || 0);
      }
    }
    return m;
  }

  private resultTypeFrom(actionSums: Record<string, number>): string | null {
    for (const t of this.RESULT_PRIORITY) if ((actionSums[t] ?? 0) > 0) return t;
    return null;
  }

  // Loại "giá trị mua" theo ưu tiên (omni_purchase đã dedup) → tránh cộng trùng nhiều loại purchase.
  private readonly PURCHASE_VALUE_PRIORITY = [
    'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase', 'onsite_conversion.purchase',
    'onsite_web_purchase', 'onsite_app_purchase', 'onsite_web_app_purchase',
  ];

  /** Cộng dồn action_values theo action_type → { action_type: tổng giá trị tiền }. */
  private sumActionValues(list: Array<{ actionValues: unknown }>): Record<string, number> {
    const m: Record<string, number> = {};
    for (const ins of list) {
      const vals = ins.actionValues;
      if (!Array.isArray(vals)) continue;
      for (const a of vals as Array<{ action_type?: string; value?: unknown }>) {
        const t = a?.action_type;
        if (!t) continue;
        m[t] = (m[t] ?? 0) + (Number(a.value) || 0);
      }
    }
    return m;
  }

  /** Giá trị mua = giá trị của loại purchase ưu tiên cao nhất có mặt (đã dedup). */
  private purchaseValueFrom(valueSums: Record<string, number>): number {
    for (const t of this.PURCHASE_VALUE_PRIORITY) if ((valueSums[t] ?? 0) > 0) return valueSums[t];
    return 0;
  }

  /** Gom insight theo key (campaignId/adSetId/adId), cộng chỉ số + actions, suy loại kết quả. */
  private aggregateByKey<T extends { spend: number | null; impressions: number | null; reach: number | null; clicks: number | null; results: number | null; actions: unknown; actionValues: unknown }>(
    insights: T[],
    keyOf: (i: T) => string | null,
    metaFor: (id: string) => AdMeta,
  ) {
    const groups = new Map<string, T[]>();
    for (const ins of insights) {
      const k = keyOf(ins);
      if (!k) continue;
      const arr = groups.get(k);
      if (arr) arr.push(ins);
      else groups.set(k, [ins]);
    }
    const rows = Array.from(groups.entries()).map(([id, list]) => {
      const spend = list.reduce((s, i) => s + n(i.spend), 0);
      const impressions = list.reduce((s, i) => s + n(i.impressions), 0);
      const reach = list.reduce((s, i) => s + n(i.reach), 0);
      const clicks = list.reduce((s, i) => s + n(i.clicks), 0);
      const results = list.reduce((s, i) => s + n(i.results), 0);
      const metrics = this.sumActions(list);
      const purchaseValue = this.purchaseValueFrom(this.sumActionValues(list));
      return {
        id,
        ...metaFor(id),
        spend, impressions, reach, clicks, results,
        ...this.derive(spend, impressions, clicks, results),
        resultType: this.resultTypeFrom(metrics),
        purchaseValue,
        roas: spend > 0 ? purchaseValue / spend : 0,
        adsCostPct: purchaseValue > 0 ? (spend / purchaseValue) * 100 : 0,
        metrics,
      };
    });
    return rows.sort((a, b) => b.spend - a.spend);
  }

  async listAccounts(effectiveStoreId: string | null) {
    return this.prisma.adAccount.findMany({
      where: effectiveStoreId ? { storeId: effectiveStoreId } : {},
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        externalId: true,
        platform: true,
        name: true,
        currency: true,
        status: true,
        accountStatus: true,
        balance: true,
        spendCap: true,
        amountSpent: true,
        fundingDetails: true,
        businessExternalId: true,
        businessName: true,
        lastSyncedAt: true,
      },
    });
  }

  async listPages(effectiveStoreId: string | null) {
    return this.prisma.adPage.findMany({
      where: effectiveStoreId ? { storeId: effectiveStoreId } : {},
      orderBy: [{ fanCount: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        externalId: true,
        name: true,
        category: true,
        tasks: true,
        fanCount: true,
        followersCount: true,
        link: true,
        verificationStatus: true,
        isPublished: true,
        businessExternalId: true,
        lastSyncedAt: true,
      },
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

    // Tổng giá trị mua (từ action_values) → ROAS & % Ads Cost toàn tài khoản.
    const valueRows = await this.prisma.adInsight.findMany({ where, select: { actionValues: true } });
    const purchaseValue = this.purchaseValueFrom(this.sumActionValues(valueRows));

    return {
      spend,
      impressions,
      reach: n(s.reach),
      clicks,
      uniqueClicks: n(s.uniqueClicks),
      results,
      purchaseValue,
      roas: spend > 0 ? purchaseValue / spend : 0,
      adsCostPct: purchaseValue > 0 ? (spend / purchaseValue) * 100 : 0,
      ...this.derive(spend, impressions, clicks, results),
    };
  }

  async campaigns(effectiveStoreId: string | null, from?: string, to?: string, accountId?: string) {
    const where: Record<string, unknown> = { level: 'campaign', ...this.accountScope(effectiveStoreId) };
    const dr = this.dateWhere(from, to);
    if (dr) where.date = dr;
    if (accountId) where.accountId = accountId;

    const insights = await this.prisma.adInsight.findMany({
      where,
      select: { campaignId: true, spend: true, impressions: true, reach: true, clicks: true, results: true, actions: true, actionValues: true },
    });
    const ids = [...new Set(insights.map((i) => i.campaignId).filter((x): x is string => !!x))];
    const camps = await this.prisma.adCampaign.findMany({
      where: { id: { in: ids } },
      select: { id: true, externalId: true, name: true, status: true, objective: true, dailyBudget: true, lifetimeBudget: true },
    });
    const cmap = new Map(camps.map((c) => [c.id, c]));

    return this.aggregateByKey(insights, (i) => i.campaignId, (id) => {
      const c = cmap.get(id);
      return {
        externalId: c?.externalId ?? null,
        name: c?.name ?? null,
        status: c?.status ?? null,
        objective: c?.objective ?? null,
        dailyBudget: c?.dailyBudget ?? null,
        lifetimeBudget: c?.lifetimeBudget ?? null,
      };
    });
  }

  /** Nhóm quảng cáo (ad set) thuộc 1 chiến dịch — cùng shape với campaigns() để FE drill-down. */
  async adSets(effectiveStoreId: string | null, campaignId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { level: 'adset', campaignId, ...this.accountScope(effectiveStoreId) };
    const dr = this.dateWhere(from, to);
    if (dr) where.date = dr;

    const insights = await this.prisma.adInsight.findMany({
      where,
      select: { adSetId: true, spend: true, impressions: true, reach: true, clicks: true, results: true, actions: true, actionValues: true },
    });
    const ids = [...new Set(insights.map((i) => i.adSetId).filter((x): x is string => !!x))];
    const sets = await this.prisma.adSet.findMany({
      where: { id: { in: ids } },
      select: { id: true, externalId: true, name: true, status: true, optimizationGoal: true, dailyBudget: true, lifetimeBudget: true },
    });
    const smap = new Map(sets.map((s) => [s.id, s]));

    return this.aggregateByKey(insights, (i) => i.adSetId, (id) => {
      const s = smap.get(id);
      return {
        externalId: s?.externalId ?? null,
        name: s?.name ?? null,
        status: s?.status ?? null,
        objective: s?.optimizationGoal ?? null,
        dailyBudget: s?.dailyBudget ?? null,
        lifetimeBudget: s?.lifetimeBudget ?? null,
      };
    });
  }

  /** Quảng cáo (ad) thuộc 1 nhóm quảng cáo — cùng shape với campaigns() để FE drill-down. */
  async ads(effectiveStoreId: string | null, adSetId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { level: 'ad', adSetId, ...this.accountScope(effectiveStoreId) };
    const dr = this.dateWhere(from, to);
    if (dr) where.date = dr;

    const insights = await this.prisma.adInsight.findMany({
      where,
      select: { adId: true, spend: true, impressions: true, reach: true, clicks: true, results: true, actions: true, actionValues: true },
    });
    const ids = [...new Set(insights.map((i) => i.adId).filter((x): x is string => !!x))];
    const adRows = await this.prisma.ad.findMany({
      where: { id: { in: ids } },
      select: { id: true, externalId: true, name: true, status: true },
    });
    const amap = new Map(adRows.map((a) => [a.id, a]));

    return this.aggregateByKey(insights, (i) => i.adId, (id) => {
      const a = amap.get(id);
      return {
        externalId: a?.externalId ?? null,
        name: a?.name ?? null,
        status: a?.status ?? null,
        objective: null,
        dailyBudget: null,
        lifetimeBudget: null,
      };
    });
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

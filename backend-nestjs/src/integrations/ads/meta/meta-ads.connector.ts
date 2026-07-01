import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MetaAdsClient } from './meta-ads.client';
import { decryptToken } from '../../facebook/token-vault';

export interface MetaConfig {
  /** Store sở hữu credentials. null = cấu hình env (toàn hệ thống, chỉ ADMIN thấy). */
  storeId: string | null;
  token: string;
  businessId: string | null;
  accountIds: string[]; // danh sách act_<id> tường minh; RỖNG = tự phát hiện qua BM / /me/adaccounts
}

export interface NormBusiness {
  externalId: string;
  name: string | null;
  verificationStatus: string | null;
  raw: any;
}

// ===== Shape chuẩn hoá (connector trả về, sync persist) =====
export interface NormAccount {
  externalId: string;
  name: string | null;
  currency: string | null;
  timezoneName: string | null;
  status: string | null;
  accountStatus: number | null;
  disableReason: number | null;
  balance: number | null;
  amountSpent: number | null;
  spendCap: number | null;
  fundingSource: string | null;
  fundingDetails: any;
  businessExternalId: string | null;
  businessName: string | null;
  raw: any;
}
export interface NormEntity {
  externalId: string;
  name: string | null;
  status: string | null;
  raw: any;
}
export interface NormCampaign extends NormEntity {
  objective: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startTime: Date | null;
  stopTime: Date | null;
}
export interface NormAdSet extends NormEntity {
  campaignExternalId: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string | null;
  billingEvent: string | null;
  targeting: any;
  startTime: Date | null;
  stopTime: Date | null;
}
export interface NormAd extends NormEntity {
  campaignExternalId: string | null;
  adSetExternalId: string | null;
  creative: any;
}
export interface NormInsight {
  level: string;
  entityExternalId: string;
  campaignExternalId: string | null;
  adSetExternalId: string | null;
  adExternalId: string | null;
  date: Date;
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  uniqueClicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  frequency: number | null;
  results: number | null;
  costPerResult: number | null;
  actions: any;
  actionValues: any;
  raw: any;
}

export interface NormPage {
  externalId: string;
  name: string | null;
  category: string | null;
  tasks: string[] | null; // quyền token có trên page
  fanCount: number | null;
  followersCount: number | null;
  link: string | null;
  verificationStatus: string | null;
  isPublished: boolean | null;
  businessExternalId: string | null;
  raw: any;
}

// Loại action ưu tiên để suy ra "kết quả" (results). Giữ nguyên `actions` đầy đủ cho AI.
const RESULT_ACTION_PRIORITY = [
  'offsite_conversion.fb_pixel_purchase',
  'omni_purchase',
  'purchase',
  'onsite_conversion.purchase',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead_grouped',
  'lead',
  'onsite_conversion.messaging_conversation_started_7d',
  'link_click',
  'landing_page_view',
];

// Tiền tệ KHÔNG có phần thập phân (Meta trả minor unit = major unit, factor 1).
const ZERO_DECIMAL = new Set(['VND', 'JPY', 'KRW', 'CLP', 'ISK', 'HUF', 'TWD', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF', 'BIF', 'DJF', 'GNF', 'KMF', 'MGA', 'PYG', 'RWF']);
// Tiền tệ có 3 chữ số thập phân (factor 1000).
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

/** Hệ số quy đổi minor unit → major unit theo tiền tệ tài khoản (Meta trả tiền dạng minor unit). */
const minorFactor = (currency: string | null): number => {
  if (!currency) return 100;
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 1;
  if (THREE_DECIMAL.has(c)) return 1000;
  return 100;
};

const num = (v: any): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const int = (v: any): number | null => (v === null || v === undefined || v === '' ? null : parseInt(String(v), 10));
/** Số tiền minor-unit → major-unit theo tiền tệ (vd USD "1234" → 12.34; VND giữ nguyên). */
const money = (v: any, currency: string | null): number | null => {
  const raw = num(v);
  return raw === null ? null : raw / minorFactor(currency);
};
const dt = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const actId = (id: string): string => (/^act_/.test(id) ? id : `act_${id}`);

/**
 * Connector Meta: liệt kê NHIỀU ad account (BM/owned+client hoặc /me/adaccounts), rồi với mỗi account
 * lấy campaign/adset/ad + insights theo ngày, map sang shape chuẩn hoá. Mọi bản ghi giữ `raw`.
 */
@Injectable()
export class MetaAdsConnector {
  private readonly logger = new Logger(MetaAdsConnector.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MetaAdsClient,
  ) {}

  /**
   * TẤT CẢ cấu hình credentials Meta: mỗi StoreIntegration(META_ADS, active) → 1 config (kèm storeId).
   * Nếu KHÔNG có integration nào → fallback env (storeId = null). Rỗng nếu thiếu token hoàn toàn.
   */
  async getConfigs(): Promise<MetaConfig[]> {
    const integs = await this.prisma.storeIntegration.findMany({
      where: { platform: 'META_ADS', isActive: true },
    });

    const configs: MetaConfig[] = [];
    for (const integ of integs) {
      if (!integ.accessToken) continue;
      const meta: any = integ.metadata || {};
      configs.push({
        storeId: integ.storeId,
        token: integ.accessToken,
        businessId: meta.businessId ? String(meta.businessId) : null,
        accountIds: this.parseAccountIds(meta.adAccountId),
      });
    }

    // Fallback env CHỈ khi chưa có integration nào (tránh sync trùng).
    if (!configs.length) {
      const token = process.env.META_ADS_ACCESS_TOKEN || null;
      if (token) {
        configs.push({
          storeId: null,
          token,
          businessId: process.env.META_ADS_BUSINESS_ID || null,
          accountIds: this.parseAccountIds(process.env.META_ADS_ACCOUNT_ID),
        });
      }
    }
    // Bổ sung: mọi kết nối OAuth (FbConnection ACTIVE) → 1 config (token giải mã).
    const fbConns = await this.prisma.fbConnection.findMany({ where: { status: 'ACTIVE' } });
    for (const c of fbConns) {
      try {
        const token = decryptToken({ enc: c.tokenEnc, iv: c.tokenIv, tag: c.tokenTag });
        configs.push({ storeId: c.storeId ?? null, token, businessId: null, accountIds: [] });
      } catch (e) {
        this.logger.warn(`[MetaAds] Giải mã token FbConnection ${c.id} lỗi: ${(e as Error).message}`);
      }
    }
    return configs;
  }

  private parseAccountIds(raw: unknown): string[] {
    return String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(actId);
  }

  /**
   * Liệt kê TẤT CẢ ad account: ưu tiên danh sách tường minh → Business Manager (owned + client)
   * → fallback /me/adaccounts. Dedup theo id.
   */
  async listAdAccounts(cfg: MetaConfig): Promise<NormAccount[]> {
    const fields =
      'id,name,currency,timezone_name,account_status,disable_reason,balance,amount_spent,spend_cap,funding_source,funding_source_details,business_name,business{id,name}';
    let raws: any[] = [];

    if (cfg.accountIds.length) {
      for (const id of cfg.accountIds) {
        const a = await this.client.getNode(id, fields, cfg.token).catch((e) => {
          this.logger.warn(`[MetaAds] Không lấy được account ${id}: ${(e as Error).message}`);
          return null;
        });
        if (a) raws.push(a);
      }
    } else if (cfg.businessId) {
      const owned = await this.client.getEdge(`${cfg.businessId}/owned_ad_accounts`, { fields }, cfg.token).catch(() => []);
      const client = await this.client.getEdge(`${cfg.businessId}/client_ad_accounts`, { fields }, cfg.token).catch(() => []);
      raws = [...owned, ...client];
    } else {
      raws = await this.client.getEdge('me/adaccounts', { fields }, cfg.token).catch(() => []);
    }

    const seen = new Set<string>();
    const out: NormAccount[] = [];
    for (const a of raws) {
      if (!a?.id || seen.has(a.id)) continue;
      seen.add(a.id);
      const currency = a.currency ?? null;
      out.push({
        externalId: a.id,
        name: a.name ?? null,
        currency,
        timezoneName: a.timezone_name ?? null,
        status: a.account_status != null ? String(a.account_status) : null,
        accountStatus: int(a.account_status),
        disableReason: int(a.disable_reason),
        balance: money(a.balance, currency),
        amountSpent: money(a.amount_spent, currency),
        spendCap: money(a.spend_cap, currency),
        fundingSource: a.funding_source != null ? String(a.funding_source) : null,
        fundingDetails: a.funding_source_details ?? null,
        businessExternalId: a.business?.id ?? null,
        businessName: a.business?.name ?? a.business_name ?? null,
        raw: a,
      });
    }
    return out;
  }

  /** Chi tiết Business (verification_status) cho 1 BM id. Lỗi/thiếu quyền → trả null an toàn. */
  async fetchBusiness(token: string, businessExternalId: string): Promise<NormBusiness | null> {
    const b = await this.client
      .getNode(businessExternalId, 'id,name,verification_status', token)
      .catch((e) => {
        this.logger.warn(`[MetaAds] Không lấy được business ${businessExternalId}: ${(e as Error).message}`);
        return null;
      });
    if (!b?.id) return null;
    return {
      externalId: b.id,
      name: b.name ?? null,
      verificationStatus: b.verification_status ?? null,
      raw: b,
    };
  }

  /**
   * Liệt kê Fanpage + quyền (tasks): /me/accounts (có tasks) gộp với BM owned_pages
   * (bổ sung page chưa cấp token; không có tasks). Dedup theo id, ưu tiên bản có tasks.
   */
  async fetchPages(cfg: MetaConfig): Promise<NormPage[]> {
    const byId = new Map<string, NormPage>();
    const mine = await this.client
      .getEdge('me/accounts', { fields: 'id,name,category,tasks,fan_count,followers_count,link,verification_status,is_published' }, cfg.token)
      .catch(() => []);
    for (const pg of mine) {
      if (!pg?.id) continue;
      byId.set(pg.id, {
        externalId: pg.id,
        name: pg.name ?? null,
        category: pg.category ?? null,
        tasks: Array.isArray(pg.tasks) ? pg.tasks : null,
        fanCount: int(pg.fan_count),
        followersCount: int(pg.followers_count),
        link: pg.link ?? null,
        verificationStatus: pg.verification_status ?? null,
        isPublished: typeof pg.is_published === 'boolean' ? pg.is_published : null,
        businessExternalId: null,
        raw: pg,
      });
    }
    if (cfg.businessId) {
      const owned = await this.client
        .getEdge(`${cfg.businessId}/owned_pages`, { fields: 'id,name,category,verification_status,fan_count,link' }, cfg.token)
        .catch(() => []);
      for (const pg of owned) {
        if (!pg?.id) continue;
        const existing = byId.get(pg.id);
        if (existing) { existing.businessExternalId = cfg.businessId; continue; }
        byId.set(pg.id, {
          externalId: pg.id,
          name: pg.name ?? null,
          category: pg.category ?? null,
          tasks: null,
          fanCount: int(pg.fan_count),
          followersCount: null,
          link: pg.link ?? null,
          verificationStatus: pg.verification_status ?? null,
          isPublished: null,
          businessExternalId: cfg.businessId,
          raw: pg,
        });
      }
    }
    return [...byId.values()];
  }

  async fetchCampaigns(token: string, accountId: string, currency: string | null): Promise<NormCampaign[]> {
    const rows = await this.client.getEdge(
      `${accountId}/campaigns`,
      { fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time' },
      token,
    );
    return rows.map((c) => ({
      externalId: c.id,
      name: c.name ?? null,
      status: c.effective_status ?? c.status ?? null,
      objective: c.objective ?? null,
      dailyBudget: money(c.daily_budget, currency),
      lifetimeBudget: money(c.lifetime_budget, currency),
      startTime: dt(c.start_time),
      stopTime: dt(c.stop_time),
      raw: c,
    }));
  }

  async fetchAdSets(token: string, accountId: string, currency: string | null): Promise<NormAdSet[]> {
    const rows = await this.client.getEdge(
      `${accountId}/adsets`,
      {
        fields:
          'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting,start_time,end_time',
      },
      token,
    );
    return rows.map((s) => ({
      externalId: s.id,
      name: s.name ?? null,
      status: s.effective_status ?? s.status ?? null,
      campaignExternalId: s.campaign_id ?? null,
      dailyBudget: money(s.daily_budget, currency),
      lifetimeBudget: money(s.lifetime_budget, currency),
      optimizationGoal: s.optimization_goal ?? null,
      billingEvent: s.billing_event ?? null,
      targeting: s.targeting ?? null,
      startTime: dt(s.start_time),
      stopTime: dt(s.end_time),
      raw: s,
    }));
  }

  async fetchAds(token: string, accountId: string): Promise<NormAd[]> {
    const rows = await this.client.getEdge(
      `${accountId}/ads`,
      { fields: 'id,name,status,effective_status,campaign_id,adset_id,creative' },
      token,
    );
    return rows.map((a) => ({
      externalId: a.id,
      name: a.name ?? null,
      status: a.effective_status ?? a.status ?? null,
      campaignExternalId: a.campaign_id ?? null,
      adSetExternalId: a.adset_id ?? null,
      creative: a.creative ?? null,
      raw: a,
    }));
  }

  /** Insights theo NGÀY (time_increment=1) cho 1 cấp của 1 account. since/until: 'YYYY-MM-DD'. */
  async fetchInsights(
    token: string,
    accountId: string,
    level: 'campaign' | 'adset' | 'ad',
    since: string,
    until: string,
  ): Promise<NormInsight[]> {
    const rows = await this.client.getEdge(
      `${accountId}/insights`,
      {
        level,
        time_increment: '1',
        time_range: JSON.stringify({ since, until }),
        fields:
          'date_start,campaign_id,adset_id,ad_id,spend,impressions,reach,clicks,unique_clicks,ctr,cpc,cpm,frequency,actions,action_values',
      },
      token,
    );
    return rows.map((r) => {
      const entityExternalId = level === 'campaign' ? r.campaign_id : level === 'adset' ? r.adset_id : r.ad_id;
      const { results } = this.deriveResults(r.actions);
      const spend = num(r.spend);
      return {
        level,
        entityExternalId: String(entityExternalId),
        campaignExternalId: r.campaign_id ?? null,
        adSetExternalId: r.adset_id ?? null,
        adExternalId: r.ad_id ?? null,
        date: dt(r.date_start) as Date,
        spend,
        impressions: int(r.impressions),
        reach: int(r.reach),
        clicks: int(r.clicks),
        uniqueClicks: int(r.unique_clicks),
        ctr: num(r.ctr),
        cpc: num(r.cpc),
        cpm: num(r.cpm),
        frequency: num(r.frequency),
        results,
        costPerResult: results && results > 0 && spend != null ? spend / results : null,
        actions: r.actions ?? null,
        actionValues: r.action_values ?? null,
        raw: r,
      };
    });
  }

  /** Suy "kết quả" từ mảng actions theo độ ưu tiên; giữ nguyên actions cho phân tích sau. */
  private deriveResults(actions: any): { results: number | null; actionType: string | null } {
    if (!Array.isArray(actions) || actions.length === 0) return { results: null, actionType: null };
    for (const type of RESULT_ACTION_PRIORITY) {
      const hit = actions.find((a) => a?.action_type === type);
      if (hit) return { results: int(hit.value), actionType: type };
    }
    return { results: null, actionType: null };
  }
}

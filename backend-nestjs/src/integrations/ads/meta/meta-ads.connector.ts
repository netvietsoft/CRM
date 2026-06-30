import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MetaAdsClient } from './meta-ads.client';

export interface MetaCredentials {
  token: string;
  accountId: string; // luôn dạng act_<id>
}

// ===== Shape chuẩn hoá (connector trả về, sync persist) =====
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

const num = (v: any): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const int = (v: any): number | null => (v === null || v === undefined || v === '' ? null : parseInt(String(v), 10));
const dt = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Connector Meta: lấy account/campaign/adset/ad + insights theo ngày, map sang shape chuẩn hoá.
 * Mọi bản ghi giữ `raw` = payload gốc → không bỏ sót field.
 */
@Injectable()
export class MetaAdsConnector {
  private readonly logger = new Logger(MetaAdsConnector.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MetaAdsClient,
  ) {}

  /** Lấy credentials từ StoreIntegration(META_ADS) hoặc env. Null nếu chưa cấu hình. */
  async getCredentials(): Promise<MetaCredentials | null> {
    const integ = await this.prisma.storeIntegration.findFirst({
      where: { platform: 'META_ADS', isActive: true },
    });
    const meta: any = integ?.metadata || {};
    const token = integ?.accessToken || process.env.META_ADS_ACCESS_TOKEN || null;
    let accountId = meta.adAccountId || process.env.META_ADS_ACCOUNT_ID || null;
    if (!token || !accountId) return null;
    accountId = String(accountId);
    if (!/^act_/.test(accountId)) accountId = `act_${accountId}`;
    return { token, accountId };
  }

  async fetchAccount(creds: MetaCredentials): Promise<NormEntity & { currency: string | null; timezoneName: string | null }> {
    const a = await this.client.getNode(
      creds.accountId,
      'id,account_id,name,currency,timezone_name,account_status',
      creds.token,
    );
    return {
      externalId: a?.id || creds.accountId,
      name: a?.name ?? null,
      status: a?.account_status != null ? String(a.account_status) : null,
      currency: a?.currency ?? null,
      timezoneName: a?.timezone_name ?? null,
      raw: a,
    };
  }

  async fetchCampaigns(creds: MetaCredentials): Promise<NormCampaign[]> {
    const rows = await this.client.getEdge(
      `${creds.accountId}/campaigns`,
      { fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time' },
      creds.token,
    );
    return rows.map((c) => ({
      externalId: c.id,
      name: c.name ?? null,
      status: c.effective_status ?? c.status ?? null,
      objective: c.objective ?? null,
      dailyBudget: num(c.daily_budget),
      lifetimeBudget: num(c.lifetime_budget),
      startTime: dt(c.start_time),
      stopTime: dt(c.stop_time),
      raw: c,
    }));
  }

  async fetchAdSets(creds: MetaCredentials): Promise<NormAdSet[]> {
    const rows = await this.client.getEdge(
      `${creds.accountId}/adsets`,
      {
        fields:
          'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting,start_time,end_time',
      },
      creds.token,
    );
    return rows.map((s) => ({
      externalId: s.id,
      name: s.name ?? null,
      status: s.effective_status ?? s.status ?? null,
      campaignExternalId: s.campaign_id ?? null,
      dailyBudget: num(s.daily_budget),
      lifetimeBudget: num(s.lifetime_budget),
      optimizationGoal: s.optimization_goal ?? null,
      billingEvent: s.billing_event ?? null,
      targeting: s.targeting ?? null,
      startTime: dt(s.start_time),
      stopTime: dt(s.end_time),
      raw: s,
    }));
  }

  async fetchAds(creds: MetaCredentials): Promise<NormAd[]> {
    const rows = await this.client.getEdge(
      `${creds.accountId}/ads`,
      { fields: 'id,name,status,effective_status,campaign_id,adset_id,creative' },
      creds.token,
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

  /** Insights theo NGÀY (time_increment=1) cho 1 cấp. since/until: 'YYYY-MM-DD'. */
  async fetchInsights(creds: MetaCredentials, level: 'campaign' | 'adset' | 'ad', since: string, until: string): Promise<NormInsight[]> {
    const rows = await this.client.getEdge(
      `${creds.accountId}/insights`,
      {
        level,
        time_increment: '1',
        time_range: JSON.stringify({ since, until }),
        fields:
          'date_start,campaign_id,adset_id,ad_id,spend,impressions,reach,clicks,unique_clicks,ctr,cpc,cpm,frequency,actions,action_values',
      },
      creds.token,
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

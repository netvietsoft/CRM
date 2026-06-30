import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaAdsConnector, NormAccount } from './meta/meta-ads.connector';

export interface AdsAccountSyncResult {
  account: string;
  name: string | null;
  campaigns: number;
  adSets: number;
  ads: number;
  insightRows: number;
}
export interface AdsSyncResult {
  configured: boolean;
  accounts?: number;
  campaigns?: number;
  adSets?: number;
  ads?: number;
  insightRows?: number;
  perAccount?: AdsAccountSyncResult[];
}

/**
 * Đồng bộ TOÀN BỘ dữ liệu Meta Ads về CRM cho MỌI ad account (BM owned+client / danh sách / /me/adaccounts):
 * account → campaign → adset → ad → insights (4 cấp, theo ngày). Upsert idempotent. Mặc định 90 ngày.
 */
@Injectable()
export class AdsSyncService {
  private readonly logger = new Logger(AdsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connector: MetaAdsConnector,
  ) {}

  private iso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  async syncAll(days = 90): Promise<AdsSyncResult> {
    const cfg = await this.connector.getConfig();
    if (!cfg) {
      this.logger.warn('[Ads] Chưa cấu hình credentials Meta (StoreIntegration META_ADS hoặc env) — bỏ qua sync.');
      return { configured: false };
    }

    const accounts = await this.connector.listAdAccounts(cfg);
    if (!accounts.length) {
      this.logger.warn('[Ads] Token hợp lệ nhưng không tìm thấy ad account nào (kiểm Business ID / quyền ads_read).');
      return { configured: true, accounts: 0, campaigns: 0, adSets: 0, ads: 0, insightRows: 0, perAccount: [] };
    }

    const totals = { campaigns: 0, adSets: 0, ads: 0, insightRows: 0 };
    const perAccount: AdsAccountSyncResult[] = [];
    for (const acc of accounts) {
      try {
        const r = await this.syncAccount(cfg.token, acc, days);
        totals.campaigns += r.campaigns;
        totals.adSets += r.adSets;
        totals.ads += r.ads;
        totals.insightRows += r.insightRows;
        perAccount.push({ account: acc.externalId, name: acc.name, ...r });
      } catch (e) {
        this.logger.error(`[Ads] Account ${acc.externalId} sync lỗi: ${(e as Error).message}`);
      }
    }

    const result: AdsSyncResult = { configured: true, accounts: accounts.length, ...totals, perAccount };
    this.logger.log(`[Ads] Sync xong ${accounts.length} tài khoản: ${JSON.stringify(totals)}`);
    return result;
  }

  /** Đồng bộ 1 ad account: account → campaigns → adsets → ads → insights. */
  private async syncAccount(
    token: string,
    acc: NormAccount,
    days: number,
  ): Promise<{ campaigns: number; adSets: number; ads: number; insightRows: number }> {
    // 1) Account
    const account = await this.prisma.adAccount.upsert({
      where: { platform_externalId: { platform: 'META', externalId: acc.externalId } },
      create: {
        platform: 'META',
        externalId: acc.externalId,
        name: acc.name,
        currency: acc.currency,
        timezoneName: acc.timezoneName,
        status: acc.status,
        raw: acc.raw,
      },
      update: { name: acc.name, currency: acc.currency, timezoneName: acc.timezoneName, status: acc.status, raw: acc.raw },
    });
    const accountId = account.id;

    // 2) Campaigns
    const campaigns = await this.connector.fetchCampaigns(token, acc.externalId);
    const campMap = new Map<string, string>();
    for (const c of campaigns) {
      const data = {
        accountId,
        name: c.name,
        status: c.status,
        objective: c.objective,
        dailyBudget: c.dailyBudget,
        lifetimeBudget: c.lifetimeBudget,
        startTime: c.startTime,
        stopTime: c.stopTime,
        raw: c.raw,
      };
      const row = await this.prisma.adCampaign.upsert({
        where: { platform_externalId: { platform: 'META', externalId: c.externalId } },
        create: { platform: 'META', externalId: c.externalId, ...data },
        update: data,
      });
      campMap.set(c.externalId, row.id);
    }

    // 3) Ad sets
    const adSets = await this.connector.fetchAdSets(token, acc.externalId);
    const setMap = new Map<string, string>();
    for (const s of adSets) {
      const data = {
        accountId,
        campaignId: s.campaignExternalId ? campMap.get(s.campaignExternalId) ?? null : null,
        name: s.name,
        status: s.status,
        dailyBudget: s.dailyBudget,
        lifetimeBudget: s.lifetimeBudget,
        optimizationGoal: s.optimizationGoal,
        billingEvent: s.billingEvent,
        targeting: s.targeting ?? undefined,
        startTime: s.startTime,
        stopTime: s.stopTime,
        raw: s.raw,
      };
      const row = await this.prisma.adSet.upsert({
        where: { platform_externalId: { platform: 'META', externalId: s.externalId } },
        create: { platform: 'META', externalId: s.externalId, ...data },
        update: data,
      });
      setMap.set(s.externalId, row.id);
    }

    // 4) Ads
    const ads = await this.connector.fetchAds(token, acc.externalId);
    const adMap = new Map<string, string>();
    for (const a of ads) {
      const data = {
        accountId,
        campaignId: a.campaignExternalId ? campMap.get(a.campaignExternalId) ?? null : null,
        adSetId: a.adSetExternalId ? setMap.get(a.adSetExternalId) ?? null : null,
        name: a.name,
        status: a.status,
        creative: a.creative ?? undefined,
        raw: a.raw,
      };
      const row = await this.prisma.ad.upsert({
        where: { platform_externalId: { platform: 'META', externalId: a.externalId } },
        create: { platform: 'META', externalId: a.externalId, ...data },
        update: data,
      });
      adMap.set(a.externalId, row.id);
    }

    // 5) Insights (campaign + adset + ad), theo ngày
    const until = this.iso(new Date());
    const since = this.iso(new Date(Date.now() - days * 86_400_000));
    let insightRows = 0;
    for (const level of ['campaign', 'adset', 'ad'] as const) {
      const insights = await this.connector.fetchInsights(token, acc.externalId, level, since, until);
      for (const ins of insights) {
        if (!ins.date || !ins.entityExternalId || ins.entityExternalId === 'undefined') continue;
        const data = {
          accountId,
          campaignId: ins.campaignExternalId ? campMap.get(ins.campaignExternalId) ?? null : null,
          adSetId: ins.adSetExternalId ? setMap.get(ins.adSetExternalId) ?? null : null,
          adId: ins.adExternalId ? adMap.get(ins.adExternalId) ?? null : null,
          spend: ins.spend,
          impressions: ins.impressions,
          reach: ins.reach,
          clicks: ins.clicks,
          uniqueClicks: ins.uniqueClicks,
          ctr: ins.ctr,
          cpc: ins.cpc,
          cpm: ins.cpm,
          frequency: ins.frequency,
          results: ins.results,
          costPerResult: ins.costPerResult,
          actions: ins.actions ?? undefined,
          actionValues: ins.actionValues ?? undefined,
          raw: ins.raw,
        };
        await this.prisma.adInsight.upsert({
          where: {
            platform_level_entityExternalId_date: {
              platform: 'META',
              level,
              entityExternalId: ins.entityExternalId,
              date: ins.date,
            },
          },
          create: { platform: 'META', level, entityExternalId: ins.entityExternalId, date: ins.date, ...data },
          update: data,
        });
        insightRows++;
      }
    }

    await this.prisma.adAccount.update({ where: { id: accountId }, data: { lastSyncedAt: new Date() } });
    return { campaigns: campaigns.length, adSets: adSets.length, ads: ads.length, insightRows };
  }

  /** Cron 3h/lần. Tắt bằng env ADS_SYNC_ENABLED=false. Bỏ qua im lặng nếu chưa cấu hình. */
  @Cron('0 */3 * * *')
  async scheduledSync(): Promise<void> {
    if (process.env.ADS_SYNC_ENABLED === 'false') return;
    const cfg = await this.connector.getConfig();
    if (!cfg) return;
    try {
      await this.syncAll(90);
    } catch (e) {
      this.logger.error(`[Ads] Cron sync lỗi: ${(e as Error).message}`);
    }
  }
}

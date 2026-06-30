import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaAdsConnector, MetaConfig, NormAccount, NormPage } from './meta/meta-ads.connector';
import { ADS_SYNC_JOB, ADS_SYNC_QUEUE, AdsSyncJobData } from './ads.constants';

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
  pages?: number;
  campaigns?: number;
  adSets?: number;
  ads?: number;
  insightRows?: number;
  perAccount?: AdsAccountSyncResult[];
}

/**
 * Đồng bộ TOÀN BỘ dữ liệu Meta Ads về CRM cho MỌI ad account (BM owned+client / danh sách / /me/adaccounts):
 * account → campaign → adset → ad → insights (4 cấp, theo ngày). Upsert idempotent. Mặc định 90 ngày.
 * Mỗi credentials gắn với 1 store (qua StoreIntegration) → AdAccount mang storeId để scope đa cửa hàng.
 */
@Injectable()
export class AdsSyncService {
  private readonly logger = new Logger(AdsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connector: MetaAdsConnector,
    @Optional() @InjectQueue(ADS_SYNC_QUEUE) private readonly syncQueue?: Queue,
  ) {}

  private iso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Điểm vào từ API: đưa vào queue (chạy nền) nếu có Redis, ngược lại chạy inline.
   * effectiveStoreId: null = ADMIN (mọi store); ngược lại chỉ store đó.
   */
  async requestSync(days: number, effectiveStoreId: string | null): Promise<{ queued: boolean } & Partial<AdsSyncResult>> {
    if (this.syncQueue) {
      try {
        await this.syncQueue.add(
          ADS_SYNC_JOB,
          { days, effectiveStoreId } as AdsSyncJobData,
          { jobId: `ads-sync-${effectiveStoreId ?? 'all'}`, removeOnComplete: true, removeOnFail: 50 },
        );
        return { queued: true, configured: true };
      } catch (e) {
        this.logger.warn(`[Ads] Queue không khả dụng, chạy inline: ${(e as Error).message}`);
      }
    }
    const result = await this.syncAll(days, effectiveStoreId);
    return { queued: false, ...result };
  }

  /** Chạy đồng bộ thật (gọi trực tiếp bởi processor hoặc fallback inline). */
  async syncAll(days = 90, effectiveStoreId: string | null = null): Promise<AdsSyncResult> {
    let configs = await this.connector.getConfigs();
    // Non-admin: chỉ đồng bộ credentials của store mình.
    if (effectiveStoreId) configs = configs.filter((c) => c.storeId === effectiveStoreId);

    if (!configs.length) {
      this.logger.warn('[Ads] Chưa cấu hình credentials Meta (StoreIntegration META_ADS hoặc env) — bỏ qua sync.');
      return { configured: false };
    }

    const totals = { campaigns: 0, adSets: 0, ads: 0, insightRows: 0 };
    const perAccount: AdsAccountSyncResult[] = [];
    let accountCount = 0;
    let pageCount = 0;

    for (const cfg of configs) {
      // Fanpage sync trước (độc lập với ad account — config có thể chỉ có page).
      try {
        pageCount += await this.syncPages(cfg);
      } catch (e) {
        this.logger.error(`[Ads] Sync page (store ${cfg.storeId ?? 'env'}) lỗi: ${(e as Error).message}`);
      }

      const accounts = await this.connector.listAdAccounts(cfg);
      if (!accounts.length) {
        this.logger.warn(`[Ads] Token (store ${cfg.storeId ?? 'env'}) hợp lệ nhưng không có ad account (kiểm Business ID / quyền ads_read).`);
        continue;
      }
      accountCount += accounts.length;
      await this.syncBusinesses(cfg, accounts);

      for (const acc of accounts) {
        try {
          const r = await this.syncAccount(cfg.token, cfg.storeId, acc, days);
          totals.campaigns += r.campaigns;
          totals.adSets += r.adSets;
          totals.ads += r.ads;
          totals.insightRows += r.insightRows;
          perAccount.push({ account: acc.externalId, name: acc.name, ...r });
        } catch (e) {
          this.logger.error(`[Ads] Account ${acc.externalId} sync lỗi: ${(e as Error).message}`);
        }
      }
    }

    const result: AdsSyncResult = { configured: true, accounts: accountCount, pages: pageCount, ...totals, perAccount };
    this.logger.log(`[Ads] Sync xong ${accountCount} tài khoản, ${pageCount} page: ${JSON.stringify(totals)}`);
    return result;
  }

  /** Upsert Fanpage + quyền (tasks) cho 1 config. Gắn storeId để scope đa cửa hàng. */
  private async syncPages(cfg: MetaConfig): Promise<number> {
    const pages: NormPage[] = await this.connector.fetchPages(cfg);
    for (const pg of pages) {
      const data = {
        name: pg.name,
        category: pg.category,
        tasks: pg.tasks ?? undefined,
        fanCount: pg.fanCount,
        followersCount: pg.followersCount,
        link: pg.link,
        verificationStatus: pg.verificationStatus,
        isPublished: pg.isPublished,
        businessExternalId: pg.businessExternalId,
        lastSyncedAt: new Date(),
        raw: pg.raw,
      };
      await this.prisma.adPage.upsert({
        where: { platform_externalId: { platform: 'META', externalId: pg.externalId } },
        create: { platform: 'META', externalId: pg.externalId, storeId: cfg.storeId ?? undefined, ...data },
        update: { ...(cfg.storeId ? { storeId: cfg.storeId } : {}), ...data },
      });
    }
    return pages.length;
  }

  /** Upsert Business Manager (verification_status) từ các account đã liệt kê. Idempotent, không chặn sync. */
  private async syncBusinesses(cfg: MetaConfig, accounts: NormAccount[]): Promise<void> {
    const bizIds = [...new Set(accounts.map((a) => a.businessExternalId).filter((x): x is string => !!x))];
    for (const bizId of bizIds) {
      try {
        const biz = await this.connector.fetchBusiness(cfg.token, bizId);
        if (!biz) continue;
        const data = { name: biz.name, verificationStatus: biz.verificationStatus, raw: biz.raw };
        await this.prisma.adBusiness.upsert({
          where: { platform_externalId: { platform: 'META', externalId: biz.externalId } },
          create: { platform: 'META', externalId: biz.externalId, ...data },
          update: data,
        });
      } catch (e) {
        this.logger.warn(`[Ads] Business ${bizId} sync lỗi: ${(e as Error).message}`);
      }
    }
  }

  /** Đồng bộ 1 ad account: account → campaigns → adsets → ads → insights. */
  private async syncAccount(
    token: string,
    storeId: string | null,
    acc: NormAccount,
    days: number,
  ): Promise<{ campaigns: number; adSets: number; ads: number; insightRows: number }> {
    // 1) Account
    const accountData = {
      name: acc.name,
      currency: acc.currency,
      timezoneName: acc.timezoneName,
      status: acc.status,
      accountStatus: acc.accountStatus,
      disableReason: acc.disableReason,
      balance: acc.balance,
      amountSpent: acc.amountSpent,
      spendCap: acc.spendCap,
      fundingSource: acc.fundingSource,
      fundingDetails: acc.fundingDetails ?? undefined,
      businessExternalId: acc.businessExternalId,
      businessName: acc.businessName,
      raw: acc.raw,
    };
    const account = await this.prisma.adAccount.upsert({
      where: { platform_externalId: { platform: 'META', externalId: acc.externalId } },
      // storeId chỉ set khi có (credentials env → null, không ghi đè store đã gắn).
      create: { platform: 'META', externalId: acc.externalId, storeId: storeId ?? undefined, ...accountData },
      update: { ...(storeId ? { storeId } : {}), ...accountData },
    });
    const accountId = account.id;

    // 2) Campaigns
    const campaigns = await this.connector.fetchCampaigns(token, acc.externalId, acc.currency);
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
    const adSets = await this.connector.fetchAdSets(token, acc.externalId, acc.currency);
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
    const configs = await this.connector.getConfigs();
    if (!configs.length) return;
    try {
      await this.syncAll(90, null);
    } catch (e) {
      this.logger.error(`[Ads] Cron sync lỗi: ${(e as Error).message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookOAuthClient } from './facebook-oauth.client';

const ZERO = new Set(['VND','JPY','KRW','CLP','ISK','HUF','TWD','UGX','XAF','XOF','XPF','BIF','DJF','GNF','KMF','MGA','PYG','RWF']);
const THREE = new Set(['BHD','IQD','JOD','KWD','LYD','OMR','TND']);
const mf = (c: string | null) => (!c ? 100 : ZERO.has(c.toUpperCase()) ? 1 : THREE.has(c.toUpperCase()) ? 1000 : 100);
const num = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
const int = (v: any) => (v === null || v === undefined || v === '' ? null : parseInt(String(v), 10));
const money = (v: any, c: string | null) => { const r = num(v); return r === null ? null : r / mf(c); };

const ACC_FIELDS = 'id,name,currency,account_status,disable_reason,balance,amount_spent,spend_cap,funding_source,funding_source_details,business_name,business{id,name}';
const PAGE_FIELDS = 'id,name,category,verification_status,fan_count,link';

export interface DiscoverySummary {
  me: { id: string; name: string | null };
  businesses: number;
  adAccounts: number;
  pages: number;
}

/** Từ 1 user token: liệt kê & upsert TẤT CẢ BM / ad account / page vào bảng sẵn có, tag storeId. */
@Injectable()
export class FacebookDiscoveryService {
  private readonly logger = new Logger(FacebookDiscoveryService.name);

  constructor(private readonly prisma: PrismaService, private readonly client: FacebookOAuthClient) {}

  async run(token: string, storeId: string | null): Promise<DiscoverySummary> {
    const me = await this.client.getNode('me', 'id,name', token).catch(() => ({}));
    const accSeen = new Set<string>();
    const pageSeen = new Set<string>();
    let bizCount = 0;

    // 1) Businesses
    const businesses = await this.client.getEdge('me/businesses', { fields: 'id,name,verification_status' }, token).catch(() => []);
    for (const b of businesses) {
      if (!b?.id) continue;
      bizCount++;
      await this.prisma.adBusiness.upsert({
        where: { platform_externalId: { platform: 'META', externalId: String(b.id) } },
        create: { platform: 'META', externalId: String(b.id), name: b.name ?? null, verificationStatus: b.verification_status ?? null, raw: b },
        update: { name: b.name ?? null, verificationStatus: b.verification_status ?? null, raw: b },
      });
      for (const edge of ['owned_ad_accounts', 'client_ad_accounts']) {
        for (const a of await this.client.getEdge(`${b.id}/${edge}`, { fields: ACC_FIELDS }, token).catch(() => [])) {
          await this.upsertAccount(a, storeId, accSeen);
        }
      }
      for (const edge of ['owned_pages', 'client_pages']) {
        for (const pg of await this.client.getEdge(`${b.id}/${edge}`, { fields: PAGE_FIELDS }, token).catch(() => [])) {
          await this.upsertPage(pg, storeId, pageSeen, String(b.id), null);
        }
      }
    }

    // 2) Ad accounts trực tiếp
    for (const a of await this.client.getEdge('me/adaccounts', { fields: ACC_FIELDS }, token).catch(() => [])) {
      await this.upsertAccount(a, storeId, accSeen);
    }

    // 3) Pages user quản lý (có tasks + page token) → AdPage + MsgPage
    const mine = await this.client.getEdge('me/accounts', { fields: 'id,name,category,tasks,access_token,fan_count,followers_count,link,verification_status,is_published' }, token).catch(() => []);
    for (const pg of mine) {
      await this.upsertPage(pg, storeId, pageSeen, null, pg.tasks ?? null);
      if (pg?.id && pg.access_token) {
        // MsgPage chỉ có name/accessToken/lastSyncedAt — metadata giàu (category, fanCount…) đã lưu ở AdPage (upsertPage trên).
        const data = {
          name: pg.name ?? null,
          accessToken: pg.access_token,
          lastSyncedAt: new Date(),
        };
        await this.prisma.msgPage.upsert({
          where: { platform_externalId: { platform: 'META', externalId: String(pg.id) } },
          create: { platform: 'META', externalId: String(pg.id), storeId: storeId ?? undefined, ...data },
          update: { ...(storeId ? { storeId } : {}), ...data },
        });
      }
    }

    return { me: { id: me?.id ?? null, name: me?.name ?? null }, businesses: bizCount, adAccounts: accSeen.size, pages: pageSeen.size };
  }

  private async upsertAccount(a: any, storeId: string | null, seen: Set<string>) {
    if (!a?.id || seen.has(a.id)) return;
    seen.add(a.id);
    const cur = a.currency ?? null;
    const data = {
      name: a.name ?? null, currency: cur, status: a.account_status != null ? String(a.account_status) : null,
      accountStatus: int(a.account_status), disableReason: int(a.disable_reason),
      balance: money(a.balance, cur), amountSpent: money(a.amount_spent, cur), spendCap: money(a.spend_cap, cur),
      fundingSource: a.funding_source != null ? String(a.funding_source) : null, fundingDetails: a.funding_source_details ?? undefined,
      businessExternalId: a.business?.id ?? null, businessName: a.business?.name ?? a.business_name ?? null, raw: a,
    };
    await this.prisma.adAccount.upsert({
      where: { platform_externalId: { platform: 'META', externalId: String(a.id) } },
      create: { platform: 'META', externalId: String(a.id), storeId: storeId ?? undefined, ...data },
      update: { ...(storeId ? { storeId } : {}), ...data },
    });
  }

  private async upsertPage(pg: any, storeId: string | null, seen: Set<string>, bizId: string | null, tasks: string[] | null) {
    if (!pg?.id || seen.has(pg.id)) return;
    seen.add(pg.id);
    const data = {
      name: pg.name ?? null, category: pg.category ?? null, ...(tasks ? { tasks } : {}),
      fanCount: int(pg.fan_count), link: pg.link ?? null, verificationStatus: pg.verification_status ?? null,
      ...(bizId ? { businessExternalId: bizId } : {}), raw: pg,
    };
    await this.prisma.adPage.upsert({
      where: { platform_externalId: { platform: 'META', externalId: String(pg.id) } },
      create: { platform: 'META', externalId: String(pg.id), storeId: storeId ?? undefined, ...data },
      update: { ...(storeId ? { storeId } : {}), ...data },
    });
  }
}

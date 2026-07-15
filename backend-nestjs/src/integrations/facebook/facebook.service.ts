import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookOAuthClient } from './facebook-oauth.client';
import { FacebookDiscoveryService } from './facebook-discovery.service';
import { signState, verifyState } from './oauth-state.util';
import { encryptToken, decryptToken } from './token-vault';

const SCOPES = [
  'public_profile', 'email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_metadata',
  'pages_read_user_content', 'pages_manage_posts', 'pages_messaging', 'ads_read', 'ads_management', 'business_management',
].join(',');

const GRAPH_DIALOG = (process.env.META_GRAPH_URL || 'https://graph.facebook.com/v19.0').match(/v[\d.]+/)?.[0] || 'v19.0';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: FacebookOAuthClient,
    private readonly discovery: FacebookDiscoveryService,
  ) {}

  /** URL dialog OAuth (FE mở). */
  startUrl(storeId: string | null, userId: string): string {
    const state = signState({ storeId, userId, nonce: Math.random().toString(36).slice(2), ts: Date.now() });
    const qs = new URLSearchParams({
      client_id: process.env.META_APP_ID || '',
      redirect_uri: process.env.META_OAUTH_REDIRECT_URI || '',
      state,
      response_type: 'code',
    });
    // App kiểu mới (use-case/Business) từ chối scope= (dialog tự đóng về /dialog/close):
    // bắt buộc thêm sản phẩm "Facebook Login for Business" + truyền config_id.
    const configId = process.env.META_LOGIN_CONFIG_ID || '';
    if (configId) {
      qs.set('config_id', configId);
    } else {
      qs.set('scope', SCOPES);
      qs.set('auth_type', 'rerequest');
    }
    return `https://www.facebook.com/${GRAPH_DIALOG}/dialog/oauth?${qs}`;
  }

  /** Callback: đổi code → long-lived token → lưu FbConnection (mã hoá) → discovery. */
  async handleCallback(code: string, state: string): Promise<{ ok: true; summary: unknown }> {
    const st = verifyState(state);
    if (!st) throw new BadRequestException('state không hợp lệ hoặc hết hạn');
    const short = await this.client.exchangeCode(code);
    const { token, expiresInSec } = await this.client.toLongLived(short);
    const me = await this.client.getNode('me', 'id,name', token);
    const fbUserId = String(me.id);
    const enc = encryptToken(token);
    const expiresAt = expiresInSec ? new Date(Date.now() + expiresInSec * 1000) : null;
    // findFirst + update/create (compound unique có storeId nullable → không dùng upsert cho chắc).
    const existing = await this.prisma.fbConnection.findFirst({ where: { storeId: st.storeId ?? null, fbUserId } });
    const data = { fbName: me.name ?? null, tokenEnc: enc.enc, tokenIv: enc.iv, tokenTag: enc.tag, tokenExpiresAt: expiresAt, status: 'ACTIVE', lastRefreshAt: new Date() };
    if (existing) {
      await this.prisma.fbConnection.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.fbConnection.create({ data: { storeId: st.storeId ?? undefined, fbUserId, scopes: SCOPES, ...data } });
    }
    const summary = await this.discovery.run(token, st.storeId ?? null);
    return { ok: true, summary };
  }

  async listConnections(effectiveStoreId: string | null) {
    return this.prisma.fbConnection.findMany({
      where: effectiveStoreId ? { storeId: effectiveStoreId } : {},
      orderBy: { createdAt: 'desc' },
      select: { id: true, fbUserId: true, fbName: true, status: true, tokenExpiresAt: true, lastRefreshAt: true, scopes: true, createdAt: true },
    });
  }

  async disconnect(effectiveStoreId: string | null, id: string) {
    const c = await this.prisma.fbConnection.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Không tìm thấy kết nối');
    if (effectiveStoreId && c.storeId !== effectiveStoreId) throw new ForbiddenException('Ngoài phạm vi cửa hàng');
    await this.prisma.fbConnection.delete({ where: { id } });
    return { ok: true };
  }

  async refresh(id: string): Promise<{ ok: boolean }> {
    const c = await this.prisma.fbConnection.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Không tìm thấy kết nối');
    try {
      const cur = decryptToken({ enc: c.tokenEnc, iv: c.tokenIv, tag: c.tokenTag });
      const { token, expiresInSec } = await this.client.toLongLived(cur);
      const enc = encryptToken(token);
      await this.prisma.fbConnection.update({
        where: { id },
        data: { tokenEnc: enc.enc, tokenIv: enc.iv, tokenTag: enc.tag, tokenExpiresAt: expiresInSec ? new Date(Date.now() + expiresInSec * 1000) : null, status: 'ACTIVE', lastRefreshAt: new Date() },
      });
      return { ok: true };
    } catch (e) {
      await this.prisma.fbConnection.update({ where: { id }, data: { status: 'EXPIRED' } });
      this.logger.warn(`[FB] refresh ${id} lỗi: ${(e as Error).message}`);
      return { ok: false };
    }
  }

  /** Cron 6h: gia hạn token sắp hết hạn (< 7 ngày). Tắt bằng FB_REFRESH_ENABLED=false. */
  @Cron('0 */6 * * *')
  async refreshExpiring(): Promise<void> {
    if (process.env.FB_REFRESH_ENABLED === 'false') return;
    const soon = new Date(Date.now() + 7 * 86_400_000);
    const list = await this.prisma.fbConnection.findMany({ where: { status: 'ACTIVE', tokenExpiresAt: { lt: soon } }, select: { id: true } });
    for (const c of list) await this.refresh(c.id).catch(() => {});
  }
}

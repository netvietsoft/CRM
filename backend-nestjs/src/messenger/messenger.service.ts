import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetaMessengerClient } from './meta-messenger.client';
import { AdminNotificationsGateway } from '../modules/admin-notifications/admin-notifications.gateway';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MetaMessengerClient,
    private readonly gateway: AdminNotificationsGateway,
  ) {}

  // ===== Webhook ingest =====
  async ingestEvent(body: any): Promise<void> {
    for (const entry of body?.entry ?? []) {
      const pageExternalId = String(entry.id);
      for (const m of entry.messaging ?? []) {
        await this.handleMessaging(pageExternalId, m).catch((e) =>
          this.logger.error(`[Messenger] ingest lỗi: ${(e as Error).message}`),
        );
      }
    }
  }

  private async handleMessaging(pageExternalId: string, m: any): Promise<void> {
    const page = await this.prisma.msgPage.findUnique({
      where: { platform_externalId: { platform: 'META', externalId: pageExternalId } },
    });
    if (!page || !m.message) return;

    const isEcho = !!m.message.is_echo;
    const psid = isEcho ? m.recipient?.id : m.sender?.id;
    if (!psid) return;

    const mid: string | undefined = m.message.mid;
    if (mid && (await this.prisma.msgMessage.findUnique({ where: { mid } }))) return; // idempotent

    const contact = await this.prisma.msgContact.upsert({
      where: { pageId_psid: { pageId: page.id, psid } },
      create: { pageId: page.id, psid },
      update: {},
    });
    const conv = await this.prisma.msgConversation.upsert({
      where: { pageId_contactId: { pageId: page.id, contactId: contact.id } },
      create: { pageId: page.id, contactId: contact.id },
      update: {},
    });

    const direction = isEcho ? 'OUT' : 'IN';
    const text = m.message.text ?? null;
    const attachments = m.message.attachments ?? undefined;
    await this.prisma.msgMessage.create({
      data: { conversationId: conv.id, mid, direction, text, attachments, status: 'DELIVERED' },
    });
    await this.prisma.msgConversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: new Date(Number(m.timestamp) || Date.now()),
        lastMessageText: text ?? '[đính kèm]',
        lastMessageDir: direction,
        ...(direction === 'IN' ? { unreadCount: { increment: 1 } } : {}),
      },
    });

    if (!contact.name) await this.enrichContact(page, contact.id, psid);
    this.gateway.emitMessengerMessage({ conversationId: conv.id, storeId: page.storeId, direction });
  }

  private async enrichContact(page: { accessToken: string | null }, contactId: string, psid: string): Promise<void> {
    if (!page.accessToken) return;
    const p = await this.client.getProfile(page.accessToken, psid).catch(() => ({} as any));
    if (p?.name || p?.profile_pic) {
      await this.prisma.msgContact.update({
        where: { id: contactId },
        data: { name: p.name ?? undefined, avatarUrl: p.profile_pic ?? undefined, raw: p as any },
      });
    }
  }

  // ===== Đọc (scope theo store qua page.storeId) =====
  private pageScope(effectiveStoreId: string | null) {
    return effectiveStoreId ? { storeId: effectiveStoreId } : {};
  }

  listPages(effectiveStoreId: string | null) {
    return this.prisma.msgPage.findMany({
      where: this.pageScope(effectiveStoreId),
      orderBy: { name: 'asc' },
      select: { id: true, externalId: true, name: true, subscribed: true, storeId: true, lastSyncedAt: true },
    });
  }

  listConversations(effectiveStoreId: string | null, pageId?: string, q?: string) {
    return this.prisma.msgConversation.findMany({
      where: {
        ...(pageId ? { pageId } : {}),
        page: this.pageScope(effectiveStoreId),
        ...(q ? { contact: { name: { contains: q } } } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
      select: {
        id: true,
        pageId: true,
        unreadCount: true,
        lastMessageAt: true,
        lastMessageText: true,
        lastMessageDir: true,
        assignedUserId: true,
        assignedUserName: true,
        labels: true,
        contact: { select: { psid: true, name: true, avatarUrl: true } },
        page: { select: { name: true, externalId: true } },
      },
    });
  }

  /** Gán/bỏ gán nhân viên xử lý. user=null → bỏ gán. */
  async assign(effectiveStoreId: string | null, convId: string, user: { id: string; name?: string | null; email?: string | null } | null) {
    await this.getScopedConversation(effectiveStoreId, convId);
    return this.prisma.msgConversation.update({
      where: { id: convId },
      data: {
        assignedUserId: user?.id ?? null,
        assignedUserName: user ? user.name || user.email || user.id : null,
      },
      select: { id: true, assignedUserId: true, assignedUserName: true },
    });
  }

  /** Đặt nhãn (mảng chuỗi) cho hội thoại. */
  async setLabels(effectiveStoreId: string | null, convId: string, labels: unknown) {
    await this.getScopedConversation(effectiveStoreId, convId);
    const clean = Array.isArray(labels)
      ? [...new Set(labels.map((s) => String(s).trim()).filter(Boolean))].slice(0, 20)
      : [];
    return this.prisma.msgConversation.update({ where: { id: convId }, data: { labels: clean }, select: { id: true, labels: true } });
  }

  async listMessages(effectiveStoreId: string | null, convId: string) {
    await this.getScopedConversation(effectiveStoreId, convId);
    return this.prisma.msgMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { id: true, direction: true, text: true, attachments: true, status: true, sentByUserId: true, createdAt: true },
    });
  }

  async markRead(effectiveStoreId: string | null, convId: string) {
    await this.getScopedConversation(effectiveStoreId, convId);
    await this.prisma.msgConversation.update({ where: { id: convId }, data: { unreadCount: 0 } });
    return { ok: true };
  }

  private async getScopedConversation(effectiveStoreId: string | null, convId: string) {
    const conv = await this.prisma.msgConversation.findUnique({
      where: { id: convId },
      include: { page: true, contact: true },
    });
    if (!conv) throw new NotFoundException('Không tìm thấy hội thoại');
    if (effectiveStoreId && conv.page.storeId !== effectiveStoreId) throw new ForbiddenException('Ngoài phạm vi cửa hàng');
    return conv;
  }

  // ===== Trả lời (Send API + cửa sổ 24h) =====
  async reply(effectiveStoreId: string | null, userId: string, convId: string, p: { text?: string; attachmentUrl?: string }) {
    if (!p.text && !p.attachmentUrl) throw new BadRequestException('Tin nhắn rỗng');
    const conv = await this.getScopedConversation(effectiveStoreId, convId);
    if (!conv.page.accessToken) throw new BadRequestException('Page chưa có access token (đăng ký lại page).');

    const lastIn = await this.prisma.msgMessage.findFirst({
      where: { conversationId: convId, direction: 'IN' },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastIn || Date.now() - lastIn.createdAt.getTime() > DAY_MS) {
      throw new BadRequestException('Ngoài cửa sổ 24h — không thể nhắn chủ động cho khách này.');
    }

    const r = await this.client.sendMessage(conv.page.accessToken, conv.contact.psid, p);
    await this.prisma.msgMessage.create({
      data: { conversationId: convId, mid: r.message_id, direction: 'OUT', text: p.text ?? null, status: 'SENT', sentByUserId: userId },
    });
    await this.prisma.msgConversation.update({
      where: { id: convId },
      data: { lastMessageAt: new Date(), lastMessageText: p.text ?? '[đính kèm]', lastMessageDir: 'OUT' },
    });
    this.gateway.emitMessengerMessage({ conversationId: convId, storeId: conv.page.storeId, direction: 'OUT' });
    return { ok: true };
  }

  // ===== Đăng ký page + subscribe + backfill =====
  /** Lấy page (token có quyền MESSAGING) từ StoreIntegration META_ADS → upsert MsgPage kèm page access token. */
  async registerPages(): Promise<{ registered: number }> {
    const integ = await this.prisma.storeIntegration.findFirst({ where: { platform: 'META_ADS', isActive: true } });
    const userToken = integ?.accessToken || process.env.META_ADS_ACCESS_TOKEN || null;
    if (!userToken) throw new BadRequestException('Chưa cấu hình token Meta (StoreIntegration META_ADS).');
    const storeId = integ?.storeId ?? null;

    const pages = await this.client.fetchManagedPages(userToken);
    let registered = 0;
    for (const pg of pages) {
      const tasks: string[] = Array.isArray(pg.tasks) ? pg.tasks : [];
      if (!pg?.id || !pg.access_token || !tasks.includes('MESSAGING')) continue;
      await this.prisma.msgPage.upsert({
        where: { platform_externalId: { platform: 'META', externalId: String(pg.id) } },
        create: { platform: 'META', externalId: String(pg.id), name: pg.name ?? null, accessToken: pg.access_token, storeId: storeId ?? undefined },
        update: { name: pg.name ?? null, accessToken: pg.access_token, ...(storeId ? { storeId } : {}) },
      });
      registered++;
    }
    return { registered };
  }

  async subscribePage(effectiveStoreId: string | null, externalId: string) {
    const page = await this.prisma.msgPage.findUnique({ where: { platform_externalId: { platform: 'META', externalId } } });
    if (!page) throw new NotFoundException('Chưa đăng ký page này (chạy registerPages trước).');
    if (effectiveStoreId && page.storeId !== effectiveStoreId) throw new ForbiddenException('Ngoài phạm vi cửa hàng');
    if (!page.accessToken) throw new BadRequestException('Page thiếu access token');
    const ok = await this.client.subscribeApp(page.accessToken, externalId);
    await this.prisma.msgPage.update({ where: { id: page.id }, data: { subscribed: ok, lastSyncedAt: new Date() } });
    return { subscribed: ok };
  }

  /** Kéo lịch sử hội thoại gần đây của 1 page (chuẩn hoá tối thiểu: tạo contact/conversation, tin text). */
  async backfill(effectiveStoreId: string | null, externalId: string): Promise<{ conversations: number; messages: number }> {
    const page = await this.prisma.msgPage.findUnique({ where: { platform_externalId: { platform: 'META', externalId } } });
    if (!page) throw new NotFoundException('Chưa đăng ký page');
    if (effectiveStoreId && page.storeId !== effectiveStoreId) throw new ForbiddenException('Ngoài phạm vi cửa hàng');
    if (!page.accessToken) throw new BadRequestException('Page thiếu access token');

    const convs = await this.client.fetchConversations(page.accessToken, externalId);
    let messages = 0;
    for (const c of convs) {
      const other = (c.participants?.data || []).find((pp: any) => String(pp.id) !== externalId);
      if (!other?.id) continue;
      const contact = await this.prisma.msgContact.upsert({
        where: { pageId_psid: { pageId: page.id, psid: String(other.id) } },
        create: { pageId: page.id, psid: String(other.id), name: other.name ?? null },
        update: { name: other.name ?? undefined },
      });
      const conv = await this.prisma.msgConversation.upsert({
        where: { pageId_contactId: { pageId: page.id, contactId: contact.id } },
        create: { pageId: page.id, contactId: contact.id },
        update: {},
      });
      const msgs = await this.client.fetchMessages(page.accessToken, c.id);
      for (const msg of msgs) {
        if (!msg?.id || (await this.prisma.msgMessage.findUnique({ where: { mid: msg.id } }))) continue;
        const direction = String(msg.from?.id) === externalId ? 'OUT' : 'IN';
        await this.prisma.msgMessage.create({
          data: { conversationId: conv.id, mid: msg.id, direction, text: msg.message ?? null, status: 'DELIVERED', createdAt: msg.created_time ? new Date(msg.created_time) : undefined },
        });
        messages++;
      }
      const last = msgs[0];
      if (last) {
        await this.prisma.msgConversation.update({
          where: { id: conv.id },
          data: { lastMessageAt: last.created_time ? new Date(last.created_time) : new Date(), lastMessageText: last.message ?? '[đính kèm]' },
        });
      }
    }
    await this.prisma.msgPage.update({ where: { id: page.id }, data: { lastSyncedAt: new Date() } });
    return { conversations: convs.length, messages };
  }
}

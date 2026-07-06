import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { MetaMessengerClient } from './meta-messenger.client';
import { AdminNotificationsGateway } from '../modules/admin-notifications/admin-notifications.gateway';
import { AiAgentService } from '../ai-agent/ai-agent.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trích SĐT VN đầu tiên từ text khách nhắn (0xxxxxxxxx / +84xxxxxxxxx, cho phép cách/./-). */
export function extractPhone(text: string): string | null {
  const m = text.replace(/[.\-\s]/g, '').match(/(?:\+?84|0)(\d{9})/);
  if (!m) return null;
  return '0' + m[1]; // chuẩn hoá về 0xxxxxxxxx
}

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MetaMessengerClient,
    private readonly gateway: AdminNotificationsGateway,
    private readonly moduleRef: ModuleRef,
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
    try {
      await this.prisma.msgMessage.create({
        data: { conversationId: conv.id, mid, direction, text, attachments, status: 'DELIVERED' },
      });
    } catch (e) {
      // Race: Meta gửi trùng cùng mid — bản ghi đã tồn tại (unique mid). Bỏ qua, KHÔNG tăng counter.
      if ((e as { code?: string }).code === 'P2002') return;
      throw e;
    }
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
    // Trích SĐT khách tự cung cấp trong tin đến (nếu contact chưa có).
    if (direction === 'IN' && text && !(contact as { phone?: string }).phone) {
      const phone = extractPhone(text);
      if (phone) await this.prisma.msgContact.update({ where: { id: contact.id }, data: { phone } });
    }
    this.gateway.emitMessengerMessage({ conversationId: conv.id, storeId: page.storeId, direction });
    if (direction === 'IN') {
      try { const ai = this.moduleRef.get(AiAgentService, { strict: false }); void ai?.onIncoming(conv.id); } catch { /* AI module chưa sẵn sàng */ }
    }
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
        assignedUserAvatar: true,
        labels: true,
        star: true,
        contact: { select: { psid: true, name: true, phone: true, avatarUrl: true, dob: true, gender: true } },
        page: { select: { name: true, externalId: true } },
      },
    });
  }

  /** Gán/bỏ gán nhân viên xử lý. user=null → bỏ gán. */
  async assign(effectiveStoreId: string | null, convId: string, user: { id: string; name?: string | null; email?: string | null; avatarUrl?: string | null } | null) {
    await this.getScopedConversation(effectiveStoreId, convId);
    return this.prisma.msgConversation.update({
      where: { id: convId },
      data: {
        assignedUserId: user?.id ?? null,
        assignedUserName: user ? user.name || user.email || user.id : null,
        assignedUserAvatar: user?.avatarUrl ?? null,
      },
      select: { id: true, assignedUserId: true, assignedUserName: true, assignedUserAvatar: true },
    });
  }

  /** Phân công hội thoại cho 1 nhân viên cụ thể (theo userId). userId rỗng → bỏ gán. */
  async assignToUser(effectiveStoreId: string | null, convId: string, userId: string | null) {
    if (!userId) return this.assign(effectiveStoreId, convId, null);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });
    return this.assign(effectiveStoreId, convId, user);
  }

  /** Đặt nhãn (mảng chuỗi) cho hội thoại. */
  /** Đặt sao ưu tiên: color ∈ {yellow,green,red} hoặc null (bỏ sao). */
  async setStar(effectiveStoreId: string | null, convId: string, color: string | null) {
    await this.getScopedConversation(effectiveStoreId, convId);
    const star = ['yellow', 'green', 'red'].includes(color || '') ? color : null;
    return this.prisma.msgConversation.update({ where: { id: convId }, data: { star }, select: { id: true, star: true } });
  }

  /** Đặt ngày sinh khách (từ 3A). Lưu MsgContact.dob + đồng bộ User.dob nếu khớp SĐT. dob='YYYY-MM-DD' hoặc null. */
  async setContactDob(effectiveStoreId: string | null, convId: string, dob: string | null) {
    await this.getScopedConversation(effectiveStoreId, convId);
    const conv = await this.prisma.msgConversation.findUnique({ where: { id: convId }, select: { contactId: true, contact: { select: { phone: true } } } });
    if (!conv) throw new NotFoundException('Không thấy hội thoại');
    const dobDate = dob ? new Date(dob) : null;
    await this.prisma.msgContact.update({ where: { id: conv.contactId }, data: { dob: dobDate } });
    // Chỉ đồng bộ User.dob khi SĐT khớp DUY NHẤT 1 user — tránh ghi đè nhầm nhiều user trùng số.
    if (conv.contact?.phone) {
      const matches = await this.prisma.user
        .findMany({ where: { phone: conv.contact.phone }, select: { id: true }, take: 2 })
        .catch(() => [] as { id: string }[]);
      if (matches.length === 1) {
        await this.prisma.user.update({ where: { id: matches[0].id }, data: { dob: dobDate } }).catch(() => {});
      }
    }
    return { ok: true, dob: dobDate };
  }

  /** Đặt giới tính khách (từ 3A). Lưu MsgContact.gender + đồng bộ User.gender nếu khớp SĐT duy nhất. gender ∈ MALE|FEMALE|OTHER|null. */
  async setContactGender(effectiveStoreId: string | null, convId: string, gender: string | null) {
    await this.getScopedConversation(effectiveStoreId, convId);
    const conv = await this.prisma.msgConversation.findUnique({ where: { id: convId }, select: { contactId: true, contact: { select: { phone: true } } } });
    if (!conv) throw new NotFoundException('Không thấy hội thoại');
    const g = gender && ['MALE', 'FEMALE', 'OTHER'].includes(gender) ? (gender as 'MALE' | 'FEMALE' | 'OTHER') : null;
    await this.prisma.msgContact.update({ where: { id: conv.contactId }, data: { gender: g } });
    // Chỉ đồng bộ User.gender khi SĐT khớp DUY NHẤT 1 user.
    if (conv.contact?.phone) {
      const matches = await this.prisma.user
        .findMany({ where: { phone: conv.contact.phone }, select: { id: true }, take: 2 })
        .catch(() => [] as { id: string }[]);
      if (matches.length === 1) {
        await this.prisma.user.update({ where: { id: matches[0].id }, data: { gender: g } }).catch(() => {});
      }
    }
    return { ok: true, gender: g };
  }

  async setLabels(effectiveStoreId: string | null, convId: string, labels: unknown) {
    await this.getScopedConversation(effectiveStoreId, convId);
    const clean = Array.isArray(labels)
      ? [...new Set(labels.map((s) => String(s).trim()).filter(Boolean))].slice(0, 20)
      : [];
    return this.prisma.msgConversation.update({ where: { id: convId }, data: { labels: clean }, select: { id: true, labels: true } });
  }

  /** Thống kê hội thoại/tin nhắn (thật, từ DB) trong `days` ngày gần đây, scope theo cửa hàng. */
  async stats(effectiveStoreId: string | null, days = 7) {
    const since = new Date(Date.now() - days * 86400000);
    let pageIds: string[] | undefined;
    if (effectiveStoreId) {
      const pages = await this.prisma.msgPage.findMany({ where: { storeId: effectiveStoreId }, select: { id: true } });
      pageIds = pages.map((p) => p.id);
    }
    const convWhere = pageIds ? { pageId: { in: pageIds } } : {};
    const convs = await this.prisma.msgConversation.findMany({ where: convWhere, select: { id: true, pageId: true, lastMessageDir: true, unreadCount: true } });
    const convIds = convs.map((c) => c.id);
    const convById = new Map(convs.map((c) => [c.id, c]));
    const msgs = await this.prisma.msgMessage.findMany({
      where: { conversationId: { in: convIds }, createdAt: { gte: since } },
      select: { direction: true, createdAt: true, sentByUserId: true, conversationId: true },
    });
    const newContacts = await this.prisma.msgContact.count({ where: { ...(pageIds ? { pageId: { in: pageIds } } : {}), createdAt: { gte: since } } });

    let messagesIn = 0, messagesOut = 0;
    const byDayMap: Record<string, { in: number; out: number }> = {};
    const staffMap: Record<string, number> = {};
    for (const m of msgs) {
      const day = m.createdAt.toISOString().slice(0, 10);
      byDayMap[day] ??= { in: 0, out: 0 };
      if (m.direction === 'IN') { messagesIn++; byDayMap[day].in++; }
      else { messagesOut++; byDayMap[day].out++; if (m.sentByUserId) staffMap[m.sentByUserId] = (staffMap[m.sentByUserId] || 0) + 1; }
    }
    const byDay = Object.entries(byDayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
    const users = await this.prisma.user.findMany({ where: { id: { in: Object.keys(staffMap) } }, select: { id: true, name: true } });
    const byStaff = Object.entries(staffMap)
      .map(([id, replies]) => ({ name: users.find((u) => u.id === id)?.name || 'NV', replies }))
      .sort((a, b) => b.replies - a.replies).slice(0, 10);

    // Thống kê theo TỪNG TRANG (page).
    type PageAgg = { conversations: number; in: number; out: number; unreplied: number; unread: number };
    const pageAgg: Record<string, PageAgg> = {};
    for (const c of convs) {
      const a = (pageAgg[c.pageId] ??= { conversations: 0, in: 0, out: 0, unreplied: 0, unread: 0 });
      a.conversations++; if (c.lastMessageDir === 'IN') a.unreplied++; a.unread += c.unreadCount || 0;
    }
    for (const m of msgs) {
      const c = convById.get(m.conversationId); if (!c) continue;
      const a = pageAgg[c.pageId]; if (!a) continue;
      if (m.direction === 'IN') a.in++; else a.out++;
    }
    const pagesList = await this.prisma.msgPage.findMany({ where: pageIds ? { id: { in: pageIds } } : {}, select: { id: true, name: true, externalId: true, subscribed: true } });
    const byPage = pagesList.map((p) => ({
      pageId: p.id, name: p.name || p.externalId, externalId: p.externalId, subscribed: p.subscribed,
      ...(pageAgg[p.id] || { conversations: 0, in: 0, out: 0, unreplied: 0, unread: 0 }),
    })).sort((a, b) => (b.in + b.out) - (a.in + a.out));

    return {
      days,
      totals: {
        messagesIn, messagesOut,
        conversations: convs.length,
        newContacts,
        unreplied: convs.filter((c) => c.lastMessageDir === 'IN').length,
        unread: convs.reduce((s, c) => s + (c.unreadCount || 0), 0),
      },
      byDay,
      byStaff,
      byPage,
    };
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

  // Public: cho module khác (ai-agent) kiểm tra quyền sở hữu theo store trước khi đọc/ghi.
  async assertConversationInStore(effectiveStoreId: string | null, convId: string) {
    return this.getScopedConversation(effectiveStoreId, convId);
  }
  async assertPageInStore(effectiveStoreId: string | null, pageId: string) {
    const page = await this.prisma.msgPage.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Không tìm thấy page');
    if (effectiveStoreId && page.storeId !== effectiveStoreId) throw new ForbiddenException('Ngoài phạm vi cửa hàng');
    return page;
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
  /** Kéo bài viết đã đăng của page (Graph API, page token). */
  async listPagePosts(effectiveStoreId: string | null, externalId: string) {
    const page = await this.prisma.msgPage.findUnique({ where: { platform_externalId: { platform: 'META', externalId } } });
    if (!page) throw new NotFoundException('Chưa đăng ký page này (đăng ký page trước).');
    if (effectiveStoreId && page.storeId !== effectiveStoreId) throw new ForbiddenException('Ngoài phạm vi cửa hàng');
    if (!page.accessToken) throw new BadRequestException('Page thiếu access token');
    const posts = await this.client.fetchPagePosts(page.accessToken, externalId);
    return posts.map((p: any) => ({
      id: p.id,
      message: p.message || '',
      createdTime: p.created_time || null,
      image: p.full_picture || null,
      permalink: p.permalink_url || null,
      likes: p.likes?.summary?.total_count ?? 0,
      comments: p.comments?.summary?.total_count ?? 0,
      shares: p.shares?.count ?? 0,
    }));
  }

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

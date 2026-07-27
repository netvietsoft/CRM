import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetaMessengerClient } from './meta-messenger.client';

/* Marketing Messages (Messenger):
 * 1. CRM gửi LỜI MỜI (template notification_messages) trong cửa sổ 24h.
 * 2. Khách bấm đồng ý → webhook `optin` trả notification_messages_token → lưu MsgMarketingOptin.
 * 3. Chiến dịch: chọn khách OPTED_IN → gửi bằng token (ngoài 24h) → trạng thái SENT/DELIVERED/READ theo receipt.
 * 4. Khách bấm STOP trong Messenger → webhook optin STOP → OPTED_OUT → CRM chặn gửi tiếp.
 */
@Injectable()
export class MessengerMarketingService {
  private readonly logger = new Logger(MessengerMarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: MetaMessengerClient,
  ) {}

  /** Gửi lời mời nhận tin tiếp thị vào 1 hội thoại. */
  async sendOptinRequest(convId: string, title?: string) {
    const conv = await this.prisma.msgConversation.findUnique({
      where: { id: convId },
      include: { page: true, contact: true },
    });
    if (!conv) throw new NotFoundException('Không tìm thấy hội thoại');
    if (!conv.page.accessToken) throw new BadRequestException('Page chưa có access token');
    // Lời mời opt-in là tin thường → chỉ gửi được TRONG CỬA SỔ 24H kể từ tin cuối của khách (luật Meta #10).
    const lastIn = await this.prisma.msgMessage.findFirst({
      where: { conversationId: convId, direction: 'IN' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (!lastIn || Date.now() - lastIn.createdAt.getTime() > 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        'Chỉ gửi được lời mời trong 24h kể từ tin nhắn cuối của KHÁCH — nhờ khách nhắn 1 tin bất kỳ rồi gửi lời mời ngay.',
      );
    }
    try {
      const r = await this.client.sendOptinRequest(
        conv.page.accessToken,
        conv.contact.psid,
        title?.trim() || 'Nhận tin ưu đãi & sản phẩm mới từ shop?',
      );
      return { ok: true, messageId: r.message_id };
    } catch (e) {
      throw new BadRequestException(`Meta từ chối gửi lời mời: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Webhook `optin` (notification_messages): lưu/cập nhật token + trạng thái. Best-effort. */
  async handleOptinEvent(pageId: string, psid: string, optin: any): Promise<void> {
    try {
      const contact = await this.prisma.msgContact.findUnique({ where: { pageId_psid: { pageId, psid } } });
      if (!contact) return;
      const conv = await this.prisma.msgConversation.findUnique({
        where: { pageId_contactId: { pageId, contactId: contact.id } },
        select: { id: true },
      });
      if (!conv) return;

      const token: string | null = optin?.notification_messages_token || null;
      const expiryMs = Number(optin?.token_expiry_timestamp) || 0;
      const rawStatus = String(optin?.notification_messages_status || '').toUpperCase();
      const status = rawStatus === 'STOP_NOTIFICATIONS' ? 'OPTED_OUT' : 'OPTED_IN'; // RESUME_NOTIFICATIONS → OPTED_IN

      await this.prisma.msgMarketingOptin.upsert({
        where: { conversationId: conv.id },
        create: {
          pageId,
          conversationId: conv.id,
          contactId: contact.id,
          token,
          tokenExpiry: expiryMs ? new Date(expiryMs) : null,
          frequency: optin?.notification_messages_frequency || null,
          status,
        },
        update: {
          ...(token ? { token, tokenExpiry: expiryMs ? new Date(expiryMs) : null } : {}),
          ...(optin?.notification_messages_frequency ? { frequency: optin.notification_messages_frequency } : {}),
          status,
        },
      });
      this.logger.log(`Marketing optin [${status}] psid=${psid}`);
    } catch (e) {
      this.logger.warn(`handleOptinEvent lỗi: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Webhook delivery receipt: mids → DELIVERED. */
  async handleDelivery(mids: string[]): Promise<void> {
    if (!mids?.length) return;
    await this.prisma.msgMarketingRecipient
      .updateMany({ where: { messageId: { in: mids }, status: 'SENT' }, data: { status: 'DELIVERED' } })
      .catch(() => {});
  }

  /** Webhook read receipt: mọi tin đã gửi tới hội thoại này trước watermark → READ. */
  async handleRead(pageId: string, psid: string, watermarkMs: number): Promise<void> {
    try {
      const contact = await this.prisma.msgContact.findUnique({ where: { pageId_psid: { pageId, psid } } });
      if (!contact) return;
      const optin = await this.prisma.msgMarketingOptin.findFirst({ where: { pageId, contactId: contact.id }, select: { id: true } });
      if (!optin) return;
      await this.prisma.msgMarketingRecipient.updateMany({
        where: { optinId: optin.id, status: { in: ['SENT', 'DELIVERED'] }, sentAt: { lte: new Date(watermarkMs || Date.now()) } },
        data: { status: 'READ' },
      });
    } catch { /* best-effort */ }
  }

  /** Danh sách khách đã opt-in (kèm khách + page). */
  listOptins() {
    return this.prisma.msgMarketingOptin.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 500,
      select: {
        id: true, status: true, frequency: true, tokenExpiry: true, updatedAt: true, conversationId: true,
        page: { select: { name: true } },
        contact: { select: { name: true, phone: true, avatarUrl: true } },
      },
    });
  }

  /** Tạo + GỬI chiến dịch tới các opt-in đã chọn (chỉ OPTED_IN còn token; OPTED_OUT bị chặn). */
  async sendCampaign(name: string, text: string, optinIds: string[]) {
    if (!name?.trim() || !text?.trim()) throw new BadRequestException('Cần tên chiến dịch và nội dung tin');
    if (!optinIds?.length) throw new BadRequestException('Chưa chọn người nhận');

    const optins = await this.prisma.msgMarketingOptin.findMany({
      where: { id: { in: optinIds } },
      include: { page: { select: { accessToken: true } } },
    });
    const blocked = optins.filter((o) => o.status !== 'OPTED_IN' || !o.token);
    const sendable = optins.filter((o) => o.status === 'OPTED_IN' && o.token && o.page.accessToken);
    if (!sendable.length) {
      throw new BadRequestException('Không có người nhận hợp lệ (đã opt-out hoặc thiếu token) — CRM chặn gửi cho khách đã hủy đăng ký.');
    }

    const campaign = await this.prisma.msgMarketingCampaign.create({
      data: { name: name.trim(), text: text.trim(), status: 'SENT', sentAt: new Date() },
    });

    let sent = 0;
    let failed = 0;
    for (const o of optins) {
      const isSendable = sendable.some((s) => s.id === o.id);
      if (!isSendable) {
        await this.prisma.msgMarketingRecipient.create({
          data: { campaignId: campaign.id, optinId: o.id, status: 'FAILED', error: o.status !== 'OPTED_IN' ? 'Khách đã hủy đăng ký (opt-out) — bị CRM chặn' : 'Thiếu token' },
        });
        failed++;
        continue;
      }
      try {
        const r = await this.client.sendMarketingMessage(o.page.accessToken as string, o.token as string, text.trim());
        await this.prisma.msgMarketingRecipient.create({
          data: { campaignId: campaign.id, optinId: o.id, status: 'SENT', messageId: r.message_id, sentAt: new Date() },
        });
        sent++;
      } catch (e) {
        await this.prisma.msgMarketingRecipient.create({
          data: { campaignId: campaign.id, optinId: o.id, status: 'FAILED', error: e instanceof Error ? e.message : String(e) },
        });
        failed++;
      }
    }
    return { ok: true, campaignId: campaign.id, sent, failed, blockedOptOut: blocked.length };
  }

  /** Danh sách chiến dịch + đếm trạng thái người nhận. */
  async listCampaigns() {
    const rows = await this.prisma.msgMarketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { recipients: { select: { status: true } } },
    });
    return rows.map((c) => {
      const count = (s: string) => c.recipients.filter((r) => r.status === s).length;
      return {
        id: c.id, name: c.name, text: c.text, status: c.status, sentAt: c.sentAt, createdAt: c.createdAt,
        total: c.recipients.length, sent: count('SENT'), delivered: count('DELIVERED'), read: count('READ'), failedCount: count('FAILED'),
      };
    });
  }

  /** Chi tiết 1 chiến dịch: từng người nhận + trạng thái. */
  async campaignDetail(id: string) {
    const c = await this.prisma.msgMarketingCampaign.findUnique({
      where: { id },
      include: {
        recipients: {
          select: {
            status: true, error: true, sentAt: true,
            optin: { select: { contact: { select: { name: true, phone: true, avatarUrl: true } }, page: { select: { name: true } } } },
          },
        },
      },
    });
    if (!c) throw new NotFoundException('Không tìm thấy chiến dịch');
    return c;
  }
}

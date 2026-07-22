import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const GRAPH = (process.env.META_GRAPH_URL || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');

/** WhatsApp Cloud API mỏng: đọc cấu hình từ StoreIntegration(WHATSAPP) — accessToken + shopId(=WABA ID) + apiKey(=Phone Number ID). */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getConfig() {
    const integ = await this.prisma.storeIntegration.findFirst({
      where: { platform: 'WHATSAPP', isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!integ?.accessToken) return null;
    return { token: integ.accessToken, wabaId: integ.shopId || '', phoneNumberId: integ.apiKey || '' };
  }

  private async graph(path: string, token: string, init?: RequestInit): Promise<any> {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${GRAPH}/${path}${sep}access_token=${encodeURIComponent(token)}`, {
      ...init,
      signal: AbortSignal.timeout(20_000),
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
    return json;
  }

  /** Xác minh kết nối: WABA info + danh sách số. Không lộ token. */
  async status() {
    const cfg = await this.getConfig();
    if (!cfg) return { connected: false, reason: 'Chưa lưu cấu hình WHATSAPP (token) ở mục Kết nối.' };
    if (!cfg.wabaId) return { connected: false, reason: 'Thiếu WABA ID trong cấu hình.' };
    try {
      const waba = await this.graph(`${cfg.wabaId}?fields=id,name,account_review_status,message_template_namespace`, cfg.token);
      const phones = await this.graph(`${cfg.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`, cfg.token).catch(() => ({ data: [] }));
      return {
        connected: true,
        waba: { id: waba.id, name: waba.name, reviewStatus: waba.account_review_status || null },
        phones: (phones.data || []).map((p: any) => ({
          id: p.id,
          number: p.display_phone_number,
          name: p.verified_name,
          quality: p.quality_rating || null,
        })),
        defaultPhoneNumberId: cfg.phoneNumberId || null,
      };
    } catch (e) {
      return { connected: false, reason: `Graph từ chối: ${e instanceof Error ? e.message : e}` };
    }
  }

  /** Gửi template hello_world — cách chuẩn để test kết nối (dev mode: chỉ tới số test đã verify trong App Meta). */
  async sendTestMessage(to: string, phoneNumberIdOverride?: string) {
    const cfg = await this.getConfig();
    if (!cfg) throw new BadRequestException('Chưa lưu cấu hình WHATSAPP (token).');
    const phoneNumberId = phoneNumberIdOverride || cfg.phoneNumberId;
    if (!phoneNumberId) throw new BadRequestException('Thiếu Phone Number ID (lưu trong cấu hình hoặc truyền kèm).');
    const toDigits = to.replace(/\D/g, '');
    try {
      const r = await this.graph(`${phoneNumberId}/messages`, cfg.token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toDigits,
          type: 'template',
          template: { name: 'hello_world', language: { code: 'en_US' } },
        }),
      });
      return { ok: true, messageId: r?.messages?.[0]?.id || null };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      this.logger.warn(`WhatsApp test-message lỗi: ${reason}`);
      throw new BadRequestException(`WhatsApp từ chối gửi: ${reason}`);
    }
  }
}

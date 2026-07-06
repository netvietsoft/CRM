import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessengerService } from '../messenger/messenger.service';
import { AnthropicClient, AiMessage } from './anthropic.client';
import { AiToolsService, ToolCtx } from './ai-tools';

const DAY_MS = 24 * 60 * 60 * 1000;

// Persona mặc định (Task 9 sẽ mở rộng). Ép quy tắc xác nhận trước khi chốt.
export const DEFAULT_PERSONA = `Bạn là nhân viên tư vấn bán hàng của shop qua Messenger. Trả lời tiếng Việt, thân thiện, ngắn gọn.
- Dùng search_products để tra sản phẩm/giá trước khi tư vấn.
- Thu thập đủ: sản phẩm (+size/màu) + số lượng, tên người nhận, số điện thoại, địa chỉ.
- TRƯỚC KHI tạo đơn: nhắc lại đơn (sản phẩm, số lượng, giá, người nhận, SĐT, địa chỉ) và hỏi khách xác nhận. CHỈ gọi create_order với customerConfirmed=true SAU KHI khách đồng ý rõ ràng.
- Nếu không chắc / khách khiếu nại / ngoài phạm vi bán hàng: gọi request_handoff.`;

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  // Khoá per-conversation: chặn nhiều vòng orchestrate chạy song song cho cùng hội thoại
  // (tin đến dồn dập → tránh gửi nhiều reply trùng / tạo suggestion trùng).
  private readonly inFlight = new Set<string>();
  constructor(
    private readonly anthropic: AnthropicClient,
    private readonly tools: AiToolsService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerService)) private readonly messenger: MessengerService,
  ) {}

  // Điểm vào khi có tin ĐẾN. Guard đầy đủ rồi mới gọi Claude.
  async onIncoming(conversationId: string): Promise<void> {
    if (this.inFlight.has(conversationId)) return; // đã có vòng đang chạy cho hội thoại này
    this.inFlight.add(conversationId);
    try {
      if (!this.anthropic.isEnabled()) return;
      const conv = await this.prisma.msgConversation.findUnique({ where: { id: conversationId }, include: { page: true, contact: true } });
      if (!conv) return;
      const config = await this.prisma.aiAgentConfig.findUnique({ where: { pageId: (conv as any).pageId } });
      if (!config?.enabled || config.mode === 'OFF') return;
      const state = await this.getState(conversationId);
      if (state.status !== 'ACTIVE') return;
      const last = await this.prisma.msgMessage.findFirst({ where: { conversationId }, orderBy: { createdAt: 'desc' } });
      if (!last || last.direction !== 'IN') return;
      if (Date.now() - new Date(last.createdAt).getTime() > DAY_MS) return;
      await this.orchestrate(conv, config);
    } catch (e) {
      this.logger.warn(`[AI] onIncoming ${conversationId} lỗi: ${e instanceof Error ? e.message : e}`);
    } finally {
      this.inFlight.delete(conversationId);
    }
  }

  // Vòng lặp Claude + tools. AUTO: gửi reply thật; SHADOW: lưu gợi ý.
  async orchestrate(conv: any, config: any): Promise<{ mode: string; reply: string; orderCode?: string }> {
    const history = await this.prisma.msgMessage.findMany({ where: { conversationId: conv.id }, orderBy: { createdAt: 'asc' }, take: 20 });
    const messages: AiMessage[] = history.filter((m: any) => m.text).map((m: any) => ({ role: m.direction === 'IN' ? 'user' : 'assistant', content: String(m.text) }));
    if (!messages.length) return { mode: config.mode, reply: '' };
    const ctx: ToolCtx = { conversationId: conv.id, psid: conv.contact?.psid || '', storeId: conv.page?.storeId ?? null, actorId: 'AI', actorRole: 'ADMIN', slots: {}, dryRun: config.mode !== 'AUTO' };

    let finalText = '';
    let orderCode: string | undefined;
    let orderDraft: unknown;
    try {
      for (let i = 0; i < 4; i++) {
        const res = await this.anthropic.run({ system: config.persona || DEFAULT_PERSONA, messages, tools: this.tools.tools, maxTokens: 1024 });
        finalText = res.text || finalText;
        if (!res.toolUses.length) break;
        messages.push({ role: 'assistant', content: [ ...(res.text ? [{ type: 'text', text: res.text }] : []), ...res.toolUses.map((t) => ({ type: 'tool_use', id: t.id, name: t.name, input: t.input })) ] });
        const toolResults: unknown[] = [];
        for (const t of res.toolUses) {
          const tr = await this.tools.handle(t.name, t.input, ctx);
          if (tr.orderCode) orderCode = tr.orderCode;
          if ((tr as any).orderDraft) orderDraft = (tr as any).orderDraft;
          toolResults.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(tr.result) });
        }
        messages.push({ role: 'user', content: toolResults });
      }
    } catch (e) {
      this.logger.warn(`[AI] orchestrate lỗi (chuyển người): ${e instanceof Error ? e.message : e}`);
      await this.markError(conv);
      return { mode: config.mode, reply: '' };
    }

    if (config.mode === 'AUTO') {
      if (finalText) { try { await this.messenger.reply(ctx.storeId, 'AI', conv.id, { text: finalText }); } catch { /* ignore */ } }
      await this.touchState(conv.id);
      return { mode: 'AUTO', reply: finalText, orderCode };
    }
    await this.prisma.aiSuggestion.create({ data: { conversationId: conv.id, replyText: finalText || null, orderDraft: (orderDraft as any) ?? (orderCode ? { orderCode } : undefined), status: 'PENDING' } });
    return { mode: 'SHADOW', reply: finalText, orderCode };
  }

  private async getState(conversationId: string) {
    const existing = await this.prisma.aiConversationState.findUnique({ where: { conversationId } });
    if (existing) return existing;
    return this.prisma.aiConversationState.create({ data: { conversationId } });
  }
  private async touchState(conversationId: string) {
    await this.prisma.aiConversationState.update({ where: { conversationId }, data: { lastAiAt: new Date() } }).catch(() => {});
  }

  // Lỗi AI → gắn nhãn "AI lỗi" + chuyển hội thoại cho người (HANDOFF).
  private async markError(conv: any) {
    try {
      const c2 = await this.prisma.msgConversation.findUnique({ where: { id: conv.id }, select: { labels: true } });
      const cur = Array.isArray(c2?.labels) ? (c2!.labels as string[]) : [];
      await this.messenger.setLabels(conv.page?.storeId ?? null, conv.id, [...new Set([...cur, 'AI lỗi'])]);
    } catch { /* ignore */ }
    await this.prisma.aiConversationState.update({ where: { conversationId: conv.id }, data: { status: 'HANDOFF' } }).catch(() => {});
  }
}

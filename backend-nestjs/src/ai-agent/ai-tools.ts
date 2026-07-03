import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { MessengerService } from '../messenger/messenger.service';

export interface ToolCtx {
  conversationId: string; psid: string; storeId: string | null;
  actorId: string; actorRole: string; slots: Record<string, unknown>;
  dryRun?: boolean;
}
export interface ToolResult { result: unknown; sideEffect?: 'order_created' | 'handoff'; orderCode?: string; orderId?: string; orderDraft?: unknown; }

// Định nghĩa tool theo chuẩn Anthropic tool-use.
export const AI_TOOLS = [
  { name: 'search_products', description: 'Tìm sản phẩm theo tên/sku để tư vấn khách.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'create_order', description: 'Tạo đơn hàng SAU KHI khách đã xác nhận (chốt). Chỉ gọi khi đủ: sản phẩm, tên, SĐT, địa chỉ và khách đã chốt.', input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { productId: { type: 'string' }, quantity: { type: 'number' }, unitPrice: { type: 'number' } }, required: ['productId', 'quantity'] } }, name: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' }, note: { type: 'string' }, customerConfirmed: { type: 'boolean', description: 'true CHỈ KHI khách đã xác nhận chốt đơn rõ ràng' } }, required: ['items', 'name', 'phone', 'customerConfirmed'] } },
  { name: 'request_handoff', description: 'Chuyển hội thoại cho nhân viên khi không chắc / khiếu nại / ngoài phạm vi.', input_schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } },
  { name: 'add_labels', description: 'Gắn nhãn phân loại hội thoại.', input_schema: { type: 'object', properties: { labels: { type: 'array', items: { type: 'string' } } }, required: ['labels'] } },
];

@Injectable()
export class AiToolsService {
  constructor(
    private readonly products: ProductsService,
    private readonly orders: OrdersService,
    @Inject(forwardRef(() => MessengerService)) private readonly messenger: MessengerService,
    private readonly prisma: PrismaService,
  ) {}

  get tools() { return AI_TOOLS; }

  async handle(name: string, input: Record<string, any>, ctx: ToolCtx): Promise<ToolResult> {
    switch (name) {
      case 'search_products': {
        const items = await this.products.search(String(input.query || ''));
        return { result: (items || []).slice(0, 8).map((p: any) => ({ id: p.id, name: p.name, price: p.salePrice ?? p.originalPrice ?? 0, sku: p.sku })) };
      }
      case 'create_order': {
        if (input.customerConfirmed !== true) return { result: { error: 'CHUA_XAC_NHAN', message: 'Chưa được tạo đơn: cần khách xác nhận (chốt) trước.' } };
        if (!Array.isArray(input.items) || input.items.length === 0) return { result: { error: 'THIEU_SP', message: 'Cần ít nhất 1 sản phẩm.' } };
        if (ctx.dryRun) {
          return { result: { success: true, dryRun: true, message: 'Đơn nháp (shadow) — chưa tạo thật.' }, sideEffect: 'order_created', orderDraft: { items: input.items, name: input.name, phone: input.phone, address: input.address, note: input.note } };
        }
        const r = await this.orders.createAdminOrder({
          actorId: ctx.actorId, actorRole: ctx.actorRole, effectiveStoreId: ctx.storeId,
          createOrderDto: {
            items: input.items.map((it: any) => ({ productId: String(it.productId), quantity: Number(it.quantity) || 1, unitPrice: it.unitPrice != null ? Number(it.unitPrice) : undefined })),
            shippingName: input.name, shippingPhone: input.phone, shippingStreet: input.address || undefined,
            paymentMethod: 'COD', status: 'PENDING',
            metadata: { aiGenerated: true, source: 'CCM_AI', conversationId: ctx.conversationId, psid: ctx.psid },
          } as any,
        });
        return { result: { success: true, orderCode: r.orderCode }, sideEffect: 'order_created', orderId: r.orderId, orderCode: r.orderCode };
      }
      case 'request_handoff': {
        await this.prisma.aiConversationState.update({ where: { conversationId: ctx.conversationId }, data: { status: 'HANDOFF' } }).catch(() => {});
        await this.addLabels(ctx, ['Cần người']);
        return { result: { ok: true }, sideEffect: 'handoff' };
      }
      case 'add_labels': {
        await this.addLabels(ctx, Array.isArray(input.labels) ? input.labels.map(String) : []);
        return { result: { ok: true } };
      }
      default:
        return { result: { error: 'UNKNOWN_TOOL', name } };
    }
  }

  private async addLabels(ctx: ToolCtx, add: string[]) {
    if (!add.length) return;
    const conv = await this.prisma.msgConversation.findUnique({ where: { id: ctx.conversationId }, select: { labels: true } }).catch(() => null);
    const cur = Array.isArray(conv?.labels) ? (conv!.labels as string[]) : [];
    await this.messenger.setLabels(ctx.storeId, ctx.conversationId, [...new Set([...cur, ...add])]).catch(() => {});
  }
}

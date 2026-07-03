import { AiToolsService } from './ai-tools';

describe('AiToolsService', () => {
  const products = { search: jest.fn() } as any;
  const orders = { createAdminOrder: jest.fn() } as any;
  const messenger = { setLabels: jest.fn().mockResolvedValue(undefined) } as any;
  const prisma = { aiConversationState: { update: jest.fn().mockResolvedValue({}) }, msgConversation: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
  const svc = new AiToolsService(products, orders, messenger, prisma);
  const ctx = { conversationId: 'c1', psid: 'p1', storeId: null, actorId: 'u1', actorRole: 'STAFF', slots: {} };
  beforeEach(() => jest.clearAllMocks());

  it('search_products map giá', async () => {
    products.search.mockResolvedValue([{ id: 'x', name: 'Áo', salePrice: 100, originalPrice: 120, sku: 'A1' }]);
    const r = await svc.handle('search_products', { query: 'áo' }, ctx);
    expect((r.result as any[])[0]).toEqual({ id: 'x', name: 'Áo', price: 100, sku: 'A1' });
  });

  it('create_order CHẶN khi chưa confirmed', async () => {
    const r = await svc.handle('create_order', { items: [{ productId: 'x', quantity: 1 }], name: 'A', phone: '09' }, ctx);
    expect((r.result as any).error).toBe('CHUA_XAC_NHAN');
    expect(orders.createAdminOrder).not.toHaveBeenCalled();
  });

  it('create_order tạo đơn PENDING khi confirmed', async () => {
    orders.createAdminOrder.mockResolvedValue({ success: true, orderId: 'o1', orderCode: 'ORD1' });
    const r = await svc.handle('create_order', { items: [{ productId: 'x', quantity: 2, unitPrice: 50 }], name: 'A', phone: '09', address: 'HN', customerConfirmed: true }, ctx);
    expect(orders.createAdminOrder).toHaveBeenCalledTimes(1);
    const arg = orders.createAdminOrder.mock.calls[0][0];
    expect(arg.createOrderDto.status).toBe('PENDING');
    expect(arg.createOrderDto.metadata.aiGenerated).toBe(true);
    expect(r.sideEffect).toBe('order_created');
    expect(r.orderCode).toBe('ORD1');
  });

  it('create_order dryRun KHÔNG tạo đơn thật', async () => {
    const r = await svc.handle('create_order', { items: [{ productId: 'x', quantity: 1 }], name: 'A', phone: '09', customerConfirmed: true }, { ...ctx, dryRun: true });
    expect(orders.createAdminOrder).not.toHaveBeenCalled();
    expect((r.result as any).dryRun).toBe(true);
    expect((r as any).orderDraft).toBeDefined();
  });

  it('request_handoff set HANDOFF + nhãn', async () => {
    prisma.msgConversation.findUnique.mockResolvedValue({ labels: ['X'] });
    const r = await svc.handle('request_handoff', { reason: 'khiếu nại' }, ctx);
    expect(prisma.aiConversationState.update).toHaveBeenCalled();
    expect(messenger.setLabels).toHaveBeenCalled();
    expect(r.sideEffect).toBe('handoff');
  });
});

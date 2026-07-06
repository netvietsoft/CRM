import { WebhooksService } from './webhooks.service';

function makeService() {
  const prisma: any = {
    order: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    systemConfig: { findUnique: jest.fn(), upsert: jest.fn() },
    storeIntegration: { findMany: jest.fn() },
    userVoucher: { findUnique: jest.fn() },
  };
  const adminNotificationsService: any = { createNotification: jest.fn() };
  const pancakeService: any = {};
  const messagingAutomationService: any = { handleOrderStateChange: jest.fn() };
  const vouchersService: any = { processSuccessfulOrderVoucherRules: jest.fn() };
  const ordersService: any = { applyStatusSideEffects: jest.fn() };
  const orderSourcesService: any = { ensureExists: jest.fn() };
  const viettelCustomerService: any = { upsertFromWebhook: jest.fn() };
  const service = new WebhooksService(
    prisma,
    adminNotificationsService,
    pancakeService,
    messagingAutomationService,
    vouchersService,
    ordersService,
    orderSourcesService,
    viettelCustomerService,
  );
  return { service, prisma, adminNotificationsService, orderSourcesService, viettelCustomerService };
}

describe('WebhooksService.createOrderFromViettel', () => {
  const basePayload = {
    DATA: {
      ORDER_NUMBER: 'VTP123',
      ORDER_STATUS: 501,
      STATUS_NAME: 'Đã giao hàng',
      ORDER_REFERENCE: 'REF9',
      ORDER_STATUSDATE: '2026-06-29 10:00:00',
      MONEY_COLLECTION: 250000,
      MONEY_TOTAL: 250000,
      RECEIVER_FULLNAME: 'Nguyen Van A',
    },
  } as any;

  it('creates an order with source=VIETTEL mapped from payload', async () => {
    const { service, prisma, orderSourcesService } = makeService();
    prisma.order.create.mockResolvedValue({ id: 'o1', orderCode: 'VTP123' });

    await (service as any).createOrderFromViettel(basePayload, 'store-1');

    expect(orderSourcesService.ensureExists).toHaveBeenCalledWith('VIETTEL', 'Viettel');
    expect(prisma.order.create).toHaveBeenCalledTimes(1);
    const arg = prisma.order.create.mock.calls[0][0].data;
    expect(arg.orderCode).toBe('VTP123');
    expect(arg.source).toBe('VIETTEL');
    expect(arg.storeId).toBe('store-1');
    expect(arg.shippingName).toBe('Nguyen Van A');
    expect(arg.totalAmount).toBe(250000);
    expect(arg.status).toBe('DELIVERED');
    expect(arg.metadata.partner.trackingCode).toBe('VTP123');
  });

  it('swallows P2002 (order already exists) without throwing', async () => {
    const { service, prisma } = makeService();
    prisma.order.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      (service as any).createOrderFromViettel(basePayload, 'store-1'),
    ).resolves.toBeUndefined();
  });
});

describe('WebhooksService.matchViettelWebhookStore', () => {
  it('matches the store integration by webhookSecret (constant-time)', async () => {
    const { service, prisma } = makeService();
    prisma.storeIntegration.findMany.mockResolvedValue([
      { id: 'i1', storeId: 's1', metadata: { webhookSecret: 'sekret-abc' } },
    ]);
    const res = await (service as any).matchViettelWebhookStore('sekret-abc');
    expect(res.anySecret).toBe(true);
    expect(res.integration).toEqual({ id: 'i1', storeId: 's1' });
  });

  it('returns no integration when secret does not match, but anySecret=true', async () => {
    const { service, prisma } = makeService();
    prisma.storeIntegration.findMany.mockResolvedValue([
      { id: 'i1', storeId: 's1', metadata: { webhookSecret: 'right' } },
    ]);
    const res = await (service as any).matchViettelWebhookStore('wrong-and-longer');
    expect(res.anySecret).toBe(true);
    expect(res.integration).toBeNull();
  });

  it('reports anySecret=false when no integration has a webhookSecret', async () => {
    const { service, prisma } = makeService();
    prisma.storeIntegration.findMany.mockResolvedValue([
      { id: 'i1', storeId: 's1', metadata: {} },
    ]);
    const res = await (service as any).matchViettelWebhookStore('anything');
    expect(res.anySecret).toBe(false);
    expect(res.integration).toBeNull();
  });
});

describe('WebhooksService.handleViettelWebhook', () => {
  const payload = { DATA: { ORDER_NUMBER: 'VTP1', ORDER_STATUS: 501, token: 'good' } } as any;

  it('verifies secret, dispatches processing with storeId, returns 200 shape', async () => {
    const { service, prisma } = makeService();
    jest.spyOn(service as any, 'captureViettelOrderWebhook').mockResolvedValue(undefined);
    prisma.storeIntegration.findMany.mockResolvedValue([
      { id: 'i1', storeId: 's1', metadata: { webhookSecret: 'good' } },
    ]);
    const proc = jest
      .spyOn(service as any, 'processViettelPostWebhook')
      .mockResolvedValue(undefined);

    const res = await service.handleViettelWebhook(payload, {});

    expect(res).toEqual({ success: true });
    expect(proc).toHaveBeenCalledWith(payload, 's1');
  });

  it('skips processing on invalid secret in production (still returns 200)', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { service, prisma } = makeService();
      jest.spyOn(service as any, 'captureViettelOrderWebhook').mockResolvedValue(undefined);
      prisma.storeIntegration.findMany.mockResolvedValue([
        { id: 'i1', storeId: 's1', metadata: { webhookSecret: 'right' } },
      ]);
      const proc = jest
        .spyOn(service as any, 'processViettelPostWebhook')
        .mockResolvedValue(undefined);

      const res = await service.handleViettelWebhook(
        { DATA: { ORDER_NUMBER: 'VTP1', ORDER_STATUS: 501, token: 'wrong' } } as any,
        {},
      );

      expect(res).toEqual({ success: true, skipped: 'invalid_secret' });
      expect(proc).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('returns 200 even if processing throws', async () => {
    const { service, prisma } = makeService();
    jest.spyOn(service as any, 'captureViettelOrderWebhook').mockResolvedValue(undefined);
    prisma.storeIntegration.findMany.mockResolvedValue([]);
    jest
      .spyOn(service as any, 'processViettelPostWebhook')
      .mockRejectedValue(new Error('boom'));

    const res = await service.handleViettelWebhook(payload, {});
    expect(res).toEqual({ success: true });
  });

  it('returns 200 even if secret lookup (findMany) throws', async () => {
    const { service, prisma } = makeService();
    jest.spyOn(service as any, 'captureViettelOrderWebhook').mockResolvedValue(undefined);
    prisma.storeIntegration.findMany.mockRejectedValue(new Error('db connection failed'));
    const proc = jest
      .spyOn(service as any, 'processViettelPostWebhook')
      .mockResolvedValue(undefined);

    const res = await service.handleViettelWebhook(payload, {});

    expect(res).toEqual({ success: true });
    expect(proc).not.toHaveBeenCalled();
  });
});

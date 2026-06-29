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
  const orderSourcesService: any = { ensureExists: jest.fn() };
  const service = new WebhooksService(
    prisma,
    adminNotificationsService,
    pancakeService,
    messagingAutomationService,
    vouchersService,
    orderSourcesService,
  );
  return { service, prisma, adminNotificationsService, orderSourcesService };
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

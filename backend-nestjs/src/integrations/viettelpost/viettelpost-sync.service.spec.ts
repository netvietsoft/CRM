import { ViettelpostSyncService } from './viettelpost-sync.service';

function makeService() {
  const prisma: any = {
    order: { findMany: jest.fn(), update: jest.fn() },
  };
  const authService: any = { get: jest.fn() };
  const customerService: any = { enrichFromDetail: jest.fn() };
  const service = new ViettelpostSyncService(prisma, authService, customerService);
  return { service, prisma, authService, customerService };
}

describe('ViettelpostSyncService', () => {
  afterEach(() => {
    delete process.env.VIETTELPOST_RECONCILE;
  });

  it('reconcileOpenOrders queries only non-final VIETTEL orders; skips when detail API returns null', async () => {
    const { service, prisma, authService, customerService } = makeService();
    prisma.order.findMany.mockResolvedValue([
      { id: 'o1', orderCode: 'VTP1', status: 'PENDING', metadata: { partner: { trackingCode: 'VTP1' } } },
      { id: 'o2', orderCode: 'VTP2', status: 'SHIPPED', metadata: null },
    ]);
    authService.get.mockResolvedValue(null); // không lấy được detail

    const res = await service.reconcileOpenOrders();

    const where = prisma.order.findMany.mock.calls[0][0].where;
    expect(where.source).toBe('VIETTEL');
    expect(where.status.notIn).toEqual(
      expect.arrayContaining(['DELIVERED', 'CANCELLED', 'COMPLETED']),
    );
    expect(res).toEqual({ candidates: 2, updated: 0, skipped: 2 });
    expect(customerService.enrichFromDetail).not.toHaveBeenCalled();
  });

  it('reconcileOpenOrders enriches customer and updates order status from detail-v2', async () => {
    const { service, prisma, authService, customerService } = makeService();
    prisma.order.findMany.mockResolvedValue([
      { id: 'o1', orderCode: 'VTP1', status: 'PENDING', metadata: { partner: { trackingCode: 'VTP1' } } },
    ]);
    // order/detail-v2 trả status 501 (→ DELIVERED) + thông tin khách
    authService.get.mockResolvedValue({
      status: 200,
      data: { ORDER_STATUS: 501, RECEIVER_PHONE: '0904782324', RECEIVER_FULLNAME: 'Vy Do' },
    });

    const res = await service.reconcileOpenOrders();

    expect(authService.get).toHaveBeenCalledWith('order/detail-v2?o=VTP1');
    expect(customerService.enrichFromDetail).toHaveBeenCalledWith('VTP1', expect.objectContaining({ RECEIVER_PHONE: '0904782324' }));
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'DELIVERED' } });
    expect(res).toEqual({ candidates: 1, updated: 1, skipped: 0 });
  });

  it('handleReconcileCron does nothing when VIETTELPOST_RECONCILE=false', async () => {
    const { service } = makeService();
    process.env.VIETTELPOST_RECONCILE = 'false';
    const spy = jest.spyOn(service, 'reconcileOpenOrders');

    await service.handleReconcileCron();

    expect(spy).not.toHaveBeenCalled();
  });

  it('handleReconcileCron skips overlapping run (guard)', async () => {
    const { service } = makeService();
    (service as any).reconcileRunning = true;
    const spy = jest.spyOn(service, 'reconcileOpenOrders');

    await service.handleReconcileCron();

    expect(spy).not.toHaveBeenCalled();
  });

  it('listPulledOrders flattens metadata.partner (trackingCode, cod, current location, update count)', async () => {
    const { service, prisma } = makeService();
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'o1',
        orderCode: '145545623275',
        status: 'SHIPPED',
        totalAmount: 1029000,
        shippingName: 'Vy Do',
        createdAt: new Date('2026-06-29T00:00:00Z'),
        updatedAt: new Date('2026-06-29T01:00:00Z'),
        metadata: {
          partner: {
            trackingCode: '145545623275',
            cod: 1029000,
            courierUpdates: [
              { key: 'VTP_100', note: 'Tạo đơn', update_at: '2026-06-29T00:00:00Z' },
              { key: 'VTP_300', note: 'Đang giao - Bình Dương', update_at: '2026-06-29T01:00:00Z' },
            ],
          },
        },
      },
    ]);

    const rows = await service.listPulledOrders();

    expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({ source: 'VIETTEL' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      orderCode: '145545623275',
      trackingCode: '145545623275',
      status: 'SHIPPED',
      cod: 1029000,
      shippingName: 'Vy Do',
      currentLocation: 'Đang giao - Bình Dương',
      updateCount: 2,
      lastUpdateAt: '2026-06-29T01:00:00Z',
    });
  });
});

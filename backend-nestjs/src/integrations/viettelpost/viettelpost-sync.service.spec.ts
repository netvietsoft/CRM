import { ViettelpostSyncService } from './viettelpost-sync.service';

function makeService() {
  const prisma: any = {
    order: { findMany: jest.fn() },
    storeIntegration: { findFirst: jest.fn() },
  };
  const service = new ViettelpostSyncService(prisma);
  return { service, prisma };
}

describe('ViettelpostSyncService', () => {
  afterEach(() => {
    delete process.env.VIETTELPOST_RECONCILE;
  });

  it('reconcileOpenOrders queries only non-final VIETTEL orders and skips when API stub returns null', async () => {
    const { service, prisma } = makeService();
    prisma.order.findMany.mockResolvedValue([
      { id: 'o1', orderCode: 'VTP1', status: 'PENDING', metadata: { partner: { trackingCode: 'VTP1' } } },
      { id: 'o2', orderCode: 'VTP2', status: 'SHIPPED', metadata: null },
    ]);
    prisma.storeIntegration.findFirst.mockResolvedValue({ accessToken: 'tok' });

    const res = await service.reconcileOpenOrders();

    // chỉ lấy đơn source=VIETTEL chưa ở trạng thái cuối
    const where = prisma.order.findMany.mock.calls[0][0].where;
    expect(where.source).toBe('VIETTEL');
    expect(where.status.notIn).toEqual(
      expect.arrayContaining(['DELIVERED', 'CANCELLED', 'COMPLETED']),
    );
    // stub fetch trả null → tất cả skipped, không update
    expect(res).toEqual({ candidates: 2, updated: 0, skipped: 2 });
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
});

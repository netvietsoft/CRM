import { VouchersService } from './vouchers.service';

type UV = {
  id: string;
  status: string;
  voucher: { approvalMode: 'AUTO' | 'MANUAL' };
};

function makeDeps(uv: UV | null, threshold = 100000) {
  const updated: any[] = [];
  const prisma = {
    userVoucher: {
      findUnique: jest.fn(async () => uv),
      update: jest.fn(async ({ where, data }: any) => {
        updated.push({ where, data });
        return { id: where.id, status: data.status };
      }),
    },
    systemConfig: {
      findUnique: jest.fn(async () => ({
        key: 'order_voucher_config',
        value: { codActivationThreshold: threshold },
      })),
    },
  } as any;
  const messaging = {
    handleVoucherCreated: jest.fn(async () => undefined),
    handleVoucherActivated: jest.fn(async () => undefined),
  } as any;
  const svc = new VouchersService(prisma, {} as any, {} as any, messaging);
  return { svc, prisma, updated };
}

const baseOrder = { id: 'o1', orderCode: 'ORD1', status: 'DELIVERED', totalAmount: 200000 };

describe('syncOrderVoucherActivation', () => {
  it('AUTO + delivered + totalAmount >= threshold -> ACTIVE', async () => {
    const { svc, updated } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder });
    expect(res).toEqual({ changed: true, status: 'ACTIVE' });
    expect(updated[0].data.status).toBe('ACTIVE');
  });

  it('MANUAL + eligible -> WAITING_APPROVAL', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'MANUAL' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder });
    expect(res).toEqual({ changed: true, status: 'WAITING_APPROVAL' });
  });

  it('delivered but totalAmount < threshold -> REJECTED', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, totalAmount: 50000 });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });

  it('CANCELLED -> REJECTED', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, status: 'CANCELLED' });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });

  it('isExchange=true -> REJECTED even if delivered', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, isExchange: true });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });

  it('not delivered yet -> stays PENDING (no change)', async () => {
    const { svc, updated } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, status: 'SHIPPED' });
    expect(res).toEqual({ changed: false, status: 'PENDING' });
    expect(updated).toHaveLength(0);
  });

  it('already ACTIVE -> no re-evaluation', async () => {
    const { svc, updated } = makeDeps({ id: 'uv1', status: 'ACTIVE', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, status: 'CANCELLED' });
    expect(res).toEqual({ changed: false, status: 'ACTIVE' });
    expect(updated).toHaveLength(0);
  });

  it('WAITING_APPROVAL then order cancelled -> REJECTED', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'WAITING_APPROVAL', voucher: { approvalMode: 'MANUAL' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, status: 'REFUNDED' });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });

  it('no order-voucher -> null', async () => {
    const { svc } = makeDeps(null);
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder });
    expect(res).toBeNull();
  });

  it('threshold falls back to 100000 when config missing', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    (svc as any).prisma.systemConfig.findUnique = jest.fn(async () => null);
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, totalAmount: 99999 });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });
});

describe('createOrderVoucher', () => {
  function makeSvc() {
    const created: any = {};
    const prisma: any = {
      order: { findUnique: jest.fn(async () => ({ id: 'o1', orderCode: 'ORD1', totalAmount: 200000, storeId: null, userId: 'u1' })) },
      voucher: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => { created.voucher = data; return { id: 'v1', ...data }; }),
      },
      userVoucher: { create: jest.fn(async ({ data }: any) => { created.userVoucher = data; return { id: 'uv1', ...data }; }) },
      systemConfig: { findUnique: jest.fn(async () => null) },
    };
    const svc = new VouchersService(prisma, {} as any, {} as any, { handleVoucherCreated: jest.fn(), handleVoucherActivated: jest.fn() } as any);
    return { svc, prisma, created };
  }

  it('MANUAL: stores approvalMode on voucher and creates PENDING UserVoucher', async () => {
    const { svc, created, prisma } = makeSvc();
    await svc.createOrderVoucher({ orderId: 'o1', type: 'PERCENT', value: 10, approvalMode: 'MANUAL' });
    expect(created.voucher.approvalMode).toBe('MANUAL');
    expect(prisma.userVoucher.create).toHaveBeenCalledTimes(1);
    expect(created.userVoucher).toEqual(expect.objectContaining({ userId: 'u1', voucherId: 'v1', sourceOrderCode: 'ORD1', status: 'PENDING', isUsed: false }));
  });

  it('defaults approvalMode to AUTO', async () => {
    const { svc, created } = makeSvc();
    await svc.createOrderVoucher({ orderId: 'o1', type: 'FIXED_AMOUNT', value: 50000 });
    expect(created.voucher.approvalMode).toBe('AUTO');
  });

  it('skips UserVoucher when order has no userId', async () => {
    const { svc, prisma } = makeSvc();
    prisma.order.findUnique = jest.fn(async () => ({ id: 'o1', orderCode: 'ORD1', totalAmount: 200000, storeId: null, userId: null }));
    await svc.createOrderVoucher({ orderId: 'o1', type: 'FIXED_AMOUNT', value: 50000 });
    expect(prisma.userVoucher.create).not.toHaveBeenCalled();
  });
});

import { OrdersService } from './orders.service';

describe('OrdersService VietQR expiry', () => {
  let prisma: any;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) =>
        callback({
          order: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          product: {
            update: jest.fn(),
          },
          productVariant: {
            findFirst: jest.fn().mockResolvedValue({ id: 'variant-1' }),
            update: jest.fn(),
          },
        }),
      ),
    };

    service = new OrdersService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('cancels expired pending VietQR orders and restores stock', async () => {
    const now = new Date('2026-05-06T10:31:00.000Z');
    const order = {
      id: 'order-1',
      orderCode: 'ORD123',
      paymentMethod: 'VIETQR',
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      metadata: {
        vietqr: {
          expiresAt: '2026-05-06T10:30:00.000Z',
          transactionCode: 'ORDER:ORD123',
          amount: 100000,
          expired: false,
        },
      },
      items: [{ productId: 'product-1', quantity: 2, size: 'M', color: 'Black' }],
    };
    let txRef: any;
    prisma.$transaction.mockImplementationOnce((callback) => {
      txRef = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        product: {
          update: jest.fn(),
        },
        productVariant: {
          findFirst: jest.fn().mockResolvedValue({ id: 'variant-1' }),
          update: jest.fn(),
        },
      };
      return callback(txRef);
    });
    prisma.order.findMany.mockResolvedValue([order]);

    await expect(service.expireOverdueVietqrOrders(now)).resolves.toBe(1);

    expect(txRef.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        paymentMethod: 'VIETQR',
        paymentStatus: 'UNPAID',
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
        metadata: {
          vietqr: {
            expiresAt: '2026-05-06T10:30:00.000Z',
            transactionCode: 'ORDER:ORD123',
            amount: 100000,
            expired: true,
            cancelledBy: 'VIETQR_EXPIRY_CRON',
            cancelledAt: now.toISOString(),
          },
        },
      },
    });
    expect(txRef.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { stockQuantity: { increment: 2 } },
    });
    expect(txRef.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-1' },
      data: { stock: { increment: 2 } },
    });
  });

  it('does not cancel VietQR orders that have not expired', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        orderCode: 'ORD123',
        metadata: {
          vietqr: {
            expiresAt: '2026-05-06T10:35:00.000Z',
          },
        },
        items: [],
      },
    ]);

    await expect(
      service.expireOverdueVietqrOrders(new Date('2026-05-06T10:31:00.000Z')),
    ).resolves.toBe(0);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('only queries pending unpaid VietQR orders', async () => {
    prisma.order.findMany.mockResolvedValue([]);

    await service.expireOverdueVietqrOrders();

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        paymentMethod: 'VIETQR',
        paymentStatus: 'UNPAID',
        status: 'PENDING',
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });
});

describe('updateStatus -> order voucher activation', () => {
  it('calls syncOrderVoucherActivation with the updated order', async () => {
    const updatedOrder = {
      id: 'o1',
      orderCode: 'ORD1',
      status: 'DELIVERED',
      totalAmount: 200000,
      isExchange: false,
      paymentStatus: 'UNPAID',
    };
    const prisma: any = {
      order: {
        update: jest.fn(async () => updatedOrder),
      },
    };
    const vouchersService: any = { syncOrderVoucherActivation: jest.fn(async () => ({ changed: true, status: 'ACTIVE' })) };
    const messaging: any = { handleOrderStateChange: jest.fn(), handleVoucherCreated: jest.fn() };
    const adminNotif: any = { createNotification: jest.fn() };
    const svc = new OrdersService(
      prisma,
      vouchersService,
      {} as any,
      {} as any,
      adminNotif,
      messaging,
      {} as any,
    );
    // stub các phương thức phụ để cô lập
    (svc as any).findOne = jest.fn(async () => ({ ...updatedOrder, status: 'SHIPPED', paymentStatus: 'UNPAID' }));
    (svc as any).applyDeliveredCredits = jest.fn(async () => undefined);
    (svc as any).releaseAppliedVouchersForOrder = jest.fn(async () => undefined);
    (svc as any).revertDeliveredCredits = jest.fn(async () => undefined);

    await svc.updateStatus('o1', { status: 'DELIVERED' } as any, 'admin1', 'ADMIN', null);

    expect(vouchersService.syncOrderVoucherActivation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'o1', orderCode: 'ORD1', status: 'DELIVERED', totalAmount: 200000, isExchange: false }),
    );
  });
});

describe('updateAdminFields -> isExchange', () => {
  function makeSvc(order: any) {
    const captured: any = {};
    const prisma: any = {
      order: {
        findUnique: jest.fn(async () => order),
        update: jest.fn(async ({ data }: any) => { captured.data = data; return { ...order, ...data }; }),
      },
    };
    const svc = new OrdersService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    return { svc, captured };
  }

  it('sets isExchange and prepends marker to note (once)', async () => {
    const { svc, captured } = makeSvc({ id: 'o1', storeId: null, subtotal: 0, shippingFee: 0, discountAmount: 0, metadata: {}, note: 'Giao giờ hành chính' });
    await svc.updateAdminFields('o1', { isExchange: true }, 'admin1', 'ADMIN', null);
    expect(captured.data.isExchange).toBe(true);
    expect(captured.data.note).toBe('[ĐƠN ĐỔI] Giao giờ hành chính');
  });

  it('does not duplicate the marker', async () => {
    const { svc, captured } = makeSvc({ id: 'o1', storeId: null, subtotal: 0, shippingFee: 0, discountAmount: 0, metadata: {}, note: '[ĐƠN ĐỔI] Giao giờ hành chính' });
    await svc.updateAdminFields('o1', { isExchange: true }, 'admin1', 'ADMIN', null);
    expect(captured.data.note).toBe('[ĐƠN ĐỔI] Giao giờ hành chính');
  });

  it('removes marker when isExchange=false', async () => {
    const { svc, captured } = makeSvc({ id: 'o1', storeId: null, subtotal: 0, shippingFee: 0, discountAmount: 0, metadata: {}, note: '[ĐƠN ĐỔI] Giao giờ hành chính' });
    await svc.updateAdminFields('o1', { isExchange: false }, 'admin1', 'ADMIN', null);
    expect(captured.data.isExchange).toBe(false);
    expect(captured.data.note).toBe('Giao giờ hành chính');
  });
});

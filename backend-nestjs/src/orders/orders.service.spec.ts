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
          orderVoucher: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          userVoucher: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          voucher: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
      { handleOrderStateChange: jest.fn().mockResolvedValue(undefined) } as any,
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
        orderVoucher: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        userVoucher: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        voucher: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

describe('createAdminOrder -> Prisma $transaction and stock validation', () => {
  let prisma: any;
  let service: OrdersService;
  let messagingService: any;

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          product: { update: jest.fn().mockResolvedValue({}) },
          productVariant: { update: jest.fn().mockResolvedValue({}) },
          order: {
            create: jest.fn().mockResolvedValue({
              id: 'new-order-id',
              orderCode: 'ORD999888',
            }),
          },
        };
        return cb(tx);
      }),
    };

    messagingService = {
      handleOrderCreated: jest.fn().mockResolvedValue(undefined),
    };

    service = new OrdersService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      messagingService,
      {} as any,
    );
  });

  it('bọc toàn bộ trừ kho và order.create trong $transaction', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Áo thun Polo',
      isActive: true,
      stockQuantity: 10,
      originalPrice: 200000,
      salePrice: 180000,
      storeId: 'store-1',
      variants: [
        {
          id: 'var-1',
          stock: 5,
          price: 180000,
          size: { name: 'L' },
          color: { name: 'Black' },
        },
      ],
    });

    const result = await service.createAdminOrder({
      createOrderDto: {
        items: [{ productId: 'prod-1', quantity: 2, size: 'L', color: 'Black' }],
        shippingName: 'Nguyen Van A',
        shippingPhone: '0901234567',
        paymentMethod: 'COD',
      } as any,
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      effectiveStoreId: 'store-1',
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('new-order-id');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('từ chối và ném lỗi nếu sản phẩm không đủ tồn kho', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Áo thun Polo',
      isActive: true,
      stockQuantity: 1, // Chỉ còn 1 mà yêu cầu 2
      originalPrice: 200000,
      salePrice: 180000,
      storeId: 'store-1',
      variants: [],
    });

    await expect(
      service.createAdminOrder({
        createOrderDto: {
          items: [{ productId: 'prod-1', quantity: 2 }],
          shippingName: 'Nguyen Van A',
          shippingPhone: '0901234567',
        } as any,
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        effectiveStoreId: 'store-1',
      }),
    ).rejects.toThrow('không đủ tồn kho');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('từ chối và ném lỗi nếu biến thể (variant) không đủ tồn kho', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Áo thun Polo',
      isActive: true,
      stockQuantity: 100,
      originalPrice: 200000,
      salePrice: 180000,
      storeId: 'store-1',
      variants: [
        {
          id: 'var-1',
          stock: 1, // Variant chỉ còn 1 mà yêu cầu 2
          price: 180000,
          size: { name: 'XL' },
          color: { name: 'White' },
        },
      ],
    });

    await expect(
      service.createAdminOrder({
        createOrderDto: {
          items: [{ productId: 'prod-1', quantity: 2, size: 'XL', color: 'White' }],
          shippingName: 'Nguyen Van A',
          shippingPhone: '0901234567',
        } as any,
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        effectiveStoreId: 'store-1',
      }),
    ).rejects.toThrow('không đủ tồn kho');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rollback nếu order.create trong transaction bị lỗi', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Áo thun Polo',
      isActive: true,
      stockQuantity: 10,
      originalPrice: 200000,
      salePrice: 180000,
      storeId: 'store-1',
      variants: [],
    });

    prisma.$transaction.mockImplementationOnce(async (cb: (tx: any) => Promise<any>) => {
      const tx = {
        product: { update: jest.fn().mockResolvedValue({}) },
        productVariant: { update: jest.fn().mockResolvedValue({}) },
        order: {
          create: jest.fn().mockRejectedValue(new Error('DB Constraint Violation')),
        },
      };
      return cb(tx);
    });

    await expect(
      service.createAdminOrder({
        createOrderDto: {
          items: [{ productId: 'prod-1', quantity: 1 }],
          shippingName: 'Nguyen Van A',
          shippingPhone: '0901234567',
        } as any,
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        effectiveStoreId: 'store-1',
      }),
    ).rejects.toThrow('DB Constraint Violation');
  });
});

describe('create -> Voucher lifecycle status validation (TASK-005)', () => {
  let prisma: any;
  let service: OrdersService;
  let rankConfigService: any;
  let messagingService: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          name: 'Customer A',
          phone: '0901112233',
          totalSpent: 0,
          commissionBalance: 0,
        }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prod-1',
          name: 'Váy dạ hội',
          isActive: true,
          originalPrice: 500000,
          salePrice: null,
          storeId: 'store-1',
          variants: [],
          categories: [],
        }),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      voucher: {
        findUnique: jest.fn(),
      },
      userVoucher: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          product: { update: jest.fn() },
          productVariant: { update: jest.fn() },
          userVoucher: {
            update: jest.fn().mockResolvedValue({ id: 'uv-active' }),
            create: jest.fn().mockResolvedValue({ id: 'uv-new' }),
          },
          voucher: { update: jest.fn() },
          user: { update: jest.fn() },
          order: {
            create: jest.fn().mockResolvedValue({
              id: 'order-1',
              orderCode: 'ORD123456',
            }),
          },
        };
        return cb(tx);
      }),
    };

    rankConfigService = {
      findAll: jest.fn().mockResolvedValue([]),
      resolveRank: jest.fn().mockReturnValue('MEMBER'),
      getDiscountPercentForRank: jest.fn().mockReturnValue(0),
      applyRankDiscount: jest.fn((price) => price),
    };

    messagingService = {
      handleOrderCreated: jest.fn().mockResolvedValue(undefined),
      handleVoucherUsed: jest.fn().mockResolvedValue(undefined),
    };

    service = new OrdersService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      messagingService,
      rankConfigService,
    );
  });

  it('chặn và ném lỗi BadRequestException nếu UserVoucher bị REJECTED', async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      id: 'voucher-1',
      code: 'VOUCHER100',
      isActive: true,
      validFrom: null,
      validTo: null,
      type: 'FIXED_AMOUNT',
      value: 50000,
      minOrderValue: 200000,
      perCustomerLimit: 1,
      orderSources: [],
      salesChannels: [],
      customerSegments: [],
      customerRanks: [],
      customerOccasions: [],
      shippingProvinces: [],
      paymentMethods: [],
      requiredCategoryId: null,
      minProductCount: null,
    });

    prisma.userVoucher.findMany.mockResolvedValue([
      {
        id: 'uv-rejected',
        userId: 'user-1',
        voucherId: 'voucher-1',
        status: 'REJECTED',
        isUsed: false,
        expiresAt: null,
      },
    ]);

    await expect(
      service.create('user-1', {
        items: [{ productId: 'prod-1', quantity: 1 }],
        voucherId: 'voucher-1',
        paymentMethod: 'COD',
      } as any),
    ).rejects.toThrow('Voucher này đã bị từ chối và không thể áp dụng.');
  });

  it('chặn và ném lỗi nếu UserVoucher đang ở trạng thái PENDING', async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      id: 'voucher-1',
      code: 'VOUCHER100',
      isActive: true,
      validFrom: null,
      validTo: null,
      type: 'FIXED_AMOUNT',
      value: 50000,
      minOrderValue: 200000,
      perCustomerLimit: 1,
      orderSources: [],
      salesChannels: [],
      customerSegments: [],
      customerRanks: [],
      customerOccasions: [],
      shippingProvinces: [],
      paymentMethods: [],
      requiredCategoryId: null,
      minProductCount: null,
    });

    prisma.userVoucher.findMany.mockResolvedValue([
      {
        id: 'uv-pending',
        userId: 'user-1',
        voucherId: 'voucher-1',
        status: 'PENDING',
        isUsed: false,
        expiresAt: null,
      },
    ]);

    await expect(
      service.create('user-1', {
        items: [{ productId: 'prod-1', quantity: 1 }],
        voucherId: 'voucher-1',
        paymentMethod: 'COD',
      } as any),
    ).rejects.toThrow('Voucher này đang chờ duyệt/kích hoạt và chưa thể sử dụng.');
  });

  it('cho phép áp dụng thành công nếu UserVoucher ở trạng thái ACTIVE', async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      id: 'voucher-1',
      code: 'VOUCHER100',
      isActive: true,
      validFrom: null,
      validTo: null,
      type: 'FIXED_AMOUNT',
      value: 50000,
      minOrderValue: 200000,
      perCustomerLimit: 1,
      orderSources: [],
      salesChannels: [],
      customerSegments: [],
      customerRanks: [],
      customerOccasions: [],
      shippingProvinces: [],
      paymentMethods: [],
      requiredCategoryId: null,
      minProductCount: null,
    });

    prisma.userVoucher.findMany.mockResolvedValue([
      {
        id: 'uv-active',
        userId: 'user-1',
        voucherId: 'voucher-1',
        status: 'ACTIVE',
        isUsed: false,
        expiresAt: null,
      },
    ]);

    const result = await service.create('user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      voucherId: 'voucher-1',
      paymentMethod: 'COD',
    } as any);

    expect(result.orderId).toBe('order-1');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});



import { CassoService } from './casso.service';

describe('CassoService VietQR processing', () => {
  let prisma: any;
  let ordersService: any;
  let adminNotificationsService: any;
  let service: CassoService;

  const transaction = {
    id: 1,
    reference: 'CAS-1',
    description: 'ORDER:ORD123',
    amount: 100000,
    runningBalance: 1000000,
    transactionDateTime: '2026-05-06T10:31:00.000Z',
    accountNumber: '123',
    bankName: 'Bank',
    bankAbbreviation: 'BANK',
    virtualAccountNumber: '',
    virtualAccountName: '',
    counterAccountName: '',
    counterAccountNumber: '',
    counterAccountBankId: '',
    counterAccountBankName: '',
  };

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) =>
        callback({
          order: {
            update: jest.fn(),
          },
        }),
      ),
    };
    ordersService = {
      isVietqrExpiryCancellation: jest.fn(),
    };
    adminNotificationsService = {
      createNotification: jest.fn(),
    };

    service = new CassoService(
      prisma,
      ordersService,
      {} as any,
      adminNotificationsService,
    );
  });

  it('does not mark expired cancelled VietQR orders as paid', async () => {
    const order = {
      id: 'order-1',
      orderCode: 'ORD123',
      totalAmount: 100000,
      paymentStatus: 'UNPAID',
      status: 'CANCELLED',
      metadata: {
        vietqr: {
          expired: true,
          cancelledBy: 'VIETQR_EXPIRY_CRON',
        },
      },
      items: [],
      user: null,
    };
    prisma.order.findUnique.mockResolvedValue(order);
    ordersService.isVietqrExpiryCancellation.mockReturnValue(true);

    await expect(service.processTransaction(transaction)).resolves.toBe(false);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(adminNotificationsService.createNotification).toHaveBeenCalledWith({
      type: 'ORDER',
      title: 'Thanh toán trễ cho đơn ORD123',
      message: 'Đơn VietQR đã hết hạn và bị huỷ, nhưng Casso ghi nhận giao dịch CAS-1 với số tiền 100000.',
      link: '/admin/orders/order-1',
      metadata: {
        orderId: 'order-1',
        orderCode: 'ORD123',
        transactionReference: 'CAS-1',
        amount: 100000,
        reason: 'VIETQR_LATE_PAYMENT_AFTER_EXPIRY',
      },
    });
  });

  it('marks valid VietQR orders as paid and confirmed', async () => {
    const order = {
      id: 'order-1',
      orderCode: 'ORD123',
      totalAmount: 100000,
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      metadata: {
        vietqr: {
          expired: false,
        },
      },
      items: [],
      user: null,
    };
    let txRef: any;
    prisma.order.findUnique.mockResolvedValue(order);
    ordersService.isVietqrExpiryCancellation.mockReturnValue(false);
    prisma.$transaction.mockImplementationOnce((callback) => {
      txRef = {
        order: {
          update: jest.fn(),
        },
      };
      return callback(txRef);
    });

    await expect(service.processTransaction(transaction)).resolves.toBe(true);

    expect(txRef.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paidAt: expect.any(Date),
      },
    });
  });
});

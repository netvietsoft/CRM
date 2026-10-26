/**
 * Test cho hai luồng voucher trước đây KHÔNG có test nào:
 *   A. claimQRVoucher — khách quét QR + OTP để nhận voucher
 *   B. Vòng đời hết hạn — cron 08:05 đánh dấu EXPIRED / nhắc trước 3 ngày
 *
 * Bổ sung cho order-voucher-activation.spec.ts (đã phủ state machine kích hoạt).
 */
import { VouchersService } from './vouchers.service';
import { MessagingAutomationService } from '../messaging/messaging-automation.service';

// ───────────────────────────── helpers ─────────────────────────────

const QR_CONFIG = {
  key: 'qr_voucher_default',
  value: {
    lockDurationDays: 7,
    values: [50000, 40000, 30000, 20000, 10000],
    minOrderValues: [0, 0, 0, 0, 0],
  },
};

const DELIVERED_ORDER = {
  id: 'o1',
  status: 'DELIVERED',
  shippingPhone: '0912345678',
  userId: 'u1',
  updatedAt: new Date(),
  user: { phone: '0912345678' },
};

const VALID_OTP = { id: 'otp1', phone: '0912345678', otpCode: '123456' };

type ClaimOverrides = {
  order?: any;
  existingClaim?: any;
  otpRecord?: any;
  claimCount?: number;
  orderSpecificVoucher?: any;
};

function makeClaimService(o: ClaimOverrides = {}) {
  const createdVouchers: any[] = [];
  const createdUserVouchers: any[] = [];

  const prisma: any = {
    systemConfig: { findUnique: jest.fn(async () => QR_CONFIG) },
    userVoucher: {
      findUnique: jest.fn(async () => o.existingClaim ?? null),
      count: jest.fn(async () => o.claimCount ?? 0),
      create: jest.fn(async ({ data }: any) => {
        createdUserVouchers.push(data);
        return { id: 'uv-new', ...data, voucher: { value: 50000 } };
      }),
    },
    otpRecord: {
      findFirst: jest.fn(async () => ('otpRecord' in o ? o.otpRecord : VALID_OTP)),
      update: jest.fn(async () => ({})),
    },
    order: { findFirst: jest.fn(async () => ('order' in o ? o.order : DELIVERED_ORDER)) },
    voucher: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.code?.startsWith('QR-ORDER-')) return o.orderSpecificVoucher ?? null;
        if (where.code?.startsWith('QR-DEFAULT-')) return null; // luôn tạo lười
        if (where.id) {
          const v = createdVouchers[createdVouchers.length - 1] ?? o.orderSpecificVoucher;
          return { id: where.id, ...v, _count: { userVouchers: 0 } };
        }
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        createdVouchers.push(data);
        return { id: 'v-new', ...data };
      }),
    },
  };

  const messaging: any = {
    handleVoucherCreated: jest.fn(async () => undefined),
    handleVoucherActivated: jest.fn(async () => undefined),
  };

  const svc = new VouchersService(prisma, {} as any, {} as any, messaging);
  return { svc, prisma, createdVouchers, createdUserVouchers, messaging };
}

const claim = (svc: VouchersService, otp: string | undefined = '123456') =>
  svc.claimQRVoucher('u1', 'ORD1', '0912345678', undefined, otp);

// ───────────────────── A. Khách quét QR nhận voucher ─────────────────────

describe('A. claimQRVoucher — cổng chặn', () => {
  it('A1. thiếu OTP thì từ chối', async () => {
    const { svc } = makeClaimService();
    // Gọi thẳng, KHÔNG qua helper `claim`: truyền undefined vào tham số có giá trị
    // mặc định sẽ kích hoạt chính giá trị mặc định đó (đặc tính của JS).
    await expect(
      svc.claimQRVoucher('u1', 'ORD1', '0912345678', undefined, undefined),
    ).rejects.toThrow(/OTP/i);
  });

  it('A2. OTP sai hoặc hết hạn thì từ chối', async () => {
    const { svc } = makeClaimService({ otpRecord: null });
    await expect(claim(svc)).rejects.toThrow(/OTP/i);
  });

  it('A3. một mã đơn chỉ nhận quà được MỘT lần', async () => {
    const { svc } = makeClaimService({ existingClaim: { id: 'uv-cu' } });
    await expect(claim(svc)).rejects.toThrow(/đã được sử dụng/i);
  });

  it('A4. đơn chưa giao xong thì chưa được nhận', async () => {
    const { svc } = makeClaimService({ order: { ...DELIVERED_ORDER, status: 'SHIPPED' } });
    await expect(claim(svc)).rejects.toThrow(/nhận hàng thành công/i);
  });

  it('A5. đơn bị hủy thì không được nhận', async () => {
    const { svc } = makeClaimService({ order: { ...DELIVERED_ORDER, status: 'CANCELLED' } });
    await expect(claim(svc)).rejects.toThrow();
  });

  it('A6. SĐT không khớp đơn thì từ chối', async () => {
    const { svc } = makeClaimService({
      order: { ...DELIVERED_ORDER, shippingPhone: '0988888888', user: { phone: '0988888888' } },
    });
    await expect(claim(svc)).rejects.toThrow(/không khớp/i);
  });

  it('A7. không tìm thấy đơn thì từ chối', async () => {
    const { svc } = makeClaimService({ order: null });
    await expect(claim(svc)).rejects.toThrow(/Không tìm thấy đơn hàng/i);
  });

  it('A8. vượt trần 5 lần nhận quà thì từ chối', async () => {
    const { svc } = makeClaimService({ claimCount: 5 });
    await expect(claim(svc)).rejects.toThrow(/hết lượt/i);
  });
});

describe('A. claimQRVoucher — nhận thành công', () => {
  it('A9. tạo UserVoucher PENDING và khoá đúng 7 ngày', async () => {
    const { svc, createdUserVouchers } = makeClaimService();
    const res: any = await claim(svc);

    expect(res.success).toBe(true);
    const uv = createdUserVouchers[0];
    expect(uv.status).toBe('PENDING');
    expect(uv.isUsed).toBe(false);
    expect(uv.sourceOrderCode).toBe('ORD1');

    const days = Math.round((uv.unlockAt.getTime() - Date.now()) / 86400000);
    expect(days).toBe(7);
  });

  it('A10. hạn dùng mặc định là 90 ngày khi voucher không đặt durationDays', async () => {
    const { svc, createdUserVouchers } = makeClaimService();
    await claim(svc);
    const days = Math.round((createdUserVouchers[0].expiresAt.getTime() - Date.now()) / 86400000);
    expect(days).toBe(90);
  });

  it('A11. lần nhận ĐẦU tiên được bậc cao nhất 50k', async () => {
    const { svc, createdVouchers } = makeClaimService({ claimCount: 0 });
    await claim(svc);
    expect(createdVouchers[0].value).toBe(50000);
    expect(createdVouchers[0].code).toBe('QR-DEFAULT-50000-0');
  });

  it('A12. lần nhận thứ BA tụt xuống bậc 30k', async () => {
    const { svc, createdVouchers } = makeClaimService({ claimCount: 2 });
    await claim(svc);
    expect(createdVouchers[0].value).toBe(30000);
  });

  it('A13. voucher tự sinh luôn thuộc nhóm GAMIFICATION (ẩn khỏi catalog khách)', async () => {
    const { svc, createdVouchers } = makeClaimService();
    await claim(svc);
    expect(createdVouchers[0].campaignCategory).toBe('GAMIFICATION');
  });

  it('A14. bắn sự kiện vòng đời để hệ thống nhắn tin bắt được', async () => {
    const { svc, messaging } = makeClaimService();
    await claim(svc);
    expect(messaging.handleVoucherCreated).toHaveBeenCalledWith(
      'uv-new',
      'QR_VOUCHER_CLAIMED',
      expect.objectContaining({ orderCode: 'ORD1' }),
    );
  });

  it('A15. voucher riêng của đơn (QR-ORDER) giao chưa đủ 7 ngày thì vẫn PENDING', async () => {
    const { svc, createdUserVouchers } = makeClaimService({
      orderSpecificVoucher: {
        id: 'v-order',
        code: 'QR-ORDER-ORD1',
        isActive: true,
        status: 'AUTO',
        value: 50000,
        durationDays: null,
        validTo: null,
      },
    });
    await claim(svc);
    expect(createdUserVouchers[0].status).toBe('PENDING');
  });
});

// ───────────────────── B. Hết hạn & nhắc hạn (cron 08:05) ─────────────────────

function makeMessagingService(userVouchers: any[]) {
  const updates: any[] = [];
  const queries: any[] = [];
  const prisma: any = {
    messageAutomationRule: { findMany: jest.fn(async () => []) }, // không có rule nhắn tin
    userVoucher: {
      findMany: jest.fn(async (args: any) => {
        queries.push(args);
        return userVouchers;
      }),
      update: jest.fn(async (args: any) => {
        updates.push(args);
        return {};
      }),
    },
  };
  const svc = new MessagingAutomationService(prisma, {} as any, {} as any);
  return { svc, prisma, updates, queries };
}

describe('B. Vòng đời hết hạn', () => {
  it('B1. voucher quá hạn được chuyển sang EXPIRED', async () => {
    const { svc, updates } = makeMessagingService([{ id: 'uv1' }]);
    await svc.processVoucherLifecycleRules(new Date());
    expect(updates).toHaveLength(1);
    expect(updates[0].data.status).toBe('EXPIRED');
    expect(updates[0].where.id).toBe('uv1');
  });

  it('B2. chỉ quét voucher ACTIVE và CHƯA dùng — không đụng voucher đã dùng', async () => {
    const { svc, queries } = makeMessagingService([]);
    await svc.processVoucherLifecycleRules(new Date());
    const expiredQuery = queries.find((q) => q?.where?.expiresAt?.lt);
    expect(expiredQuery).toBeDefined();
    expect(expiredQuery.where.status).toBe('ACTIVE');
    expect(expiredQuery.where.isUsed).toBe(false);
  });

  it('B3. đánh dấu EXPIRED ngay cả khi chưa cấu hình rule nhắn tin nào', async () => {
    const { svc, updates } = makeMessagingService([{ id: 'uv1' }, { id: 'uv2' }]);
    await svc.processVoucherLifecycleRules(new Date());
    expect(updates.map((u) => u.where.id)).toEqual(['uv1', 'uv2']);
  });
});

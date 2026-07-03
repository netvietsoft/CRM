import { ViettelCustomerService } from './viettel-customer.service';

function makeService() {
  const prisma: any = {
    viettelCustomer: { groupBy: jest.fn() },
  };
  const authService: any = {};
  const service = new ViettelCustomerService(prisma, authService);
  return { service, prisma };
}

describe('ViettelCustomerService.getRevenueStats', () => {
  it('gộp count/cod/fee theo trạng thái và tính tổng', async () => {
    const { service, prisma } = makeService();
    prisma.viettelCustomer.groupBy.mockResolvedValue([
      { status: 501, statusName: 'Giao thành công', _count: { _all: 3 }, _sum: { cod: 300, moneyTotalFee: 30 } },
      { status: 504, statusName: 'Đã trả', _count: { _all: 2 }, _sum: { cod: 200, moneyTotalFee: 20 } },
    ]);

    const res = await service.getRevenueStats({ from: '2026-06-01', to: '2026-06-30' });

    expect(res.totalOrders).toBe(5);
    expect(res.totalCod).toBe(500);
    expect(res.totalFee).toBe(50);
    expect(res.from).toBe('2026-06-01');
    expect(res.to).toBe('2026-06-30');
    expect(res.byStatus).toHaveLength(2);
    expect(res.byStatus[0]).toEqual({ status: 501, statusName: 'Giao thành công', count: 3, cod: 300, fee: 30 });
  });

  it('loại đơn nháp (DRAFT-) và lọc theo khoảng ngày gửi gồm trọn ngày `to`', async () => {
    const { service, prisma } = makeService();
    prisma.viettelCustomer.groupBy.mockResolvedValue([]);

    await service.getRevenueStats({ from: '2026-06-17', to: '2026-06-30' });

    const where = prisma.viettelCustomer.groupBy.mock.calls[0][0].where;
    expect(where.trackingCode).toEqual({ not: { startsWith: 'DRAFT-' } });
    expect(where.sendDate.gte).toEqual(new Date('2026-06-17T00:00:00'));
    // `to` bao gồm trọn ngày → lt phải là 2026-07-01 00:00 (to + 1 ngày)
    expect(where.sendDate.lt).toEqual(new Date('2026-07-01T00:00:00'));
  });

  it('thiếu _sum (không có đơn) → cod/fee = 0', async () => {
    const { service, prisma } = makeService();
    prisma.viettelCustomer.groupBy.mockResolvedValue([
      { status: 100, statusName: 'Tạo mới', _count: { _all: 1 }, _sum: { cod: null, moneyTotalFee: null } },
    ]);

    const res = await service.getRevenueStats({});

    expect(res.byStatus[0].cod).toBe(0);
    expect(res.byStatus[0].fee).toBe(0);
    expect(res.totalCod).toBe(0);
  });
});

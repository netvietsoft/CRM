import { buildPnlReport, PnlLine, PnlAdSpend } from './pnl.util';

describe('buildPnlReport', () => {
  it('tính lãi = doanh thu - cost - quảng cáo, gộp theo sản phẩm + ngày', () => {
    const lines: PnlLine[] = [
      { productId: 'A', productName: 'Mẫu A', date: '2026-06-01', revenue: 300000, cost: 150000, missingCost: false },
      { productId: 'A', productName: 'Mẫu A', date: '2026-06-02', revenue: 300000, cost: 150000, missingCost: false },
      { productId: null, productName: 'Lạ', date: '2026-06-01', revenue: 50000, cost: 0, missingCost: false },
    ];
    const adSpend: PnlAdSpend[] = [
      { productId: 'A', productName: 'Mẫu A', date: '2026-06-01', spend: 100000 },
    ];
    const r = buildPnlReport(lines, adSpend);

    expect(r.rows).toHaveLength(1);
    const a = r.rows[0];
    expect(a.productId).toBe('A');
    expect(a.revenueCod).toBe(600000);
    expect(a.costProduct).toBe(300000);
    expect(a.adSpend).toBe(100000);
    expect(a.operations).toBe(0);
    expect(a.profit).toBe(200000); // 600k - 300k - 100k - 0
    expect(a.margin).toBeCloseTo(200000 / 600000);
    expect(a.daily).toHaveLength(2);
    expect(a.daily.find((d) => d.date === '2026-06-01')!.profit).toBe(50000); // 300k-150k-100k

    expect(r.unmatched).toEqual({ revenueCod: 50000, costProduct: 0 });
    expect(r.totals.profit).toBe(200000);
  });

  it('sản phẩm chỉ có quảng cáo, 0 doanh thu → lỗ = -spend; đánh dấu thiếu giá vốn', () => {
    const lines: PnlLine[] = [
      { productId: 'B', productName: 'Mẫu B', date: '2026-06-01', revenue: 100000, cost: 0, missingCost: true },
    ];
    const adSpend: PnlAdSpend[] = [
      { productId: 'C', productName: 'Mẫu C', date: '2026-06-01', spend: 80000 },
    ];
    const r = buildPnlReport(lines, adSpend);
    const c = r.rows.find((x) => x.productId === 'C')!;
    expect(c.revenueCod).toBe(0);
    expect(c.profit).toBe(-80000);
    const b = r.rows.find((x) => x.productId === 'B')!;
    expect(b.missingProductionPrice).toBe(true);
  });
});

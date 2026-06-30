export interface PnlLine {
  productId: string | null; // null = không khớp sản phẩm
  productName: string;
  date: string; // 'YYYY-MM-DD'
  revenue: number;
  cost: number;
  missingCost: boolean;
}

export interface PnlAdSpend {
  productId: string;
  productName: string;
  date: string; // 'YYYY-MM-DD'
  spend: number;
}

export interface PnlRowDaily {
  date: string;
  adSpend: number;
  revenueCod: number;
  costProduct: number;
  operations: number;
  profit: number;
}

export interface PnlRow {
  productId: string | null;
  productName: string;
  adSpend: number;
  revenueCod: number;
  costProduct: number;
  operations: number;
  profit: number;
  margin: number | null;
  missingProductionPrice: boolean;
  daily: PnlRowDaily[];
}

export interface PnlReport {
  rows: PnlRow[];
  unmatched: { revenueCod: number; costProduct: number };
  totals: { adSpend: number; revenueCod: number; costProduct: number; operations: number; profit: number };
}

interface Acc {
  productName: string;
  missingCost: boolean;
  daily: Map<string, { adSpend: number; revenueCod: number; costProduct: number }>;
}

const emptyDay = () => ({ adSpend: 0, revenueCod: 0, costProduct: 0 });

/** Tổng hợp lãi/lỗ theo sản phẩm (+ chi tiết theo ngày). operations = 0 ở v1. */
export function buildPnlReport(lines: PnlLine[], adSpend: PnlAdSpend[]): PnlReport {
  const byProduct = new Map<string, Acc>();
  const unmatched = { revenueCod: 0, costProduct: 0 };

  const ensure = (id: string, name: string): Acc => {
    let acc = byProduct.get(id);
    if (!acc) {
      acc = { productName: name, missingCost: false, daily: new Map() };
      byProduct.set(id, acc);
    } else if (!acc.productName && name) {
      acc.productName = name;
    }
    return acc;
  };

  for (const ln of lines) {
    if (!ln.productId) {
      unmatched.revenueCod += ln.revenue;
      unmatched.costProduct += ln.cost;
      continue;
    }
    const acc = ensure(ln.productId, ln.productName);
    if (ln.missingCost) acc.missingCost = true;
    const d = acc.daily.get(ln.date) ?? emptyDay();
    d.revenueCod += ln.revenue;
    d.costProduct += ln.cost;
    acc.daily.set(ln.date, d);
  }

  for (const s of adSpend) {
    const acc = ensure(s.productId, s.productName);
    const d = acc.daily.get(s.date) ?? emptyDay();
    d.adSpend += s.spend;
    acc.daily.set(s.date, d);
  }

  const rows: PnlRow[] = [];
  const totals = { adSpend: 0, revenueCod: 0, costProduct: 0, operations: 0, profit: 0 };

  for (const [productId, acc] of byProduct) {
    const daily: PnlRowDaily[] = [...acc.daily.entries()]
      .map(([date, v]) => ({
        date,
        adSpend: v.adSpend,
        revenueCod: v.revenueCod,
        costProduct: v.costProduct,
        operations: 0,
        profit: v.revenueCod - v.costProduct - v.adSpend - 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const adSpendSum = daily.reduce((s, d) => s + d.adSpend, 0);
    const revenueCod = daily.reduce((s, d) => s + d.revenueCod, 0);
    const costProduct = daily.reduce((s, d) => s + d.costProduct, 0);
    const profit = revenueCod - costProduct - adSpendSum - 0;

    rows.push({
      productId,
      productName: acc.productName,
      adSpend: adSpendSum,
      revenueCod,
      costProduct,
      operations: 0,
      profit,
      margin: revenueCod > 0 ? profit / revenueCod : null,
      missingProductionPrice: acc.missingCost,
      daily,
    });

    totals.adSpend += adSpendSum;
    totals.revenueCod += revenueCod;
    totals.costProduct += costProduct;
    totals.profit += profit;
  }

  rows.sort((a, b) => b.revenueCod - a.revenueCod || b.adSpend - a.adSpend);
  return { rows, unmatched, totals };
}

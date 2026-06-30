'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVnd } from '@/lib/format';
import Select from '@/components/ui/Select';

interface PnlRowDaily { date: string; adSpend: number; revenueCod: number; costProduct: number; operations: number; profit: number; }
interface PnlRow {
  productId: string | null;
  productName: string;
  adSpend: number; revenueCod: number; costProduct: number; operations: number;
  profit: number; margin: number | null; missingProductionPrice: boolean;
  daily: PnlRowDaily[];
}
interface PnlReport {
  from: string; to: string;
  rows: PnlRow[];
  unmatched: { revenueCod: number; costProduct: number };
  totals: { adSpend: number; revenueCod: number; costProduct: number; operations: number; profit: number };
}
interface OrderSource { code: string; name: string; }

// preset khoảng ngày (YYYY-MM-DD theo local)
function ymd(d: Date): string {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}
function presetRange(p: string): { from: string; to: string } {
  const now = new Date();
  const to = ymd(now);
  if (p === 'today') return { from: to, to };
  if (p === '7d') { const f = new Date(now); f.setDate(f.getDate() - 6); return { from: ymd(f), to }; }
  // month
  const f = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: ymd(f), to };
}

const profitClass = (v: number) => (v < 0 ? 'text-red-600' : 'text-green-600');

export default function AnalyticsClient() {
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState(() => presetRange('month').from);
  const [to, setTo] = useState(() => presetRange('month').to);
  const [source, setSource] = useState('');
  const [sources, setSources] = useState<OrderSource[]>([]);
  const [data, setData] = useState<PnlReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiClientClient.get<OrderSource[]>('/order-sources').then((s) => setSources(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async (f: string, t: string, src: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { from: f, to: t };
      if (src) params.source = src;
      const res = await apiClientClient.get<PnlReport>('/analytics/product-pnl', { params });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(from, to, source); }, [from, to, source, fetchData]);

  const applyPreset = (p: string) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = presetRange(p);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="py-2">
      <h1 className="mb-1 text-2xl font-bold text-gray-800">Lãi/Lỗ sản phẩm</h1>
      <p className="mb-4 text-sm text-gray-500">Doanh thu đơn COD đã thu − giá vốn (Giá sản xuất) − tiền quảng cáo Meta (theo map) − vận hành.</p>

      {/* Bộ lọc */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          className="w-40" size="sm" value={preset} onChange={applyPreset}
          options={[
            { value: 'today', label: 'Hôm nay' },
            { value: '7d', label: '7 ngày' },
            { value: 'month', label: 'Tháng này' },
            { value: 'custom', label: 'Tùy chọn' },
          ]}
        />
        {preset === 'custom' && (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
            <span className="text-gray-400">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          </>
        )}
        <Select
          className="w-48" size="sm" value={source} onChange={setSource}
          placeholder="Tất cả nguồn"
          options={[{ value: '', label: 'Tất cả nguồn' }, ...sources.map((s) => ({ value: s.code, label: s.name }))]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3 text-right">Quảng cáo</th>
              <th className="px-4 py-3 text-right">Doanh thu COD</th>
              <th className="px-4 py-3 text-right">Cost SP</th>
              <th className="px-4 py-3 text-right">Vận hành</th>
              <th className="px-4 py-3 text-right">Tổng lãi</th>
              <th className="px-4 py-3 text-right">Biên %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Đang tính…</td></tr>
            ) : !data || data.rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Chưa có dữ liệu trong khoảng này.</td></tr>
            ) : (
              data.rows.map((r, idx) => {
                const id = r.productId || `row-${idx}`;
                const open = !!expanded[id];
                return (
                  <Fragment key={id}>
                    <tr
                      onClick={() => toggle(id)}
                      className={`cursor-pointer ${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'} hover:bg-blue-50/40`}
                    >
                      <td className="px-4 py-3">
                        <span className="mr-1 text-gray-400">{open ? '▾' : '▸'}</span>
                        <span className="font-medium text-gray-800">{r.productName}</span>
                        {r.missingProductionPrice && (
                          <span className="ml-2 text-amber-600" title="Sản phẩm chưa nhập Giá sản xuất → cost = 0, lãi bị ảo cao">⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{formatVnd(r.adSpend)}</td>
                      <td className="px-4 py-3 text-right">{formatVnd(r.revenueCod)}</td>
                      <td className="px-4 py-3 text-right">{formatVnd(r.costProduct)}</td>
                      <td className="px-4 py-3 text-right">{formatVnd(r.operations)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${profitClass(r.profit)}`}>{formatVnd(r.profit)}</td>
                      <td className={`px-4 py-3 text-right ${profitClass(r.profit)}`}>{r.margin === null ? '—' : `${Math.round(r.margin * 100)}%`}</td>
                    </tr>
                    {open && r.daily.map((d) => (
                      <tr key={`${id}-${d.date}`} className="bg-blue-50/20 text-xs text-gray-600">
                        <td className="px-4 py-2 pl-10">{d.date}</td>
                        <td className="px-4 py-2 text-right">{formatVnd(d.adSpend)}</td>
                        <td className="px-4 py-2 text-right">{formatVnd(d.revenueCod)}</td>
                        <td className="px-4 py-2 text-right">{formatVnd(d.costProduct)}</td>
                        <td className="px-4 py-2 text-right">{formatVnd(d.operations)}</td>
                        <td className={`px-4 py-2 text-right ${profitClass(d.profit)}`}>{formatVnd(d.profit)}</td>
                        <td className="px-4 py-2"></td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })
            )}
          </tbody>
          {data && data.rows.length > 0 && (
            <tfoot>
              {(data.unmatched.revenueCod > 0 || data.unmatched.costProduct > 0) && (
                <tr className="bg-amber-50 text-amber-800">
                  <td className="px-4 py-3 font-medium">Chưa khớp sản phẩm</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">{formatVnd(data.unmatched.revenueCod)}</td>
                  <td className="px-4 py-3 text-right">{formatVnd(data.unmatched.costProduct)}</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3"></td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-800">
                <td className="px-4 py-3">Tổng cộng</td>
                <td className="px-4 py-3 text-right">{formatVnd(data.totals.adSpend)}</td>
                <td className="px-4 py-3 text-right">{formatVnd(data.totals.revenueCod)}</td>
                <td className="px-4 py-3 text-right">{formatVnd(data.totals.costProduct)}</td>
                <td className="px-4 py-3 text-right">{formatVnd(data.totals.operations)}</td>
                <td className={`px-4 py-3 text-right ${profitClass(data.totals.profit)}`}>{formatVnd(data.totals.profit)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

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

const PRESETS: { value: string; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: 'month', label: 'Tháng này' },
  { value: 'custom', label: 'Tùy chọn' },
];

const profitColor = (v: number) => (v < 0 ? '#dc2626' : '#047857');

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

  const kpis = data
    ? [
        { label: 'Doanh thu COD', value: formatVnd(data.totals.revenueCod), color: '#111827' },
        { label: 'Quảng cáo Meta', value: formatVnd(data.totals.adSpend), color: '#111827' },
        { label: 'Giá vốn (Cost SP)', value: formatVnd(data.totals.costProduct), color: '#111827' },
        { label: 'Vận hành', value: formatVnd(data.totals.operations), color: '#111827' },
        { label: 'Tổng lãi', value: formatVnd(data.totals.profit), color: profitColor(data.totals.profit) },
      ]
    : [];

  return (
    <div className="py-2">
      <div className="mb-4">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px] text-[#111827]">Lãi/Lỗ sản phẩm</h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">Doanh thu COD đã thu − giá vốn − quảng cáo Meta − vận hành</p>
      </div>

      {/* Bộ lọc: chips kỳ + nguồn */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const active = preset === p.value;
          return (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              className={`rounded-[10px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                active
                  ? 'bg-[#2563eb] text-white'
                  : 'border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {preset === 'custom' && (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px]" />
            <span className="text-[#9ca3af]">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px]" />
          </>
        )}
        <div className="ml-auto">
          <Select
            className="w-48" size="sm" value={source} onChange={setSource}
            placeholder="Tất cả nguồn"
            triggerClassName="rounded-[10px] border-[#e5e7eb] text-[13px]"
            options={[{ value: '', label: 'Tất cả nguồn' }, ...sources.map((s) => ({ value: s.code, label: s.name }))]}
          />
        </div>
      </div>

      {/* 5 KPI cards */}
      <div className="mb-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.length > 0
          ? kpis.map((s) => (
              <div key={s.label} className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
                <div className="mb-[5px] text-[12px] text-[#6b7280]">{s.label}</div>
                <div className="font-mono text-[17px] font-extrabold tracking-[-0.3px]" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))
          : [0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
                <div className="mb-[5px] h-3 w-20 rounded bg-[#f3f4f6]" />
                <div className="h-5 w-24 rounded bg-[#f3f4f6]" />
              </div>
            ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Sản phẩm</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Quảng cáo</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Doanh thu COD</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Cost SP</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Vận hành</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Tổng lãi</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Biên %</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7280]">Đang tính…</td></tr>
              ) : !data || data.rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6b7280]">Chưa có dữ liệu trong khoảng này.</td></tr>
              ) : (
                data.rows.map((r, idx) => {
                  const id = r.productId || `row-${idx}`;
                  const open = !!expanded[id];
                  return (
                    <Fragment key={id}>
                      <tr
                        onClick={() => toggle(id)}
                        className={`cursor-pointer border-t border-[#f3f4f6] hover:bg-[#eff6ff] ${idx % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'}`}
                      >
                        <td className="px-4 py-3 font-semibold text-[#111827]">
                          <span className="mr-1.5 text-[#9ca3af]">{open ? '▾' : '▸'}</span>
                          {r.productName}
                          {r.missingProductionPrice && (
                            <span
                              className="ml-2 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#92400e]"
                              title="Sản phẩm chưa nhập Giá sản xuất → cost = 0, lãi bị ảo cao"
                            >
                              Chưa có giá vốn
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">{formatVnd(r.adSpend)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatVnd(r.revenueCod)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatVnd(r.costProduct)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatVnd(r.operations)}</td>
                        <td className="px-3 py-3 text-right font-mono font-extrabold" style={{ color: profitColor(r.profit) }}>{formatVnd(r.profit)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: profitColor(r.profit) }}>{r.margin === null ? '—' : `${Math.round(r.margin * 100)}%`}</td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={7} className="bg-[#f5f8ff] p-0">
                            <table className="w-full border-collapse text-[12px] text-[#4b5563]">
                              <tbody>
                                {r.daily.map((d) => (
                                  <tr key={`${id}-${d.date}`} className="border-t border-[#e8edfb]">
                                    <td className="w-[22%] py-[7px] pl-10 pr-4 font-mono">{d.date}</td>
                                    <td className="px-3 py-[7px] text-right font-mono">{formatVnd(d.adSpend)}</td>
                                    <td className="px-3 py-[7px] text-right font-mono">{formatVnd(d.revenueCod)}</td>
                                    <td className="px-3 py-[7px] text-right font-mono">{formatVnd(d.costProduct)}</td>
                                    <td className="px-3 py-[7px] text-right font-mono">{formatVnd(d.operations)}</td>
                                    <td className="px-3 py-[7px] text-right font-mono font-bold" style={{ color: profitColor(d.profit) }}>{formatVnd(d.profit)}</td>
                                    <td className="w-[9%] px-4 py-[7px]"></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
              {data && data.rows.length > 0 && (data.unmatched.revenueCod > 0 || data.unmatched.costProduct > 0) && (
                <tr className="border-t border-[#f3f4f6] bg-[#fffbeb] text-[#92400e]">
                  <td className="px-4 py-3 font-semibold">Chưa khớp sản phẩm</td>
                  <td className="px-3 py-3 text-right font-mono">—</td>
                  <td className="px-3 py-3 text-right font-mono">{formatVnd(data.unmatched.revenueCod)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatVnd(data.unmatched.costProduct)}</td>
                  <td className="px-3 py-3 text-right font-mono">—</td>
                  <td className="px-3 py-3 text-right font-mono">—</td>
                  <td className="px-4 py-3"></td>
                </tr>
              )}
              {data && data.rows.length > 0 && (
                <tr className="border-t-2 border-[#e5e7eb] bg-[#f9fafb] font-extrabold text-[#111827]">
                  <td className="px-4 py-3">Tổng cộng</td>
                  <td className="px-3 py-3 text-right font-mono">{formatVnd(data.totals.adSpend)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatVnd(data.totals.revenueCod)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatVnd(data.totals.costProduct)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatVnd(data.totals.operations)}</td>
                  <td className="px-3 py-3 text-right font-mono" style={{ color: '#059669' }}>{formatVnd(data.totals.profit)}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

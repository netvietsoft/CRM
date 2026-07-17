'use client';

// Bảng doanh thu theo NHÂN VIÊN lên đơn: đơn đã tạo / đơn thành công / doanh thu.
// Đơn "thành công" = DELIVERED/PAYMENT_COLLECTED hoặc vận đơn Viettel (orderReference) đạt 501.
import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatNumber, formatVndTight } from '@/lib/format';

const PERIODS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'lastmonth', label: 'Tháng trước' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'all', label: 'Tất cả' },
];

interface StaffRow {
  staffId: string | null;
  name: string;
  ordersCreated: number;
  ordersDelivered: number;
  revenue: number;
}
interface Resp { label: string; start: string | null; end: string | null; rows: StaffRow[] }

export default function StaffRevenueTable() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try { setData(await apiClientClient.get<Resp>('/admin/revenue-stats/by-staff', { params: { period: p } })); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(period); }, [period, load]);

  const totalRevenue = (data?.rows || []).reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f3f4f6] px-5 py-4">
        <div>
          <h3 className="text-[15px] font-bold text-[#111827]">👤 Doanh thu theo nhân viên</h3>
          <p className="text-[12px] text-[#6b7280]">Đơn NV lên (NV bán hàng) — tính doanh thu khi đơn giao thành công (kể cả tracking Viettel đạt 501).</p>
        </div>
        <div className="flex items-center gap-1.5">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${period === p.value ? 'bg-[#2563eb] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#f9fafb]">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Nhân viên</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Đơn đã lên</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]" title="DELIVERED/PAYMENT_COLLECTED hoặc VTP 501">Giao thành công</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Tỷ lệ</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[#9ca3af]">Đang tải…</td></tr>
            ) : !data || data.rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[#9ca3af]">Chưa có đơn nào trong kỳ này. Gán &quot;NV bán hàng&quot; khi tạo đơn để tính doanh thu theo nhân viên.</td></tr>
            ) : (
              <>
                {data.rows.map((r, i) => (
                  <tr key={r.staffId || 'none'} className={`border-t border-[#f3f4f6] ${i % 2 === 1 ? 'bg-[#f7f9fc]' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${r.staffId ? 'text-[#111827]' : 'text-[#9ca3af]'}`}>{r.name}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-[#4b5563]">{formatNumber(r.ordersCreated)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-[#16a34a]">{formatNumber(r.ordersDelivered)}</td>
                    <td className="px-3 py-3 text-right text-[#6b7280]">{r.ordersCreated ? Math.round((r.ordersDelivered / r.ordersCreated) * 100) : 0}%</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#111827]">{formatVndTight(r.revenue)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[#e5e7eb] bg-[#f8fafc]">
                  <td className="px-4 py-3 font-bold text-[#111827]">Tổng ({data.label})</td>
                  <td className="px-3 py-3 text-right font-bold">{formatNumber(data.rows.reduce((s, r) => s + r.ordersCreated, 0))}</td>
                  <td className="px-3 py-3 text-right font-bold text-[#16a34a]">{formatNumber(data.rows.reduce((s, r) => s + r.ordersDelivered, 0))}</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-4 py-3 text-right font-mono font-extrabold text-[#111827]">{formatVndTight(totalRevenue)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

// Báo cáo vận hành — số liệu tổng hợp tính ở BE (bảng >5k đơn, list cap 1000 nên KHÔNG đếm ở FE).
import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndSymbol } from '@/lib/format';
import { VtTabs, vtCard } from '../_ui';

// KHÔNG dùng vtInput ở thanh lọc — nó chứa w-full đè width cố định làm ô nở toàn hàng.
const inp = 'px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb] transition-colors bg-white';

interface Report {
  totalOrders: number;
  totalCod: number;
  delivered: number;
  deliveredCod: number;
  processing: number;
  pending: number;
  returnCancel: number;
  returnRate: number;
}

// Mặc định: mùng 1 tháng này → hôm nay.
const defaultRange = () => {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ym = `${now.getFullYear()}-${p(now.getMonth() + 1)}`;
  return { productName: '', dateFrom: `${ym}-01`, dateTo: `${ym}-${p(now.getDate())}` };
};

const num = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className={`${vtCard} px-[18px] py-[15px]`}>
      <div className="text-xs text-[#6b7280] mb-1">{label}</div>
      <div className={`text-[22px] font-extrabold tracking-[-0.3px] font-mono ${tone || 'text-[#111827]'}`}>{value}</div>
      {sub && <div className="text-xs text-[#9ca3af] mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ViettelOperationsReportPage() {
  const [filters, setFilters] = useState(defaultRange);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (flt: ReturnType<typeof defaultRange>) => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = {};
      Object.entries(flt).forEach(([k, v]) => { if (v) params[k] = v; });
      setReport(await apiClientClient.get<Report>('/viettelpost/operations-report', { params }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Không tải được báo cáo'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(defaultRange()); }, [load]);

  const r = report;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827] flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">Báo cáo vận hành — đơn tạo, giao thành công, đang xử lý, chờ phát lại, hoàn/huỷ.</p>
        </div>
      </div>
      <VtTabs />

      {/* Thanh lọc */}
      <div className={`${vtCard} p-3 mb-3.5`}>
        <div className="flex items-center gap-2 overflow-x-auto">
          <input className={`${inp} w-[280px] shrink-0`} placeholder="Tên sản phẩm (để trống = tất cả)" value={filters.productName}
            onChange={e => setFilters(p => ({ ...p, productName: e.target.value }))} onKeyDown={e => e.key === 'Enter' && load(filters)} />
          <input className={`${inp} w-[150px] shrink-0`} type="date" title="Từ ngày" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} />
          <input className={`${inp} w-[150px] shrink-0`} type="date" title="Đến ngày" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} />
          <button onClick={() => load(filters)} className="px-[18px] py-2.5 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-bold shrink-0 transition-colors">Lọc ngay</button>
          <button onClick={() => { const d = defaultRange(); setFilters(d); void load(d); }} className="px-3.5 py-2.5 rounded-[10px] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] text-[13px] font-semibold shrink-0 transition-colors">Xóa</button>
        </div>
      </div>

      {error && <div className="p-3 mb-3.5 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] text-[#dc2626] text-[13px]">{error}</div>}
      {loading && !r && <div className={`${vtCard} p-10 text-center text-[13px] text-[#9ca3af]`}>Đang tải báo cáo...</div>}

      {r && (
        <div className="space-y-3.5">
          {/* Hàng 1: đơn tạo + doanh thu dự kiến */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[860px]">
            <StatCard label="Tổng số đơn tạo" value={`${num(r.totalOrders)} đơn`} />
            <StatCard label="Doanh thu dự kiến (tổng COD)" value={formatVndSymbol(r.totalCod)} />
          </div>
          {/* Hàng 2: giao thành công */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[860px]">
            <StatCard label="Đơn giao thành công" value={`${num(r.delivered)} đơn`} tone="text-[#047857]" sub={r.totalOrders ? `${Math.round((r.delivered / r.totalOrders) * 1000) / 10}% tổng đơn` : undefined} />
            <StatCard label="Doanh thu giao thành công" value={formatVndSymbol(r.deliveredCod)} tone="text-[#047857]" />
          </div>
          {/* Hàng 3: đang xử lý / chờ phát lại / hoàn-huỷ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-[860px]">
            <StatCard label="Đơn đang xử lý" value={`${num(r.processing)} đơn`} tone="text-[#1d4ed8]" />
            <StatCard label="Đơn chờ phát lại / chờ xử lý" value={`${num(r.pending)} đơn`} tone="text-[#c2410c]" />
            <StatCard label="Đơn hoàn / huỷ" value={`${num(r.returnCancel)} đơn`} tone="text-[#dc2626]" />
          </div>
          {/* Hàng 4: tỷ lệ hoàn-huỷ */}
          <div className={`${vtCard} px-[18px] py-[15px] max-w-[860px]`}>
            <div className="text-xs text-[#6b7280] mb-1.5">Tỷ lệ hoàn/huỷ (hoàn-huỷ ÷ tổng đơn vận chuyển)</div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-[22px] font-extrabold tracking-[-0.3px] font-mono text-[#dc2626]">{num(r.returnCancel)}/{num(r.totalOrders)} <span className="text-[15px]">chiếm {r.returnRate}%</span></div>
              <div className="flex-1 min-w-[200px] h-3 rounded-full bg-[#f1f5f9] overflow-hidden">
                <div className="h-full bg-[#dc2626] rounded-full transition-all" style={{ width: `${Math.min(100, r.returnRate)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

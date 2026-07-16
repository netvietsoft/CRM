'use client';
export const dynamic = 'force-dynamic';

// Đơn cần xử lý = đơn đang ở nhóm "Chờ xử lý" (505) + "Chờ phát lại" (506/507/509).
// Query trực tiếp theo trạng thái → đơn chuyển trạng thái khác là TỰ RỜI danh sách.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndSymbol } from '@/lib/format';
import { vtpStatusCls, vtpStatusLabel } from '@/lib/vtpStatus';
import { VtTabs, vtCard } from '../_ui';

const PENDING_STATUSES = '505,506,507,509';

interface Row {
  id: string;
  trackingCode: string;
  status: number | null;
  statusName: string | null;
  statusDate: string | null;
  receiverFullname: string | null;
  receiverPhone: string | null;
  receiverAddress: string | null;
  productName: string | null;
  cod: number;
  sendDate: string | null;
  createdAt: string;
  updatedAt: string;
}

function DateCell({ s }: { s: string | null }) {
  if (!s) return <>—</>;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return <>—</>;
  return (
    <div className="leading-tight">
      <div className="text-[#111827]">{d.toLocaleTimeString('vi-VN', { hour12: false })}</div>
      <div className="text-[11px] text-[#9ca3af]">{d.toLocaleDateString('vi-VN')}</div>
    </div>
  );
}

export default function ViettelPendingOrdersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiClientClient.get<Row[]>('/viettelpost/customers', { params: { statuses: PENDING_STATUSES } });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827] flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">Đơn đang <b>Chờ xử lý / Chờ phát lại</b> — xử lý xong (đổi trạng thái) là tự rời danh sách. Click dòng để xem chi tiết &amp; thao tác.</p>
        </div>
        <button onClick={() => void load()} className="px-4 py-2.5 rounded-[10px] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] text-[13px] font-semibold transition-colors">⟳ Tải lại</button>
      </div>
      <VtTabs />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[760px] mb-3.5">
        <div className={`${vtCard} px-[18px] py-[15px]`}>
          <div className="text-xs text-[#6b7280] mb-1">Đơn cần xử lý</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-[#111827] font-mono">{new Intl.NumberFormat('vi-VN').format(rows.length)} <span className="text-[15px]">đơn</span></div>
        </div>
        <div className={`${vtCard} px-[18px] py-[15px]`}>
          <div className="text-xs text-[#6b7280] mb-1">Tổng COD đang treo</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-[#111827] font-mono">{formatVndSymbol(rows.reduce((s, r) => s + (r.cod || 0), 0))}</div>
        </div>
      </div>

      {error && <div className="p-3 mb-3.5 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] text-[#dc2626] text-[13px]">{error}</div>}

      <div className={`${vtCard} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] min-w-[980px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Mã vận đơn</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Người nhận</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">SĐT</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Sản phẩm</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Ngày tạo</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Trạng thái</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] text-right whitespace-nowrap">COD</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-9 text-center text-[#9ca3af]">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-9 text-center text-[#9ca3af]">🎉 Không có đơn nào cần xử lý.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} onClick={() => router.push(`/admin/viettel-customers/${encodeURIComponent(r.trackingCode)}`)}
                    className={`${i % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'} hover:bg-[#eff6ff] border-t border-[#f3f4f6] cursor-pointer transition-colors`}>
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-[#2563eb]">{r.trackingCode}</td>
                    <td className="px-3 py-3 font-medium text-[#111827] whitespace-nowrap">{r.receiverFullname || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[#4b5563]">{r.receiverPhone || '—'}</td>
                    <td className="px-3 py-3 text-[#4b5563] max-w-[240px] truncate" title={r.productName || ''}>{r.productName || '—'}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap"><DateCell s={r.sendDate || r.createdAt} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${vtpStatusCls(r.status)}`}>{vtpStatusLabel(r.status, r.statusName)}</span></td>
                    <td className="px-3 py-3 text-right font-bold font-mono whitespace-nowrap text-[#111827]">{formatVndSymbol(r.cod)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap"><DateCell s={r.statusDate || r.updatedAt} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

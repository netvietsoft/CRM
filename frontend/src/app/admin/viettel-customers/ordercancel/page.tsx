'use client';
export const dynamic = 'force-dynamic';

// Đơn hoàn/huỷ — cùng bộ mã trạng thái với "Đơn hoàn / huỷ" của Báo cáo vận hành
// (RETURN_CANCEL ở BE operationsReport) → số ở báo cáo khớp danh sách ở đây.
// Lọc: người nhận/mã vận đơn/SĐT · tên sản phẩm · nhóm trạng thái · khoảng ngày (mặc định tháng này).
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndSymbol } from '@/lib/format';
import { vtpStatusCls, vtpStatusLabel } from '@/lib/vtpStatus';
import { VtTabs, vtCard } from '../_ui';

// CHỈ hoàn/huỷ phía KHÁCH (không tính 101/102/107/201 = shop hoặc VTP chủ động hủy lấy).
const ALL_STATUSES = '502,503,504,510,515,551';
// Nhóm trạng thái con (theo nhóm chính thức VTP trong vtpStatus.ts).
const STATUS_GROUPS: Array<{ label: string; value: string }> = [
  { label: 'Tất cả hoàn/huỷ', value: '' },
  { label: 'Đã duyệt hoàn', value: '502,515' },
  { label: 'Đang chuyển hoàn', value: '551' },
  { label: 'Đã trả (hoàn về shop)', value: '504' },
  { label: 'Đã hủy giao', value: '503' },
];

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

const monthRange = () => {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ym = `${now.getFullYear()}-${p(now.getMonth() + 1)}`;
  return { from: `${ym}-01`, to: `${ym}-${p(now.getDate())}` };
};

const inp = 'rounded-[10px] border border-[#c7ced9] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#2563eb]';

export default function ViettelCancelledOrdersPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const def = monthRange();
  // Khoảng ngày từ Báo cáo vận hành (nếu có) đè mặc định tháng này.
  const [filters, setFilters] = useState({
    search: '',
    productName: '',
    statuses: '',
    dateFrom: sp.get('dateFrom') || def.from,
    dateTo: sp.get('dateTo') || def.to,
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Số lần hủy/hoàn của MỖI khách (theo SĐT, toàn bộ lịch sử — không phụ thuộc bộ lọc).
  const [cancelCounts, setCancelCounts] = useState<Map<string, number>>(new Map());

  const load = useCallback(async (f: typeof filters) => {
    setLoading(true); setError('');
    try {
      const data = await apiClientClient.get<Row[]>('/viettelpost/customers', {
        params: {
          statuses: f.statuses || ALL_STATUSES,
          ...(f.search.trim() ? { search: f.search.trim() } : {}),
          ...(f.productName.trim() ? { productName: f.productName.trim() } : {}),
          ...(f.dateFrom ? { dateFrom: f.dateFrom } : {}),
          ...(f.dateTo ? { dateTo: f.dateTo } : {}),
        },
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(filters); }, []); // lần đầu — sau đó bấm Lọc
  // Đếm số lần hủy toàn lịch sử theo SĐT (1 lần khi mở trang).
  useEffect(() => {
    apiClientClient.get<Row[]>('/viettelpost/customers', { params: { statuses: ALL_STATUSES } })
      .then((all) => {
        const m = new Map<string, number>();
        for (const r of Array.isArray(all) ? all : []) {
          if (!r.receiverPhone) continue;
          m.set(r.receiverPhone, (m.get(r.receiverPhone) || 0) + 1);
        }
        setCancelCounts(m);
      })
      .catch(() => {});
  }, []);

  const reset = () => {
    const d = monthRange();
    const f = { search: '', productName: '', statuses: '', dateFrom: d.from, dateTo: d.to };
    setFilters(f);
    void load(f);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827] flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">Đơn hàng <b>đã hoàn / huỷ</b> — sắp theo Ngày tạo mới nhất. Click dòng để xem chi tiết.</p>
        </div>
        <button onClick={() => void load(filters)} className="px-4 py-2.5 rounded-[10px] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] text-[13px] font-semibold transition-colors">⟳ Tải lại</button>
      </div>
      <VtTabs />

      {/* Thanh lọc */}
      <div className={`${vtCard} p-3 mb-3.5`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <input className={`${inp} w-[230px]`} placeholder="Người nhận / mã vận đơn / SĐT"
            value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') void load(filters); }} />
          <input className={`${inp} w-[180px]`} placeholder="Tên sản phẩm"
            value={filters.productName} onChange={(e) => setFilters((p) => ({ ...p, productName: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') void load(filters); }} />
          <select className={`${inp} w-[190px]`} value={filters.statuses}
            onChange={(e) => setFilters((p) => ({ ...p, statuses: e.target.value }))}>
            {STATUS_GROUPS.map((g) => <option key={g.label} value={g.value}>{g.label}</option>)}
          </select>
          <input className={`${inp} w-[148px]`} type="date" title="Từ ngày" value={filters.dateFrom}
            onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
          <span className="text-[#9ca3af] text-[13px]">→</span>
          <input className={`${inp} w-[148px]`} type="date" title="Đến ngày" value={filters.dateTo}
            onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} />
          <button onClick={() => void load(filters)} className="px-4 py-2 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-bold transition-colors">Lọc</button>
          <button onClick={reset} className="px-3.5 py-2 rounded-[10px] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] text-[13px] font-semibold transition-colors">Xóa</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[760px] mb-3.5">
        <div className={`${vtCard} px-[18px] py-[15px]`}>
          <div className="text-xs text-[#6b7280] mb-1">Đơn hoàn / huỷ (theo bộ lọc)</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-[#dc2626] font-mono">{new Intl.NumberFormat('vi-VN').format(rows.length)} <span className="text-[15px]">đơn</span></div>
        </div>
        <div className={`${vtCard} px-[18px] py-[15px]`}>
          <div className="text-xs text-[#6b7280] mb-1">Tổng COD không thu được</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-[#dc2626] font-mono">{formatVndSymbol(rows.reduce((s, r) => s + (r.cod || 0), 0))}</div>
        </div>
      </div>

      {error && <div className="p-3 mb-3.5 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] text-[#dc2626] text-[13px]">{error}</div>}

      <div className={`${vtCard} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] min-w-[1080px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Mã vận đơn</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Người nhận</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">SĐT</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Địa chỉ</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Sản phẩm</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Ngày tạo</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Trạng thái</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] text-right whitespace-nowrap">COD</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-9 text-center text-[#9ca3af]">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-9 text-center text-[#9ca3af]">🎉 Không có đơn hoàn/huỷ nào khớp bộ lọc.</td></tr>
              ) : (
                rows.map((r, i) => {
                  const nCancel = r.receiverPhone ? cancelCounts.get(r.receiverPhone) || 0 : 0;
                  return (
                    <tr key={r.id} onClick={() => router.push(`/admin/viettel-customers/${encodeURIComponent(r.trackingCode)}`)}
                      className={`${i % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'} hover:bg-[#eff6ff] border-t border-[#f3f4f6] cursor-pointer transition-colors`}>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-[#2563eb]">{r.trackingCode}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-medium text-[#111827]">{r.receiverFullname || '—'}</div>
                        {nCancel > 0 && (
                          <div className={`text-[11px] font-semibold ${nCancel >= 2 ? 'text-[#dc2626]' : 'text-[#9ca3af]'}`}>
                            {nCancel >= 2 ? '⚠ ' : ''}hủy/hoàn {nCancel} lần
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[#4b5563]">{r.receiverPhone || '—'}</td>
                      <td className="px-3 py-3 text-[#4b5563] max-w-[220px] truncate" title={r.receiverAddress || ''}>{r.receiverAddress || '—'}</td>
                      <td className="px-3 py-3 text-[#4b5563] max-w-[200px] truncate" title={r.productName || ''}>{r.productName || '—'}</td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap"><DateCell s={r.sendDate || r.createdAt} /></td>
                      <td className="px-3 py-3 whitespace-nowrap"><span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${vtpStatusCls(r.status)}`}>{vtpStatusLabel(r.status, r.statusName)}</span></td>
                      <td className="px-3 py-3 text-right font-bold font-mono whitespace-nowrap text-[#111827]">{formatVndSymbol(r.cod)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap"><DateCell s={r.statusDate || r.updatedAt} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

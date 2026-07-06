'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndSymbol } from '@/lib/format';
import { VtTabs, vtCard } from './_ui';

interface ViettelCustomer {
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
  createdAt: string;
  updatedAt: string;
}
interface StatusOpt { status: number; statusName: string | null; count: number }

const EMPTY = { search: '', productName: '', status: '', codMin: '', codMax: '', dateFrom: '', dateTo: '' };

function fmtMoney(n: number | null) {
  return formatVndSymbol(n);
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
}
// Pill trạng thái theo design system CRM (hex chốt).
const STATUS_CLS = (st: number | null) => {
  if (st == null) return 'bg-[#f1f5f9] text-[#64748b]';
  if ([501, 515, 500].includes(st)) return 'bg-[#d1fae5] text-[#047857]';       // giao thành công — xanh
  if ([502, 503, 504, 510, 107].includes(st)) return 'bg-[#fee2e2] text-[#dc2626]'; // lỗi/hoàn — đỏ
  if (st === 505) return 'bg-[#ffedd5] text-[#c2410c]';                          // tồn — cam
  if ([102, 200, 201, 300, 301].includes(st)) return 'bg-[#dbeafe] text-[#1d4ed8]'; // đang xử lý — xanh dương
  return 'bg-[#fef3c7] text-[#92400e]';                                          // khác — vàng
};

export default function ViettelCustomersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ViettelCustomer[]>([]);
  const [statusOpts, setStatusOpts] = useState<StatusOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState(EMPTY);
  const setF = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }));

  const load = useCallback(async (flt: typeof EMPTY) => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = {};
      Object.entries(flt).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await apiClientClient.get<ViettelCustomer[]>('/viettelpost/customers', { params });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(EMPTY); }, [load]);
  useEffect(() => { void apiClientClient.get<StatusOpt[]>('/viettelpost/statuses').then(setStatusOpts).catch(() => {}); }, []);

  const copy = useCallback((label: string, value: string | null) => {
    if (!value) return;
    void navigator.clipboard.writeText(value);
    setToast(`Đã copy ${label}: ${value}`);
    window.setTimeout(() => setToast(''), 2200);
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true); setError('');
    try {
      const r = await apiClientClient.post<{ candidates: number; updated: number }>('/viettelpost/reconcile', {});
      await load(filters);
      setToast(`Đồng bộ xong: ${r.updated}/${r.candidates} đơn`);
      window.setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đồng bộ thất bại');
    } finally { setSyncing(false); }
  }, [load, filters]);

  const totalCod = rows.reduce((s, r) => s + (r.cod || 0), 0);

  const CopyCell = ({ label, value, mono, clamp }: { label: string; value: string | null; mono?: boolean; clamp?: boolean }) =>
    value ? (
      <button type="button" onClick={(e) => { e.stopPropagation(); copy(label, value); }} title={`📋 Copy ${label}: ${value}`}
        className={`group inline-flex items-center gap-1 text-left hover:text-[#2563eb] ${clamp ? 'max-w-[240px]' : ''} ${mono ? 'font-mono font-bold text-[#111827]' : 'text-[#4b5563]'}`}>
        <span className={clamp ? 'truncate' : ''}>{value}</span>
        <span className="opacity-0 group-hover:opacity-100 text-[11px] text-[#2563eb] transition-opacity shrink-0">📋 Copy</span>
      </button>
    ) : <span className="text-[#d1d5db] italic">—</span>;

  const inputCls = 'border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] bg-white transition-colors';

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827] flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="text-[13px] text-[#6b7280] mt-1">Trỏ vào mã vận đơn/SĐT để copy · click vào dòng để xem chi tiết &amp; sửa.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.push('/admin/viettel-customers/create')} className="px-4 py-2.5 rounded-[10px] bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-bold transition-colors">+ Tạo đơn</button>
          <button onClick={() => void syncNow()} disabled={syncing} className="px-4 py-2.5 rounded-[10px] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] text-[13px] font-semibold disabled:opacity-50 transition-colors">
            {syncing ? 'Đang đồng bộ...' : '⟳ Đồng bộ'}
          </button>
        </div>
      </div>

      <VtTabs />

      {/* Thanh lọc — 1 dòng */}
      <div className={`${vtCard} p-3 mb-3.5`}>
        {/* ====== ĐỘ RỘNG CÁC Ô LỌC: chỉnh số trong class w-[...px] của từng <input>/<select> bên dưới ====== */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Ô 1 — Tìm (người nhận/mã VĐ/SĐT) · rộng: w-[250px] */}
          <input className={`${inputCls} w-[250px] shrink-0`} placeholder="Người nhận / Mã VĐ / SĐT" value={filters.search} onChange={e => setF('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && load(filters)} />
          {/* Ô 2 — Tên sản phẩm · rộng: w-[250px] */}
          <input className={`${inputCls} w-[250px] shrink-0`} placeholder="Tên sản phẩm" value={filters.productName} onChange={e => setF('productName', e.target.value)} onKeyDown={e => e.key === 'Enter' && load(filters)} />
          {/* Ô 3 — Trạng thái · rộng: w-[170px] */}
          <select className={`${inputCls} w-[170px] shrink-0`} value={filters.status} onChange={e => setF('status', e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {statusOpts.map((s, i) => <option key={`${s.status}-${i}`} value={s.status}>{s.status} · {s.statusName || ''} ({s.count})</option>)}
          </select>
          {/* Ô 4a — COD từ · rộng: w-[170px] */}
          <input className={`${inputCls} w-[170px] shrink-0 text-right`} type="number" placeholder="COD từ" title="COD từ" value={filters.codMin} onChange={e => setF('codMin', e.target.value)} />
          {/* Ô 4b — COD đến · rộng: w-[170px] */}
          <input className={`${inputCls} w-[170px] shrink-0 text-right`} type="number" placeholder="COD đến" title="COD đến" value={filters.codMax} onChange={e => setF('codMax', e.target.value)} />
          {/* Ô 4c — Từ ngày · rộng: w-[150px] */}
          <input className={`${inputCls} w-[150px] shrink-0`} type="date" title="Từ ngày" value={filters.dateFrom} onChange={e => setF('dateFrom', e.target.value)} />
          {/* Ô 4d — Đến ngày · rộng: w-[150px] */}
          <input className={`${inputCls} w-[150px] shrink-0`} type="date" title="Đến ngày" value={filters.dateTo} onChange={e => setF('dateTo', e.target.value)} />
          <button onClick={() => load(filters)} className="px-[18px] py-2.5 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-bold shrink-0 transition-colors">Lọc</button>
          <button onClick={() => { setFilters(EMPTY); void load(EMPTY); }} className="px-3.5 py-2.5 rounded-[10px] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] text-[13px] font-semibold shrink-0 transition-colors">Xóa</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[760px] mb-3.5">
        <div className={`${vtCard} px-[18px] py-[15px]`}>
          <div className="text-xs text-[#6b7280] mb-1">Kết quả</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-[#111827]">{rows.length} đơn</div>
        </div>
        <div className={`${vtCard} px-[18px] py-[15px]`}>
          <div className="text-xs text-[#6b7280] mb-1">Tổng COD (kết quả)</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-[#111827] font-mono">{fmtMoney(totalCod)}</div>
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
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Trạng thái</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] text-right whitespace-nowrap">COD</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-9 text-center text-[#9ca3af]">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-9 text-center text-[#9ca3af]">Không có vận đơn khớp bộ lọc.</td></tr>
              ) : (
                rows.map((r, i) => {
                  const isDraft = r.trackingCode.startsWith('DRAFT-');
                  const href = isDraft
                    ? `/admin/viettel-customers/create?draft=${encodeURIComponent(r.trackingCode)}`
                    : `/admin/viettel-customers/${encodeURIComponent(r.trackingCode)}`;
                  return (
                  <tr key={r.id} onClick={() => router.push(href)}
                    className={`${i % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'} hover:bg-[#eff6ff] border-t border-[#f3f4f6] cursor-pointer transition-colors`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isDraft
                        ? <span className="font-mono text-[#9ca3af] italic">nháp chưa đẩy</span>
                        : <CopyCell label="mã vận đơn" value={r.trackingCode} mono />}
                    </td>
                    <td className="px-3 py-3 font-medium text-[#111827] whitespace-nowrap">{r.receiverFullname || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap"><CopyCell label="SĐT" value={r.receiverPhone} /></td>
                    <td className="px-3 py-3 text-[#4b5563] max-w-[210px] truncate" title={r.receiverAddress || ''}>{r.receiverAddress || '—'}</td>
                    <td className="px-3 py-3"><CopyCell label="sản phẩm" value={r.productName} clamp /></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {isDraft
                        ? <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f1f5f9] text-[#64748b]">📝 Nháp</span>
                        : <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLS(r.status)}`}>{r.status ?? '—'} {r.statusName || ''}</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-bold font-mono whitespace-nowrap text-[#111827]">{fmtMoney(r.cod)}</td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs whitespace-nowrap">{fmtDate(r.statusDate || r.updatedAt)}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] bg-[#0f172a] text-white text-[13px] shadow-lg">✓ {toast}</div>
      )}
    </div>
  );
}

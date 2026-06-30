'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

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
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
}
const STATUS_CLS = (st: number | null) => {
  if (st == null) return 'bg-gray-100 text-gray-700';
  if ([501, 515, 500, 505].includes(st)) return 'bg-green-100 text-green-700';
  if ([502, 503, 504, 510, 107].includes(st)) return 'bg-red-100 text-red-700';
  if ([102, 200, 201, 300, 301].includes(st)) return 'bg-blue-100 text-blue-700';
  return 'bg-yellow-100 text-yellow-700';
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

  const CopyCell = ({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) =>
    value ? (
      <button type="button" onClick={(e) => { e.stopPropagation(); copy(label, value); }} title={`📋 Copy ${label}: ${value}`}
        className={`group inline-flex items-center gap-1 text-left hover:text-indigo-600 ${mono ? 'font-mono font-semibold text-gray-900' : 'text-gray-800'}`}>
        <span>{value}</span>
        <span className="opacity-0 group-hover:opacity-100 text-[11px] text-indigo-500 transition-opacity">📋 Copy</span>
      </button>
    ) : <span className="text-gray-300 italic">—</span>;

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="text-sm text-gray-500 mt-1">Trỏ vào mã vận đơn/SĐT để copy · click vào dòng để xem chi tiết &amp; sửa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/admin/viettel-customers/create')} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">➕ Tạo đơn</button>
          <button onClick={() => void syncNow()} disabled={syncing} className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold disabled:opacity-50">
            {syncing ? 'Đang đồng bộ...' : '⟳ Đồng bộ'}
          </button>
        </div>
      </div>

      {/* Thanh lọc — 1 dòng */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <input className={`${inputCls} flex-1 min-w-[180px]`} placeholder="Người nhận / Mã VĐ / SĐT" value={filters.search} onChange={e => setF('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && load(filters)} />
          <input className={`${inputCls} flex-1 min-w-[140px]`} placeholder="Tên sản phẩm" value={filters.productName} onChange={e => setF('productName', e.target.value)} onKeyDown={e => e.key === 'Enter' && load(filters)} />
          <select className={`${inputCls} w-[170px] shrink-0`} value={filters.status} onChange={e => setF('status', e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {statusOpts.map(s => <option key={s.status} value={s.status}>{s.status} · {s.statusName || ''} ({s.count})</option>)}
          </select>
          <input className={`${inputCls} w-[100px] shrink-0`} type="number" placeholder="COD từ" title="COD từ" value={filters.codMin} onChange={e => setF('codMin', e.target.value)} />
          <input className={`${inputCls} w-[100px] shrink-0`} type="number" placeholder="COD đến" title="COD đến" value={filters.codMax} onChange={e => setF('codMax', e.target.value)} />
          <input className={`${inputCls} w-[150px] shrink-0`} type="date" title="Từ ngày" value={filters.dateFrom} onChange={e => setF('dateFrom', e.target.value)} />
          <input className={`${inputCls} w-[150px] shrink-0`} type="date" title="Đến ngày" value={filters.dateTo} onChange={e => setF('dateTo', e.target.value)} />
          <button onClick={() => load(filters)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shrink-0">Lọc</button>
          <button onClick={() => { setFilters(EMPTY); void load(EMPTY); }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm shrink-0">Xóa</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-sm text-gray-500">Kết quả</div>
          <div className="text-2xl font-bold text-gray-900">{rows.length} đơn</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-sm text-gray-500">Tổng COD (kết quả)</div>
          <div className="text-2xl font-bold text-gray-900">{fmtMoney(totalCod)}</div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Mã vận đơn</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Người nhận</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">SĐT</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Địa chỉ</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right whitespace-nowrap">COD</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Không có đơn khớp bộ lọc.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} onClick={() => router.push(`/admin/viettel-customers/${encodeURIComponent(r.trackingCode)}`)}
                    className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} hover:bg-blue-50/60 border-b border-gray-50 cursor-pointer`}>
                    <td className="px-4 py-3 whitespace-nowrap"><CopyCell label="mã vận đơn" value={r.trackingCode} mono /></td>
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{r.receiverFullname || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><CopyCell label="SĐT" value={r.receiverPhone} /></td>
                    <td className="px-4 py-3 text-gray-500 max-w-[240px] truncate" title={r.receiverAddress || ''}>{r.receiverAddress || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[240px] truncate" title={r.productName || ''}>{r.productName || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_CLS(r.status)}`}>{r.status ?? '—'} {r.statusName || ''}</span></td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{fmtMoney(r.cod)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.statusDate || r.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm shadow-lg">✓ {toast}</div>
      )}
    </div>
  );
}

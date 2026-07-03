'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndSymbol } from '@/lib/format';

interface VCRow {
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

interface CustomerGroup {
  phone: string;
  name: string;
  address: string;
  orders: VCRow[];
  delivered: number;
  failed: number;
  rate: number | null; // % giao thành công, null nếu chưa có đơn chốt
}

const DELIVERED = new Set([501, 515]);
const FAILED = new Set([502, 503, 504, 510, 107]);

const money = (n: number | null) => formatVndSymbol(n);
const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
};

const rateCls = (rate: number | null) => {
  if (rate == null) return 'bg-gray-100 text-gray-500';
  if (rate >= 90) return 'bg-green-100 text-green-700';
  if (rate >= 70) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

export default function ViettelCustomerListPage() {
  const [rows, setRows] = useState<VCRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modal sửa thông tin KH
  const [editing, setEditing] = useState<CustomerGroup | null>(null);
  const [editForm, setEditForm] = useState({ fullname: '', address: '' });
  const [saving, setSaving] = useState(false);
  // Modal lịch sử mua
  const [history, setHistory] = useState<CustomerGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiClientClient.get<VCRow[]>('/viettelpost/customers');
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const flashToast = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 2200); };
  const copy = (label: string, value: string) => { void navigator.clipboard.writeText(value); flashToast(`Đã copy ${label}: ${value}`); };

  // Gom theo SĐT (bỏ nháp + dòng không có SĐT).
  const groups = useMemo<CustomerGroup[]>(() => {
    const map = new Map<string, VCRow[]>();
    for (const r of rows) {
      if (r.trackingCode.startsWith('DRAFT-')) continue;
      const phone = (r.receiverPhone || '').trim();
      if (!phone) continue;
      (map.get(phone) ?? map.set(phone, []).get(phone)!).push(r);
    }
    const list: CustomerGroup[] = [];
    for (const [phone, orders] of map) {
      const sorted = [...orders].sort((a, b) => +new Date(b.statusDate || b.updatedAt) - +new Date(a.statusDate || a.updatedAt));
      const latest = sorted.find(o => o.receiverFullname) || sorted[0];
      const latestAddr = sorted.find(o => o.receiverAddress) || sorted[0];
      const delivered = orders.filter(o => o.status != null && DELIVERED.has(o.status)).length;
      const failed = orders.filter(o => o.status != null && FAILED.has(o.status)).length;
      const denom = delivered + failed;
      list.push({
        phone,
        name: latest?.receiverFullname || '—',
        address: latestAddr?.receiverAddress || '—',
        orders: sorted,
        delivered,
        failed,
        rate: denom > 0 ? Math.round((delivered / denom) * 100) : null,
      });
    }
    return list.sort((a, b) => b.orders.length - a.orders.length);
  }, [rows]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(q) || g.phone.includes(q) || g.address.toLowerCase().includes(q));
  }, [groups, search]);

  // Phân trang (client-side).
  useEffect(() => { setPage(1); }, [search]);
  const totalPages = Math.max(1, Math.ceil(displayed.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(() => displayed.slice((pageSafe - 1) * pageSize, pageSafe * pageSize), [displayed, pageSafe, pageSize]);

  // Xuất CSV (mở được bằng Excel — có BOM UTF-8).
  const exportCsv = () => {
    const header = ['STT', 'Tên người nhận', 'SĐT', 'Tỷ lệ giao (%)', 'Đã giao', 'Hoàn/Hủy', 'Số đơn', 'Địa chỉ'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = displayed.map((g, i) => [i + 1, g.name, g.phone, g.rate ?? '', g.delivered, g.failed, g.orders.length, g.address]);
    const csv = '﻿' + [header, ...body].map(r => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `khach-hang-viettel-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (g: CustomerGroup) => {
    setEditForm({ fullname: g.name === '—' ? '' : g.name, address: g.address === '—' ? '' : g.address });
    setEditing(g);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      const res = await apiClientClient.patch<{ updated: number }>('/viettelpost/customer-info', {
        phone: editing.phone, fullname: editForm.fullname, address: editForm.address,
      });
      setEditing(null);
      await load();
      flashToast(`Đã cập nhật ${res.updated} đơn của KH`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">👥 Danh sách khách hàng (Viettel)</h1>
          <p className="text-sm text-gray-500 mt-1">Gom theo SĐT · tỷ lệ giao thành công = đã giao / (đã giao + hoàn/hủy).</p>
        </div>
        <Link href="/admin/viettel-customers" className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold">📦 Danh sách đơn</Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <input className={`${inp} max-w-md`} placeholder="Tìm tên / SĐT / địa chỉ" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-500">Số khách</div>
            <div className="text-2xl font-bold text-gray-900">{displayed.length}</div>
          </div>
          <button onClick={exportCsv} disabled={displayed.length === 0} title="Xuất danh sách khách ra Excel (CSV)"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 text-sm font-medium">Xuất Excel <span>⬇</span></button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">STT</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Tên người nhận</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Số ĐT</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Tỷ lệ giao thành công</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Địa chỉ</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayed.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chưa có khách hàng.</td></tr>
              ) : (
                paged.map((g, i) => {
                  const stt = (pageSafe - 1) * pageSize + i + 1;
                  return (
                  <tr key={g.phone} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} border-b border-gray-50`}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{stt}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{g.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => copy('SĐT', g.phone)} title={`📋 Copy SĐT: ${g.phone}`}
                        className="font-mono font-semibold text-gray-900 hover:text-indigo-600">{g.phone}</button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${rateCls(g.rate)}`}>
                        {g.rate == null ? '— (chưa chốt)' : `${g.rate}%`}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">{g.delivered}✓ / {g.failed}✕ · {g.orders.length} đơn</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[260px] truncate" title={g.address}>{g.address}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => openEdit(g)} className="px-2.5 py-1.5 text-xs rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium" title="Sửa thông tin KH">✏️ Sửa</button>
                        <Link href={`/admin/viettel-customers/create?phone=${encodeURIComponent(g.phone)}&name=${encodeURIComponent(g.name === '—' ? '' : g.name)}&address=${encodeURIComponent(g.address === '—' ? '' : g.address)}`}
                          className="px-2.5 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium" title="Tạo đơn cho KH">➕ Tạo đơn</Link>
                        <button onClick={() => setHistory(g)} className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium" title="Xem lịch sử mua">🕘 Lịch sử</button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Chân bảng: số bản ghi + phân trang */}
        {displayed.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-gray-100 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-gray-500">
                Hiển thị {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, displayed.length)} / <b>{displayed.length}</b> khách
              </span>
              <label className="flex items-center gap-1.5 text-gray-500">
                Hiển thị
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm">
                  {[10, 20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                bản ghi
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹ Trước</button>
              <span className="text-gray-600">Trang {pageSafe}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Tiếp ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: sửa thông tin KH */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-800">Sửa thông tin khách hàng</h2>
              <button className="text-2xl leading-none text-gray-400 hover:text-gray-600" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs text-gray-500 mb-1">SĐT (khóa, không đổi)</label><input className={`${inp} bg-gray-100 font-mono`} value={editing.phone} disabled /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Tên người nhận</label><input className={inp} value={editForm.fullname} onChange={e => setEditForm(f => ({ ...f, fullname: e.target.value }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Địa chỉ</label><textarea rows={2} className={inp} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
              <p className="text-xs text-amber-600">Áp dụng cho TẤT CẢ {editing.orders.length} đơn cùng SĐT này.</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-5">
              <button className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setEditing(null)}>Hủy</button>
              <button onClick={() => void saveEdit()} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: lịch sử mua */}
      {history && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setHistory(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-800">Lịch sử mua — {history.name} · {history.phone}</h2>
              <button className="text-2xl leading-none text-gray-400 hover:text-gray-600" onClick={() => setHistory(null)}>✕</button>
            </div>
            <div className="p-5">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500">Mã vận đơn</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500">Sản phẩm</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500">Trạng thái</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">COD</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500">Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {history.orders.map(o => (
                    <tr key={o.id} className="border-b border-gray-50">
                      <td className="px-3 py-2">
                        <Link href={`/admin/viettel-customers/${encodeURIComponent(o.trackingCode)}`} className="font-mono text-indigo-600 hover:underline">{o.trackingCode}</Link>
                      </td>
                      <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={o.productName || ''}>{o.productName || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{o.status ?? '—'} {o.statusName || ''}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{money(o.cod)}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(o.statusDate || o.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm shadow-lg">✓ {toast}</div>}
    </div>
  );
}

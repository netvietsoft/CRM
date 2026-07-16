'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndSymbol } from '@/lib/format';
import { vtpStatusCls, vtpStatusLabel } from '@/lib/vtpStatus';
import { VtTabs, vtCard } from '../_ui';

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
  detailPayload?: { ORDER_SUCCESSDATE?: string | null } | null;
  courierHistory?: Array<{ status: number | null; at: string | null }> | null;
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

// Ô ngày 2 dòng: giờ trên, ngày dưới. `iso` = chuỗi ISO; `raw` = chuỗi VTP sẵn dạng "HH:mm:ss d/M/yyyy".
function TwoLineDate({ iso, raw }: { iso?: string | null; raw?: string | null }) {
  if (raw) {
    const m = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/.exec(raw.trim());
    if (m) return <div className="leading-tight"><div className="text-[#111827]">{m[1]}</div><div className="text-[11px] text-[#9ca3af]">{m[2]}</div></div>;
    return <>{raw}</>;
  }
  if (!iso) return <>—</>;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return <>—</>;
  return <div className="leading-tight"><div className="text-[#111827]">{d.toLocaleTimeString('vi-VN', { hour12: false })}</div><div className="text-[11px] text-[#9ca3af]">{d.toLocaleDateString('vi-VN')}</div></div>;
}

// Thời điểm giao thành công: ORDER_SUCCESSDATE từ detail-v2, fallback mốc 501 trong hành trình.
const successAt = (o: VCRow): { iso?: string | null; raw?: string | null } => {
  if (o.detailPayload?.ORDER_SUCCESSDATE) return { raw: o.detailPayload.ORDER_SUCCESSDATE };
  const h = Array.isArray(o.courierHistory) ? o.courierHistory.find((x) => x?.status === 501) : null;
  return { iso: h?.at || null };
};

const rateCls = (rate: number | null) => {
  if (rate == null) return 'bg-[#f1f5f9] text-[#64748b]';
  if (rate >= 90) return 'bg-[#d1fae5] text-[#047857]';
  if (rate >= 70) return 'bg-[#fef3c7] text-[#92400e]';
  return 'bg-[#fee2e2] text-[#dc2626]';
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

  // Click vào vùng trống của dòng → mở chi tiết (lịch sử mua); bỏ qua khi bấm vào control (nút/link…).
  const openRow = (e: React.MouseEvent, g: CustomerGroup) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="switch"]')) return;
    setHistory(g);
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

  const inp = 'w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] bg-white transition-colors';

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827] flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="text-[13px] text-[#6b7280] mt-1">Gom theo SĐT · tỷ lệ giao thành công = đã giao / (đã giao + hoàn/hủy).</p>
        </div>
      </div>

      <VtTabs />

      <div className={`${vtCard} p-3 mb-3.5`}>
        <input className={`${inp} max-w-md`} placeholder="Tìm tên / SĐT / địa chỉ" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[760px] mb-3.5">
        <div className={`${vtCard} px-[18px] py-[15px] flex items-start justify-between`}>
          <div>
            <div className="text-xs text-[#6b7280] mb-1">Số khách</div>
            <div className="text-[22px] font-extrabold tracking-[-0.3px] text-[#111827]">{displayed.length}</div>
          </div>
          <button onClick={exportCsv} disabled={displayed.length === 0} title="Xuất danh sách khách ra Excel (CSV)"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-[9px] bg-[#d1fae5] text-[#047857] hover:brightness-95 disabled:opacity-40 text-[13px] font-semibold transition">Xuất Excel <span>⬇</span></button>
        </div>
      </div>

      {error && <div className="p-3 mb-3.5 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] text-[#dc2626] text-[13px]">{error}</div>}

      <div className={`${vtCard} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] min-w-[680px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">STT</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Tên người nhận</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Số ĐT</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Tỷ lệ giao thành công</th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Địa chỉ</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayed.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-9 text-center text-[#9ca3af]">Đang tải...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-9 text-center text-[#9ca3af]">Chưa có khách hàng.</td></tr>
              ) : (
                paged.map((g, i) => {
                  const stt = (pageSafe - 1) * pageSize + i + 1;
                  return (
                  <tr key={g.phone} onClick={(e) => openRow(e, g)} className={`${i % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'} border-t border-[#f3f4f6] hover:bg-[#eff6ff] transition-colors cursor-pointer`}>
                    <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">{stt}</td>
                    <td className="px-3 py-3 text-[#111827] font-semibold whitespace-nowrap">{g.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => copy('SĐT', g.phone)} title={`📋 Copy SĐT: ${g.phone}`}
                        className="font-mono font-bold text-[#111827] hover:text-[#2563eb]">{g.phone}</button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${rateCls(g.rate)}`}>
                        {g.rate == null ? '— (chưa chốt)' : `${g.rate}%`}
                      </span>
                      <span className="ml-2 text-[11px] text-[#9ca3af]">{g.delivered}✓ / {g.failed}✕ · {g.orders.length} đơn</span>
                    </td>
                    <td className="px-3 py-3 text-[#4b5563] max-w-[260px] truncate" title={g.address}>{g.address}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => openEdit(g)} className="px-2.5 py-1.5 text-[12px] rounded-[8px] bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#dbeafe] font-semibold transition" title="Sửa thông tin KH">✏️ Sửa</button>
                        <Link href={`/admin/viettel-customers/create?phone=${encodeURIComponent(g.phone)}&name=${encodeURIComponent(g.name === '—' ? '' : g.name)}&address=${encodeURIComponent(g.address === '—' ? '' : g.address)}`}
                          className="px-2.5 py-1.5 text-[12px] rounded-[8px] bg-[#d1fae5] text-[#047857] hover:brightness-95 font-semibold transition" title="Tạo đơn cho KH">➕ Tạo đơn</Link>
                        <button onClick={() => setHistory(g)} className="px-2.5 py-1.5 text-[12px] rounded-[8px] bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] font-semibold transition" title="Xem lịch sử mua">🕘 Lịch sử</button>
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
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-[#eceef2] text-[13px]">
            <div className="flex items-center gap-3">
              <span className="text-[#6b7280]">
                Hiển thị {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, displayed.length)} / <b className="text-[#111827]">{displayed.length}</b> khách
              </span>
              <label className="flex items-center gap-1.5 text-[#6b7280]">
                Hiển thị
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-[#e5e7eb] rounded-[8px] px-2 py-1 text-[13px] bg-white">
                  {[10, 20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                bản ghi
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}
                className="px-3 py-1.5 rounded-[8px] border border-[#e5e7eb] disabled:opacity-40 hover:bg-[#f9fafb] transition">‹ Trước</button>
              <span className="text-[#374151]">Trang {pageSafe}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}
                className="px-3 py-1.5 rounded-[8px] border border-[#e5e7eb] disabled:opacity-40 hover:bg-[#f9fafb] transition">Tiếp ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: sửa thông tin KH */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4">
          <div className="bg-white rounded-[16px] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between border-b border-[#eceef2] p-5">
              <h2 className="text-lg font-extrabold text-[#111827]">Sửa thông tin khách hàng</h2>
              <button className="text-2xl leading-none text-[#9ca3af] hover:text-[#6b7280]" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs text-[#6b7280] mb-1">SĐT (khóa, không đổi)</label><input className={`${inp} bg-[#f3f4f6] font-mono`} value={editing.phone} disabled /></div>
              <div><label className="block text-xs text-[#6b7280] mb-1">Tên người nhận</label><input className={inp} value={editForm.fullname} onChange={e => setEditForm(f => ({ ...f, fullname: e.target.value }))} /></div>
              <div><label className="block text-xs text-[#6b7280] mb-1">Địa chỉ</label><textarea rows={2} className={inp} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
              <p className="text-xs text-[#d97706] font-semibold">Áp dụng cho TẤT CẢ {editing.orders.length} đơn cùng SĐT này.</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#eceef2] p-5">
              <button className="px-4 py-2.5 rounded-[10px] border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] font-semibold transition" onClick={() => setEditing(null)}>Hủy</button>
              <button onClick={() => void saveEdit()} disabled={saving} className="px-4 py-2.5 rounded-[10px] bg-[#2563eb] text-white font-bold hover:bg-[#1d4ed8] disabled:opacity-50 transition">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: lịch sử mua */}
      {history && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4" onClick={(e) => { if (e.target === e.currentTarget) setHistory(null); }}>
          <div className="bg-white rounded-[16px] shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#eceef2] p-5">
              <h2 className="text-lg font-extrabold text-[#111827]">Lịch sử mua — {history.name} · {history.phone}</h2>
              <button className="text-2xl leading-none text-[#9ca3af] hover:text-[#6b7280]" onClick={() => setHistory(null)}>✕</button>
            </div>
            <div className="p-5">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f9fafb]">
                    <th className="px-3 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Mã vận đơn</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Sản phẩm</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Trạng thái</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] text-right">COD</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Giao thành công</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {history.orders.map(o => (
                    <tr key={o.id} className="border-t border-[#f3f4f6]">
                      <td className="px-3 py-2">
                        <Link href={`/admin/viettel-customers/${encodeURIComponent(o.trackingCode)}`} className="font-mono text-[#2563eb] hover:underline">{o.trackingCode}</Link>
                      </td>
                      <td className="px-3 py-2 text-[#4b5563] max-w-[200px] truncate" title={o.productName || ''}>{o.productName || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${vtpStatusCls(o.status)}`}>{vtpStatusLabel(o.status, o.statusName)}</span></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-mono">{money(o.cod)}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap"><TwoLineDate {...successAt(o)} /></td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap"><TwoLineDate iso={o.statusDate || o.updatedAt} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] bg-[#0f172a] text-white text-[13px] shadow-lg">✓ {toast}</div>}
    </div>
  );
}

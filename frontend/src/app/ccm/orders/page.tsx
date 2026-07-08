'use client';
export const dynamic = 'force-dynamic';

/* ============================================================================
 * /ccm/orders — DANH SÁCH ĐƠN THẬT (GET /orders/admin)
 * Thay bảng mock cũ bằng dữ liệu thật: lọc trạng thái / tìm (mã·tên·SĐT) / phân trang.
 * Mỗi dòng có nút "Đẩy VTP" → mở CcmViettelPushDialog (đẩy đơn sang Viettel Post).
 * BE tái dùng: GET /orders/admin?page&status&search&paymentMethod  → {orders,pagination,statusCounts}
 * ========================================================================== */

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import CcmViettelPushDialog, { type PushableOrder } from '@/components/ccm/CcmViettelPushDialog';

const fmtVnd = (n: number) => (n || 0).toLocaleString('vi-VN') + ' đ';

interface AdminOrder {
  id: string; orderCode: string; status: string; totalAmount: number; paymentMethod: string | null;
  createdAt: string; shippingName: string | null; shippingPhone: string | null; note?: string | null;
  user: { name: string | null; phone: string | null } | null;
  items: { quantity: number; product: { name: string | null } | null }[];
  metadata?: Record<string, unknown> | null;
}
interface OrdersResp { orders: AdminOrder[]; pagination: { page: number; limit: number; total: number; totalPages: number }; statusCounts: Record<string, number> }

const STATUS_VI: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Chờ xác nhận', bg: '#ffedd5', fg: '#c2410c' },
  CONFIRMED: { label: 'Đã xác nhận', bg: '#e8ecff', fg: '#3c55e6' },
  PACKAGING: { label: 'Đang đóng gói', bg: '#eef2ff', fg: '#4f46e5' },
  WAITING_FOR_SHIPPING: { label: 'Chờ giao', bg: '#ecfeff', fg: '#0e7490' },
  SHIPPED: { label: 'Đã gửi hàng', bg: '#ffedd5', fg: '#c2410c' },
  DELIVERED: { label: 'Đã giao', bg: '#d1fae5', fg: '#047857' },
  COMPLETED: { label: 'Hoàn tất', bg: '#d1fae5', fg: '#047857' },
  CANCELLED: { label: 'Đã huỷ', bg: '#fef2f2', fg: '#dc2626' },
  REFUNDED: { label: 'Hoàn tiền', bg: '#f1f5f9', fg: '#475569' },
};
const statusView = (s: string) => STATUS_VI[s] || { label: s, bg: '#f1f5f9', fg: '#475569' };
const FILTERABLE = ['PENDING', 'CONFIRMED', 'PACKAGING', 'WAITING_FOR_SHIPPING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];

export default function CcmOrders() {
  const [data, setData] = useState<OrdersResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pushOrder, setPushOrder] = useState<PushableOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      if (status) qs.set('status', status);
      if (search.trim()) qs.set('search', search.trim());
      setData(await apiClientClient.get<OrdersResp>(`/orders/admin?${qs.toString()}`));
    } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi tải đơn hàng'); }
    finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { void load(); }, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const orders = data?.orders || [];
  const pg = data?.pagination;

  return (
    <div className="h-full overflow-y-auto px-[26px] py-[22px] min-w-0">
      <h1 className="m-0 mb-4 text-[26px] font-extrabold tracking-[-0.4px] text-gray-900">Đơn hàng</h1>

      {/* Bộ lọc */}
      <div className="bg-white border border-[#e6e9f2] rounded-[14px] px-[18px] py-[14px] flex gap-2.5 flex-wrap mb-4">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); void load(); }} className="contents">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn / khách / SĐT" className="w-[300px] px-3.5 py-[11px] border border-[#e5e7eb] rounded-[10px] text-[13.5px] outline-none focus:border-[#3c55e6]" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-[13px] py-[11px] border border-[#e5e7eb] rounded-[10px] text-[13.5px] bg-white min-w-[160px]">
            <option value="">Tất cả trạng thái</option>
            {FILTERABLE.map((s) => <option key={s} value={s}>{statusView(s).label}{data?.statusCounts?.[s] ? ` (${data.statusCounts[s]})` : ''}</option>)}
          </select>
          <button type="submit" className="px-[22px] py-[11px] border-none rounded-[10px] bg-[#3c55e6] hover:bg-[#2140da] text-white text-[13.5px] font-bold cursor-pointer">Lọc</button>
        </form>
        <button onClick={() => void load()} type="button" className="px-4 py-[11px] border border-[#e5e7eb] rounded-[10px] bg-white hover:bg-[#f9fafb] text-[13.5px] font-semibold text-[#374151] cursor-pointer">⟳ Tải lại</button>
      </div>

      {error && <div className="bg-[#fef2f2] text-[#dc2626] text-sm px-4 py-2 rounded-[10px] mb-4">{error}</div>}

      {/* Bảng đơn */}
      <div className="bg-white border border-[#e6e9f2] rounded-[14px] overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px] min-w-[980px]">
          <thead>
            <tr className="bg-[#f8fafc] text-left">
              {['Mã đơn', 'Khách hàng', 'SĐT', 'Sản phẩm', 'Tổng tiền', 'Trạng thái', 'Ngày', ''].map((h, i) => (
                <th key={h || i} className={`px-3 py-[11px] text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#6b7280] whitespace-nowrap ${i === 0 || i === 7 ? 'px-[18px]' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-3 py-6 text-center text-[#9ca3af]">Đang tải…</td></tr>}
            {!loading && orders.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-[#9ca3af]">Không có đơn nào.</td></tr>}
            {orders.map((o) => {
              const sv = statusView(o.status);
              const cust = o.shippingName || o.user?.name || '—';
              const phone = o.shippingPhone || o.user?.phone || '—';
              const prods = o.items.map((it) => `${it.product?.name || 'SP'} × ${it.quantity}`).join(', ');
              return (
                <tr key={o.id} className="border-t border-[#f1f5f9] hover:bg-[#f9fafb]">
                  <td className="px-[18px] py-3 font-bold text-[#111827] whitespace-nowrap font-mono">{o.orderCode}</td>
                  <td className="px-3 py-3 font-medium whitespace-nowrap">{cust}</td>
                  <td className="px-3 py-3 text-[#3c55e6] whitespace-nowrap">{phone}</td>
                  <td className="px-3 py-3 text-[#4b5563] max-w-[220px] truncate" title={prods}>{prods || '—'}</td>
                  <td className="px-3 py-3 font-bold whitespace-nowrap">{fmtVnd(o.totalAmount)}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><span className="px-[11px] py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap" style={{ background: sv.bg, color: sv.fg }}>{sv.label}</span></td>
                  <td className="px-3 py-3 text-[#6b7280] text-[13px] whitespace-nowrap">{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-[18px] py-3 text-right whitespace-nowrap">
                    <button onClick={() => setPushOrder({
                      id: o.id, orderCode: o.orderCode, totalAmount: o.totalAmount, paymentMethod: o.paymentMethod,
                      shippingName: cust, shippingPhone: phone === '—' ? '' : phone, note: o.note ?? null,
                      items: o.items.map((it) => ({ name: it.product?.name || 'SP', quantity: it.quantity })),
                    })} className="px-[13px] py-[7px] border border-[#c7d2fe] rounded-[9px] bg-white hover:bg-[#eef2ff] text-[#3c55e6] text-[12.5px] font-bold cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-[4px] bg-[#dc2626] text-white inline-flex items-center justify-center text-[7px] font-extrabold">VTP</span>Đẩy VTP
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {pg && pg.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3.5 py-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-[9px] border border-[#e5e7eb] bg-white text-[13.5px] font-semibold text-[#374151] cursor-pointer hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-default">‹ Trước</button>
          <span className="text-[13.5px] text-[#4b5563]">Trang {pg.page}/{pg.totalPages} · {pg.total} đơn</span>
          <button disabled={page >= pg.totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-[9px] border border-[#e5e7eb] bg-white text-[13.5px] font-semibold text-[#374151] cursor-pointer hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-default">Sau ›</button>
        </div>
      )}

      {/* Dialog đẩy Viettel Post */}
      {pushOrder && <CcmViettelPushDialog order={pushOrder} onClose={() => setPushOrder(null)} onPushed={() => void load()} />}
    </div>
  );
}

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
  createdAt: string; shippingName: string | null; shippingPhone: string | null;
  user: { name: string | null; phone: string | null } | null;
  items: { quantity: number; product: { name: string | null } | null }[];
  metadata?: Record<string, unknown> | null;
}
interface OrdersResp { orders: AdminOrder[]; pagination: { page: number; limit: number; total: number; totalPages: number }; statusCounts: Record<string, number> }

const STATUS_VI: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-700' },
  PACKAGING: { label: 'Đang đóng gói', cls: 'bg-indigo-100 text-indigo-700' },
  WAITING_FOR_SHIPPING: { label: 'Chờ giao', cls: 'bg-cyan-100 text-cyan-700' },
  SHIPPED: { label: 'Đã gửi hàng', cls: 'bg-orange-100 text-orange-700' },
  DELIVERED: { label: 'Đã giao', cls: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Hoàn tất', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-red-100 text-red-600' },
  REFUNDED: { label: 'Hoàn tiền', cls: 'bg-gray-200 text-gray-600' },
};
const statusView = (s: string) => STATUS_VI[s] || { label: s, cls: 'bg-gray-100 text-gray-600' };
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
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Đơn hàng</h1>

      {/* Bộ lọc */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); void load(); }} className="contents">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn / khách / SĐT" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-[260px] outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Tất cả trạng thái</option>
              {FILTERABLE.map((s) => <option key={s} value={s}>{statusView(s).label}{data?.statusCounts?.[s] ? ` (${data.statusCounts[s]})` : ''}</option>)}
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium">Lọc</button>
          </form>
          <button onClick={() => void load()} type="button" className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">⟳ Tải lại</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

      {/* Bảng đơn */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                {['Mã đơn', 'Khách hàng', 'SĐT', 'Sản phẩm', 'Tổng tiền', 'Trạng thái', 'Ngày', ''].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Đang tải…</td></tr>}
              {!loading && orders.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Không có đơn nào.</td></tr>}
              {orders.map((o) => {
                const sv = statusView(o.status);
                const cust = o.shippingName || o.user?.name || '—';
                const phone = o.shippingPhone || o.user?.phone || '—';
                const prods = o.items.map((it) => `${it.product?.name || 'SP'} × ${it.quantity}`).join(', ');
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{o.orderCode}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{cust}</td>
                    <td className="px-3 py-2 text-blue-600 whitespace-nowrap">{phone}</td>
                    <td className="px-3 py-2 max-w-[240px] truncate" title={prods}>{prods || '—'}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{fmtVnd(o.totalAmount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><span className={`text-[11px] px-2 py-0.5 rounded-full ${sv.cls}`}>{sv.label}</span></td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button onClick={() => setPushOrder({
                        id: o.id, orderCode: o.orderCode, totalAmount: o.totalAmount, paymentMethod: o.paymentMethod,
                        shippingName: cust, shippingPhone: phone === '—' ? '' : phone,
                        items: o.items.map((it) => ({ name: it.product?.name || 'SP', quantity: it.quantity })),
                      })} className="px-2 py-1 rounded-md border border-[#3b5bdb] text-[#3b5bdb] text-xs hover:bg-blue-50">🚚 Đẩy VTP</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phân trang */}
      {pg && pg.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40">‹ Trước</button>
          <span className="text-gray-500">Trang {pg.page}/{pg.totalPages} · {pg.total} đơn</span>
          <button disabled={page >= pg.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40">Sau ›</button>
        </div>
      )}

      {/* Dialog đẩy Viettel Post */}
      {pushOrder && <CcmViettelPushDialog order={pushOrder} onClose={() => setPushOrder(null)} onPushed={() => void load()} />}
    </div>
  );
}

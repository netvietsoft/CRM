'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';

interface PulledOrder {
  id: string;
  orderCode: string;
  trackingCode: string | null;
  status: string;
  cod: number;
  totalAmount: number;
  shippingName: string | null;
  currentLocation: string | null;
  updateCount: number;
  lastUpdateAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING: { text: 'Chờ xác nhận', cls: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { text: 'Đã xác nhận', cls: 'bg-yellow-100 text-yellow-700' },
  WAITING_FOR_GOODS: { text: 'Chờ hàng', cls: 'bg-purple-100 text-purple-700' },
  PACKAGING: { text: 'Đang đóng gói', cls: 'bg-purple-100 text-purple-700' },
  WAITING_FOR_SHIPPING: { text: 'Chờ vận chuyển', cls: 'bg-purple-100 text-purple-700' },
  SHIPPED: { text: 'Đang giao', cls: 'bg-blue-100 text-blue-700' },
  DELIVERED: { text: 'Đã nhận hàng', cls: 'bg-green-100 text-green-700' },
  PAYMENT_COLLECTED: { text: 'Đã thu tiền', cls: 'bg-green-100 text-green-700' },
  COMPLETED: { text: 'Hoàn thành', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { text: 'Đã hủy', cls: 'bg-red-100 text-red-700' },
  RETURNING: { text: 'Đang hoàn', cls: 'bg-red-100 text-red-700' },
  REFUNDED: { text: 'Hoàn trả', cls: 'bg-red-100 text-red-700' },
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
}

export default function ViettelPostOrdersPage() {
  const [orders, setOrders] = useState<PulledOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClientClient.get<PulledOrder[]>('/viettelpost/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalCod = orders.reduce((s, o) => s + (o.cod || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📦 Đơn tải về từ ViettelPost
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Đơn <code className="font-mono">source=VIETTEL</code> nhận qua webhook (cập nhật theo thời gian thực).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/integrations/viettelpost" className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium">
            ⚙️ Cấu hình
          </Link>
          <button onClick={() => void load()} disabled={loading} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-sm text-gray-500">Tổng đơn tải về</div>
          <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-sm text-gray-500">Tổng COD</div>
          <div className="text-2xl font-bold text-gray-900">{fmtMoney(totalCod)}</div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-100">
                <th className="px-4 py-3 font-semibold">Mã vận đơn</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-right">COD</th>
                <th className="px-4 py-3 font-semibold">Người nhận</th>
                <th className="px-4 py-3 font-semibold">Vị trí hiện tại</th>
                <th className="px-4 py-3 font-semibold text-center">Cập nhật</th>
                <th className="px-4 py-3 font-semibold">Lần cuối</th>
                <th className="px-4 py-3 font-semibold">Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Chưa có đơn nào tải về từ ViettelPost.</td></tr>
              ) : (
                orders.map((o, i) => {
                  const st = STATUS_LABEL[o.status] || { text: o.status, cls: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={o.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} hover:bg-blue-50/40 border-b border-gray-50`}>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900">{o.trackingCode || o.orderCode}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.text}</span></td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{fmtMoney(o.cod)}</td>
                      <td className="px-4 py-3 text-gray-700">{o.shippingName || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={o.currentLocation || ''}>{o.currentLocation || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{o.updateCount}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(o.lastUpdateAt)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
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

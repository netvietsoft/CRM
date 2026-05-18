'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Check, ChevronDown, Loader2 } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import { toast } from 'react-toastify';
import ExportQRButton from './ExportQRButton';
import CreateOrderButton from './CreateOrderButton';
import OrderSearchInput from './OrderSearchInput';
import OrderStatusFilter from './OrderStatusFilter';
import OrderAdvancedFilter from './OrderAdvancedFilter';

const statusMap: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-orange-100 text-orange-700 border border-orange-200', label: 'Chờ xác nhận' },
  WAITING_FOR_GOODS: { cls: 'bg-purple-100 text-purple-700 border border-purple-200', label: 'Chờ hàng' },
  CONFIRMED: { cls: 'bg-cyan-100 text-cyan-700 border border-cyan-200', label: 'Đã xác nhận' },
  PACKAGING: { cls: 'bg-blue-100 text-blue-700 border border-blue-200', label: 'Đang đóng hàng' },
  WAITING_FOR_SHIPPING: { cls: 'bg-gray-100 text-gray-700 border border-gray-200', label: 'Chờ vận chuyển' },
  SHIPPED: { cls: 'bg-sky-100 text-sky-700 border border-sky-200', label: 'Đã gửi hàng' },
  DELIVERED: { cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', label: 'Đã nhận' },
  PAYMENT_COLLECTED: { cls: 'bg-green-100 text-green-700 border border-green-200', label: 'Đã thu tiền' },
  RETURNING: { cls: 'bg-red-100 text-red-700 border border-red-200', label: 'Đang hoàn' },
  EXCHANGING: { cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200', label: 'Đang đổi' },
  COMPLETED: { cls: 'bg-teal-100 text-teal-700 border border-teal-200', label: 'Hoàn thành' },
  CANCELLED: { cls: 'bg-rose-100 text-rose-700 border border-rose-200', label: 'Đã hủy' },
  REFUNDED: { cls: 'bg-slate-100 text-slate-700 border border-slate-200', label: 'Hoàn trả' },
};

function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

function OrderDateSortHeader({ field, label }: { field: 'createdAt' | 'updatedAt'; label: string }) {
  const searchParams = useSearchParams();
  const currentField = searchParams.get('dateField') || 'updatedAt';
  const currentSort = searchParams.get('dateSort') || 'desc';
  const isActive = currentField === field;
  const nextSort = isActive && currentSort === 'desc' ? 'asc' : 'desc';
  const params = new URLSearchParams(searchParams.toString());
  params.set('dateField', field);
  params.set('dateSort', nextSort);
  params.delete('page');

  const Icon = isActive ? (currentSort === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <Link
      href={`/admin/orders?${params.toString()}`}
      className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 -ml-1.5 transition-colors ${isActive ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
      title={`Sắp xếp ${label.toLowerCase()} ${nextSort === 'desc' ? 'mới nhất' : 'cũ nhất'}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </Link>
  );
}

interface OrdersTableClientProps {
  orders: any[];
  statusCounts: Record<string, number>;
}

export default function OrdersTableClient({ orders, statusCounts }: OrdersTableClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o: any) => o.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedOrders = orders
    .filter((o: any) => selectedIds.has(o.id))
    .map((o: any) => ({ id: o.id, orderCode: o.orderCode, totalAmount: o.totalAmount || 0 }));

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const QuickStatusUpdate = ({ orderId, orderCode, currentStatus }: { orderId: string, orderCode: string, currentStatus: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const st = statusMap[currentStatus] || { cls: 'bg-gray-100 text-gray-700', label: currentStatus };

    const handleUpdate = async (newStatus: string) => {
      if (newStatus === currentStatus) {
        setIsOpen(false);
        return;
      }

      setIsUpdating(true);
      setUpdatingId(orderId);
      try {
        await apiClientClient.patch(`/orders/${orderId}/status`, { status: newStatus });
        const oldLabel = statusMap[currentStatus]?.label || currentStatus;
        const newLabel = statusMap[newStatus]?.label || newStatus;
        toast.success(`Đơn hàng ${orderCode} cập nhật thành công: ${oldLabel} -> ${newLabel}`, {
          autoClose: 6000,
          hideProgressBar: true,
          icon: <span>✅</span>,
          className: 'font-bold text-sm rounded-xl border border-green-100 shadow-lg',
        });
        router.refresh();
      } catch (err) {
        console.error('Failed to update status', err);
        alert('Không thể cập nhật trạng thái');
      } finally {
        setIsUpdating(false);
        setUpdatingId(null);
        setIsOpen(false);
      }
    };

    return (
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-sm transition-all hover:brightness-95 disabled:opacity-70 ${st.cls}`}
        >
          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : st.label}
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[60] py-1 max-h-64 overflow-y-auto">
            {Object.entries(statusMap).map(([code, info]) => (
              <button
                key={code}
                onClick={() => handleUpdate(code)}
                className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${code === currentStatus ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
              >
                <span>{info.label}</span>
                {code === currentStatus && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Đơn hàng</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Quản lý và theo dõi hiệu quả kinh doanh</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full md:w-80">
            <OrderSearchInput />
          </div>
          <OrderAdvancedFilter />
          <ExportQRButton selectedOrders={selectedOrders} />
          <CreateOrderButton />
        </div>
      </div>

      <OrderStatusFilter counts={statusCounts} />

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-gray-50">
          {orders.length === 0 ? (
            <div className="text-center py-10 bg-white">
              <div className="text-lg font-bold text-gray-900">Không tìm thấy đơn hàng</div>
            </div>
          ) : orders.map((order: any) => {
            const st = statusMap[order.status] || { cls: 'badge-gray', label: order.status };
            const isUnread = !order.isRead;
            const isChecked = selectedIds.has(order.id);

            let firstItemDisplay = 'Chưa có sản phẩm';
            const isPancake = order.source === 'PANCAKE';
            const metadata = order.metadata as any;
            if (isPancake && metadata?.items && Array.isArray(metadata.items) && metadata.items.length > 0) {
              if (metadata.items.length > 1) {
                firstItemDisplay = 'Nhiều sản phẩm';
              } else {
                const item = metadata.items[0];
                firstItemDisplay = `${item.name} x ${item.quantity || 1}`;
              }
            } else if (order.items && order.items.length > 0) {
              if (order.items.length > 1) {
                firstItemDisplay = 'Nhiều sản phẩm';
              } else {
                const item = order.items[0];
                firstItemDisplay = `${item.product?.name || 'Sản phẩm'} x ${item.quantity}`;
              }
            }

            const phone = order.shippingPhone || order.user?.phone || '';

            return (
              <div 
                key={`mob-${order.id}`} 
                onClick={() => router.push(`/admin/orders/${order.id}`)}
                className={`p-4 flex flex-col gap-3 transition-all duration-200 cursor-pointer hover:bg-gray-50 ${isUnread ? 'bg-rose-50' : 'bg-white'} ${isChecked ? '!bg-indigo-50/60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(order.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 group cursor-pointer" onClick={(e) => handleCopy(e, order.orderCode)}>
                      <span className={`font-mono text-sm font-bold text-blue-600`}>
                        #{order.orderCode}
                      </span>
                      {copiedId === order.orderCode ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-blue-600" />
                      )}
                    </div>
                  </div>
                  {isUnread && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse flex-shrink-0" />}

                  <QuickStatusUpdate orderId={order.id} orderCode={order.orderCode} currentStatus={order.status} />
                </div>

                <div className="flex flex-col gap-1">
                  <div className={`text-sm ${isUnread ? 'font-bold text-gray-900' : 'font-bold text-gray-700'}`}>
                    {order.shippingName || order.user?.name || order.user?.phone || 'Khách lạ'}
                  </div>
                  {phone && (
                    <div 
                      className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 group cursor-pointer w-fit" 
                      onClick={(e) => handleCopy(e, phone)}
                    >
                      <span>{phone}</span>
                      {copiedId === phone ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400 group-hover:text-blue-600" />
                      )}
                    </div>
                  )}
                </div>

                <div className={`text-[13px] font-medium p-2 rounded-lg truncate ${firstItemDisplay === 'Nhiều sản phẩm' ? 'text-sky-500 font-bold bg-sky-50 border border-sky-100' : 'text-gray-600 bg-gray-50'}`}>
                  {firstItemDisplay}
                </div>

                <div className="flex justify-between items-center mt-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-gray-400">
                      Tạo: {fmtDate(order.createdAt)}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400">
                      Sửa: {fmtDate(order.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Mã đơn</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Khách hàng</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Nguồn</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Sản phẩm</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                  <OrderDateSortHeader field="createdAt" label="Ngày tạo" />
                </th>
                <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                  <OrderDateSortHeader field="updatedAt" label="Cập nhật" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="text-center py-10 bg-white">
                      <div className="text-xl font-bold text-gray-900">Không tìm thấy đơn hàng</div>
                    </div>
                  </td>
                </tr>
              ) : orders.map((order: any) => {
                const st = statusMap[order.status] || { cls: 'badge-gray', label: order.status };
                const isUnread = !order.isRead;
                const isChecked = selectedIds.has(order.id);

                let firstItemDisplay = 'Chưa có sản phẩm';
                const isPancake = order.source === 'PANCAKE';

                const metadata = order.metadata as any;
                if (isPancake && metadata?.items && Array.isArray(metadata.items) && metadata.items.length > 0) {
                  if (metadata.items.length > 1) {
                    firstItemDisplay = 'Nhiều sản phẩm';
                  } else {
                    const item = metadata.items[0];
                    firstItemDisplay = `${item.name} x ${item.quantity || 1}`;
                  }
                } else if (order.items && order.items.length > 0) {
                  if (order.items.length > 1) {
                    firstItemDisplay = 'Nhiều sản phẩm';
                  } else {
                    const item = order.items[0];
                    firstItemDisplay = `${item.product?.name || 'Sản phẩm'} x ${item.quantity}`;
                  }
                }

                const phone = order.shippingPhone || order.user?.phone || '';

                return (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className={`transition-colors cursor-pointer hover:bg-gray-50/50 ${isUnread ? 'bg-rose-50' : ''} ${isChecked ? '!bg-indigo-50/60' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(order.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isUnread && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" title="Đơn hàng chưa đọc" />}
                        <div className="flex items-center gap-2 group" onClick={(e) => handleCopy(e, order.orderCode)}>
                          <span className={`font-mono font-bold text-blue-600 hover:text-blue-800`}>
                            {order.orderCode}
                          </span>
                          {copiedId === order.orderCode ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`font-medium ${isUnread ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                        {order.shippingName || order.user?.name || order.user?.phone || 'Khách lạ'}
                      </div>
                      {phone && (
                        <div 
                          className="text-xs text-gray-500 flex items-center gap-1.5 group w-fit mt-0.5"
                          onClick={(e) => handleCopy(e, phone)}
                        >
                          <span className="hover:text-blue-600 transition-colors">{phone}</span>
                          {copiedId === phone ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-300 group-hover:text-blue-600 transition-colors" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-700">
                        {order.source === 'PORTAL_DIRECT' || !order.source ? 'WEBSITE' : order.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <span className={`truncate ${firstItemDisplay === 'Nhiều sản phẩm' ? 'text-sky-500 font-bold' : 'text-gray-800'}`} title={firstItemDisplay}>
                          {firstItemDisplay}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <QuickStatusUpdate orderId={order.id} orderCode={order.orderCode} currentStatus={order.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{fmtDate(order.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{fmtDate(order.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

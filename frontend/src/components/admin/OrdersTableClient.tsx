'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Check, ChevronDown, Loader2 } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import { toast } from 'react-toastify';
import ExportQRButton from './ExportQRButton';
import CreateOrderButton from './CreateOrderButton';
import OrderStatusFilter from './OrderStatusFilter';
import OrderAdvancedFilter from './OrderAdvancedFilter';
import OrderActiveFilters from './OrderActiveFilters';
import RevenueStats from './RevenueStats';
import { formatNumber, formatVndTight } from '@/lib/format';

// Design palette (handoff): green #047857/#d1fae5, orange #c2410c/#ffedd5,
// yellow #92400e/#fef3c7, red #dc2626/#fee2e2. Mapped to statuses by semantics.
const statusMap: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-[#ffedd5] text-[#c2410c]', label: 'Chờ xác nhận' },
  WAITING_FOR_GOODS: { cls: 'bg-[#fef3c7] text-[#92400e]', label: 'Chờ hàng' },
  CONFIRMED: { cls: 'bg-[#dbeafe] text-[#1d4ed8]', label: 'Đã xác nhận' },
  PACKAGING: { cls: 'bg-[#dbeafe] text-[#1d4ed8]', label: 'Đang đóng hàng' },
  WAITING_FOR_SHIPPING: { cls: 'bg-[#fef3c7] text-[#92400e]', label: 'Chờ vận chuyển' },
  SHIPPED: { cls: 'bg-[#dbeafe] text-[#1d4ed8]', label: 'Đã gửi hàng' },
  DELIVERED: { cls: 'bg-[#d1fae5] text-[#047857]', label: 'Đã nhận' },
  PAYMENT_COLLECTED: { cls: 'bg-[#d1fae5] text-[#047857]', label: 'Đã thu tiền' },
  RETURNING: { cls: 'bg-[#fee2e2] text-[#dc2626]', label: 'Đang hoàn' },
  EXCHANGING: { cls: 'bg-[#fef3c7] text-[#92400e]', label: 'Đang đổi' },
  COMPLETED: { cls: 'bg-[#d1fae5] text-[#047857]', label: 'Hoàn thành' },
  CANCELLED: { cls: 'bg-[#fee2e2] text-[#dc2626]', label: 'Đã hủy' },
  REFUNDED: { cls: 'bg-[#fee2e2] text-[#dc2626]', label: 'Hoàn trả' },
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
  orders: OrdersTableOrder[];
  statusCounts: Record<string, number>;
  filteredRevenue?: number;
  totalCount?: number;
}

interface OrderUserSummary {
  name?: string | null;
  phone?: string | null;
}

interface OrderMetadataItem {
  name?: string | null;
  quantity?: number | null;
}

interface OrderMetadata {
  items?: OrderMetadataItem[] | null;
}

interface OrderItemSummary {
  quantity: number;
  product?: {
    name?: string | null;
  } | null;
}

interface OrdersTableOrder {
  id: string;
  orderCode: string;
  totalAmount?: number | null;
  status: string;
  isRead?: boolean;
  source?: string | null;
  metadata?: OrderMetadata | null;
  items?: OrderItemSummary[] | null;
  user?: OrderUserSummary | null;
  shippingPhone?: string | null;
  shippingName?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

function getFirstItemDisplay(order: OrdersTableOrder) {
  const isPancake = order.source === 'PANCAKE';
  const metadata = order.metadata;

  if (isPancake && Array.isArray(metadata?.items) && metadata.items.length > 0) {
    if (metadata.items.length > 1) {
      return 'Nhiều sản phẩm';
    }

    const item = metadata.items[0];
    return `${item.name || 'Sản phẩm'} x ${item.quantity || 1}`;
  }

  if (Array.isArray(order.items) && order.items.length > 0) {
    if (order.items.length > 1) {
      return 'Nhiều sản phẩm';
    }

    const item = order.items[0];
    return `${item.product?.name || 'Sản phẩm'} x ${item.quantity}`;
  }

  return 'Chưa có sản phẩm';
}

export default function OrdersTableClient({ orders, statusCounts, filteredRevenue = 0, totalCount = 0 }: OrdersTableClientProps) {
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
      setSelectedIds(new Set(orders.map((order) => order.id)));
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
    .filter((order) => selectedIds.has(order.id))
    .map((order) => ({ id: order.id, orderCode: order.orderCode, totalAmount: order.totalAmount || 0 }));

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
        setIsOpen(false);
      }
    };

    return (
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
          className={`inline-flex items-center gap-1.5 px-[11px] py-1 rounded-full text-[11.5px] font-bold transition-all hover:brightness-95 disabled:opacity-70 ${st.cls}`}
        >
          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : st.label}
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1 w-[190px] bg-white border border-[#eceef2] rounded-xl shadow-[0_16px_40px_rgba(15,23,42,0.16)] z-[60] p-1.5 max-h-64 overflow-y-auto">
            {Object.entries(statusMap).map(([code, info]) => (
              <button
                key={code}
                onClick={() => handleUpdate(code)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-[#f3f4f6] transition-colors ${code === currentStatus ? 'text-[#2563eb] bg-[#eff6ff]' : 'text-[#374151]'}`}
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
          <h1 className="text-2xl font-extrabold text-[#111827] tracking-[-0.4px]">Đơn hàng</h1>
          <p className="text-[#6b7280] mt-1 text-[13px]">Quản lý và theo dõi hiệu quả kinh doanh</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportQRButton selectedOrders={selectedOrders} />
          <CreateOrderButton />
        </div>
      </div>

      <RevenueStats defaultPeriod="today" periods={['today', 'yesterday', 'week', 'lastweek', 'month', 'lastmonth']} scope="all" dateField="updatedAt" />

      <OrderAdvancedFilter />

      <OrderStatusFilter counts={statusCounts} />

      <OrderActiveFilters />

      {/* Tổng kết quả lọc */}
      <div className="mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-[#d1fae5] bg-[#ecfdf5] px-4 py-2.5">
        <span className="text-[13px] text-[#4b5563]">
          Kết quả: <b className="text-[#111827]">{formatNumber(totalCount)}</b> đơn
        </span>
        <span className="text-[13px] text-[#4b5563]">
          Doanh thu (đã lọc):{' '}
          <b className="text-[14.5px] text-[#047857]">{formatVndTight(filteredRevenue)}</b>
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-[#eceef2] overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-gray-50">
          {orders.length === 0 ? (
            <div className="text-center py-10 bg-white">
              <div className="text-lg font-bold text-gray-900">Không tìm thấy đơn hàng</div>
            </div>
          ) : orders.map((order, idx) => {
            const isUnread = !order.isRead;
            const isChecked = selectedIds.has(order.id);
            const firstItemDisplay = getFirstItemDisplay(order);
            const phone = order.shippingPhone || order.user?.phone || '';

            return (
              <div
                key={`mob-${order.id}`}
                onClick={() => router.push(`/admin/orders/${order.id}`)}
                className={`p-4 flex flex-col gap-3 transition-all duration-200 cursor-pointer hover:bg-blue-50/40 ${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'} ${isChecked ? '!bg-indigo-50/60' : ''}`}
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
                      className="text-xs text-gray-700 font-semibold flex items-center gap-1.5 group cursor-pointer w-fit"
                      onClick={(e) => handleCopy(e, phone)}
                    >
                      <span>{phone}</span>
                      {copiedId === phone ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-700" />
                      )}
                    </div>
                  )}
                </div>

                <div
                  onClick={(e) => handleCopy(e, firstItemDisplay)}
                  className={`text-[13px] font-medium p-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer ${firstItemDisplay === 'Nhiều sản phẩm' ? 'text-sky-500 font-bold bg-sky-50 border border-sky-100' : 'text-gray-600 bg-gray-50'}`}
                >
                  <span className="truncate">{firstItemDisplay}</span>
                  {copiedId === firstItemDisplay ? (
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  )}
                </div>

                <div className="flex justify-between items-end mt-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-gray-400">
                      Tạo: {fmtDate(order.createdAt)}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400">
                      Sửa: {fmtDate(order.updatedAt)}
                    </span>
                  </div>
                  <span className="text-base font-bold text-gray-900">
                    {formatVndTight(order.totalAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] min-w-[880px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Mã đơn</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Khách hàng</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Nguồn</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Sản phẩm</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Tổng tiền</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">
                  <OrderDateSortHeader field="createdAt" label="Ngày tạo" />
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">
                  <OrderDateSortHeader field="updatedAt" label="Cập nhật" />
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="text-center py-10 bg-white">
                      <div className="text-xl font-bold text-gray-900">Không tìm thấy đơn hàng</div>
                    </div>
                  </td>
                </tr>
              ) : orders.map((order, idx) => {
                const isUnread = !order.isRead;
                const isChecked = selectedIds.has(order.id);
                const firstItemDisplay = getFirstItemDisplay(order);
                const phone = order.shippingPhone || order.user?.phone || '';

                return (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className={`border-t border-[#f3f4f6] transition-colors cursor-pointer hover:bg-[#eff6ff] ${idx % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'} ${isChecked ? '!bg-indigo-50/60' : ''}`}
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
                          <span className={`font-mono text-xs font-bold text-[#2563eb] hover:text-blue-800`}>
                            #{order.orderCode}
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
                          className="text-xs text-gray-700 font-semibold flex items-center gap-1.5 group w-fit mt-0.5 cursor-pointer"
                          onClick={(e) => handleCopy(e, phone)}
                        >
                          <span className="hover:text-blue-600 transition-colors">{phone}</span>
                          {copiedId === phone ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-700 transition-colors" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-[3px] rounded-lg text-[11px] font-semibold bg-[#f3f4f6] text-[#4b5563]">
                        {order.source === 'PORTAL_DIRECT' || !order.source ? 'WEBSITE' : order.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div
                        className="flex items-center gap-1.5 max-w-[220px] group cursor-pointer w-fit"
                        onClick={(e) => handleCopy(e, firstItemDisplay)}
                      >
                        <span className={`truncate ${firstItemDisplay === 'Nhiều sản phẩm' ? 'text-sky-500 font-bold' : 'text-gray-800'}`} title={firstItemDisplay}>
                          {firstItemDisplay}
                        </span>
                        {copiedId === firstItemDisplay ? (
                          <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-700 transition-colors shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900">
                      {formatVndTight(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <QuickStatusUpdate orderId={order.id} orderCode={order.orderCode} currentStatus={order.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] text-[#6b7280]">{fmtDate(order.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] text-[#6b7280]">{fmtDate(order.updatedAt)}</td>
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

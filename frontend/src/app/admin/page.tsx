import Link from 'next/link';
import RevenueStats from '@/components/admin/RevenueStats';
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import { formatNumber, formatVndSymbol } from '@/lib/format';

interface DashboardOrderUser {
  name: string | null;
  phone: string | null;
}

interface DashboardRecentOrder {
  id: string;
  orderCode: string;
  status: string;
  totalAmount: number;
  shippingName: string | null;
  user?: DashboardOrderUser | null;
}

interface DashboardTopCustomer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  rank: string | null;
  totalSpent: number;
  _count?: {
    orders: number;
  };
}

interface DashboardStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  activeVouchers: number;
  pendingCommissions: number;
  recentOrders: DashboardRecentOrder[];
  topCustomers: DashboardTopCustomer[];
}

function formatCurrency(amount: number) {
  return formatVndSymbol(amount);
}

function getStatusBadge(status: string) {
  const map: Record<string, { class: string; label: string }> = {
    PENDING: { class: 'badge-warning', label: 'Chờ xử lý' },
    CONFIRMED: { class: 'badge-info', label: 'Xác nhận' },
    COMPLETED: { class: 'badge-success', label: 'Hoàn thành' },
    CANCELLED: { class: 'badge-danger', label: 'Đã hủy' },
    REFUNDED: { class: 'badge-danger', label: 'Hoàn trả' },
  };
  return map[status] || { class: 'badge-member', label: status };
}

// Pill màu theo palette handoff: green #047857/#d1fae5, orange #c2410c/#ffedd5,
// yellow #92400e/#fef3c7, red #dc2626/#fee2e2, blue #1d4ed8/#dbeafe.
function statusPillClass(cls: string) {
  switch (cls) {
    case 'badge-success':
      return 'bg-[#d1fae5] text-[#047857]';
    case 'badge-warning':
      return 'bg-[#fef3c7] text-[#92400e]';
    case 'badge-info':
      return 'bg-[#dbeafe] text-[#1d4ed8]';
    case 'badge-danger':
      return 'bg-[#fee2e2] text-[#dc2626]';
    default:
      return 'bg-[#ffedd5] text-[#c2410c]';
  }
}

// Màu hạng KH giữ nguyên logic, tô theo palette pill.
function rankPillClass(rank: string | null) {
  switch (rank) {
    case 'PLATINUM':
      return 'bg-purple-100 text-purple-700';
    case 'DIAMOND':
      return 'bg-[#dbeafe] text-[#1d4ed8]';
    case 'GOLD':
      return 'bg-[#fef3c7] text-[#92400e]';
    case 'SILVER':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

// Màu avatar xoay vòng theo initial (giống c.avBg trong handoff).
const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default async function AdminDashboard() {
  let stats: DashboardStats = {
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    activeVouchers: 0,
    pendingCommissions: 0,
    recentOrders: [],
    topCustomers: [],
  };

  try {
    stats = await apiClient.get<DashboardStats>('/admin/dashboard');
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
  }

  return (
    <>
      <div className="mb-[22px] flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-[#111827]">Dashboard</h1>
          <p className="mt-1 mb-0 text-[13px] text-[#6b7280]">Tổng quan hệ thống chăm sóc khách hàng</p>
        </div>
        <div className="flex gap-[10px]">
          <Link
            href="/admin/customers"
            className="px-4 py-[9px] bg-white border border-[#e5e7eb] text-[#374151] rounded-[10px] font-semibold text-[13px] hover:bg-[#f9fafb] transition-colors"
          >
            Khách hàng
          </Link>
          <Link
            href="/admin/vouchers"
            className="px-4 py-[9px] bg-[#2563eb] text-white rounded-[10px] font-semibold text-[13px] shadow-[0_1px_2px_rgba(37,99,235,.3)] hover:bg-[#1d4ed8] transition-colors"
          >
            + Tạo Voucher
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        className="grid gap-[14px] mb-[22px]"
        style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}
      >
        <div className="bg-white border border-[#eceef2] rounded-[14px] pt-[18px] px-[18px] pb-4">
          <div className="text-[12.5px] text-[#6b7280] font-medium mb-2">Tổng khách hàng</div>
          <div className="text-[24px] font-extrabold tracking-[-0.5px] text-[#111827]">{formatNumber(stats.totalCustomers)}</div>
          <div className="text-[12px] font-semibold mt-1.5 text-[#059669]">
            +{stats.newCustomersThisMonth} tháng này
          </div>
        </div>

        <div className="bg-white border border-[#eceef2] rounded-[14px] pt-[18px] px-[18px] pb-4">
          <div className="text-[12.5px] text-[#6b7280] font-medium mb-2">Tổng doanh thu</div>
          <div className="text-[24px] font-extrabold tracking-[-0.5px] text-[#111827]">{formatCurrency(stats.totalRevenue)}</div>
          <div className="text-[12px] font-semibold mt-1.5 text-[#059669]">
            {stats.completedOrders} đơn hoàn thành
          </div>
        </div>

        <div className="bg-white border border-[#eceef2] rounded-[14px] pt-[18px] px-[18px] pb-4">
          <div className="text-[12.5px] text-[#6b7280] font-medium mb-2">Đơn hàng</div>
          <div className="text-[24px] font-extrabold tracking-[-0.5px] text-[#111827]">{formatNumber(stats.totalOrders)}</div>
          <div className="text-[12px] font-semibold mt-1.5 text-[#059669]">
            {stats.completedOrders} hoàn thành
          </div>
        </div>

        <div className="bg-white border border-[#eceef2] rounded-[14px] pt-[18px] px-[18px] pb-4">
          <div className="text-[12.5px] text-[#6b7280] font-medium mb-2">Voucher hoạt động</div>
          <div className="text-[24px] font-extrabold tracking-[-0.5px] text-[#111827]">{stats.activeVouchers}</div>
        </div>

        <div className="bg-white border border-[#eceef2] rounded-[14px] pt-[18px] px-[18px] pb-4">
          <div className="text-[12.5px] text-[#6b7280] font-medium mb-2">Hoa hồng chờ duyệt</div>
          <div className="text-[24px] font-extrabold tracking-[-0.5px] text-[#111827]">{formatCurrency(stats.pendingCommissions)}</div>
        </div>
      </div>

      <RevenueStats />

      {/* Content Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))' }}>
        {/* Recent Orders */}
        <div className="bg-white border border-[#eceef2] rounded-[14px] overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-[#f0f1f5]">
            <span className="text-[15px] font-bold text-[#111827]">Đơn hàng gần đây</span>
            <Link href="/admin/orders" className="text-[13px] text-[#2563eb] hover:text-[#1d4ed8] font-semibold">
              Xem tất cả →
            </Link>
          </div>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-gray-100">
            {!stats.recentOrders || stats.recentOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Chưa có đơn hàng nào</div>
            ) : (
              stats.recentOrders.map(order => {
                const statusInfo = getStatusBadge(order.status);
                const displayName = order.shippingName || order.user?.name || order.user?.phone || 'Khách lạ';
                return (
                  <Link key={`mob-order-${order.id}`} href={`/admin/orders/${order.id}`} className="flex flex-col gap-2 p-4 active:bg-[#eff6ff]">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-semibold text-[#2563eb]">{order.orderCode}</span>
                      <span className={`px-2.5 py-[3px] rounded-full text-[11.5px] font-semibold ${statusPillClass(statusInfo.class)}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-[#6b7280]">{displayName}</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f9fafb]">
                  <th className="px-5 py-[9px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Mã đơn</th>
                  <th className="px-3 py-[9px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Khách hàng</th>
                  <th className="px-3 py-[9px] text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Tổng tiền</th>
                  <th className="px-5 py-[9px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {!stats.recentOrders || stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <div className="text-[#6b7280]">Chưa có đơn hàng nào</div>
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders.map((order) => {
                    const statusInfo = getStatusBadge(order.status);
                    const displayName = order.shippingName || order.user?.name || order.user?.phone || 'Khách lạ';
                    const displayChar = displayName !== 'Khách lạ' ? displayName.charAt(0).toUpperCase() : '?';
                    return (
                      <tr key={order.id} className="relative cursor-pointer border-t border-[#f3f4f6] hover:bg-[#eff6ff]">
                        <td className="px-5 py-[11px]">
                          <Link href={`/admin/orders/${order.id}`} className="absolute inset-0" aria-label={`Xem chi tiết đơn ${order.orderCode}`} />
                          <span className="font-mono text-xs font-semibold text-[#2563eb]">
                            {order.orderCode}
                          </span>
                        </td>
                        <td className="px-3 py-[11px]">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                              style={{ background: avatarColor(displayName) }}
                            >
                              {displayChar}
                            </div>
                            <span className="text-[13px] text-[#111827]">{displayName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-[11px] text-right font-semibold text-[#111827]">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-5 py-[11px]">
                          <span className={`px-2.5 py-[3px] rounded-full text-[11.5px] font-semibold ${statusPillClass(statusInfo.class)}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white border border-[#eceef2] rounded-[14px] overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-[#f0f1f5]">
            <span className="text-[15px] font-bold text-[#111827]">Khách hàng VIP</span>
            <Link href="/admin/customers" className="text-[13px] text-[#2563eb] hover:text-[#1d4ed8] font-semibold">
              Xem tất cả →
            </Link>
          </div>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-gray-100">
            {!stats.topCustomers || stats.topCustomers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Chưa có khách hàng nào</div>
            ) : (
              stats.topCustomers.map(customer => {
                const displayName = customer.name || customer.phone || 'Khách lạ';
                const displayChar = displayName !== 'Khách lạ' ? displayName.charAt(0).toUpperCase() : '?';
                return (
                  <Link key={`mob-cust-${customer.id}`} href={`/admin/customers/${customer.id}`} className="flex flex-col gap-3 p-4 active:bg-[#eff6ff]">
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: avatarColor(displayName) }}
                      >
                        {displayChar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-[#111827] font-semibold truncate pr-2">{displayName}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${rankPillClass(customer.rank)}`}>
                            {customer.rank}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[#9ca3af] mt-0.5">{customer.email || customer.phone}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs bg-[#f7f9fc] p-2 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-[#9ca3af] mb-0.5">Đã chi</span>
                        <span className="font-semibold text-[#111827]">{formatCurrency(customer.totalSpent)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[#9ca3af] mb-0.5">Số đơn</span>
                        <span className="font-semibold text-[#4f46e5]">{customer._count?.orders || 0} đơn</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f9fafb]">
                  <th className="px-5 py-[9px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Khách hàng</th>
                  <th className="px-3 py-[9px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Hạng</th>
                  <th className="px-3 py-[9px] text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Đã chi</th>
                  <th className="px-5 py-[9px] text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Đơn</th>
                </tr>
              </thead>
              <tbody>
                {!stats.topCustomers || stats.topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <div className="text-[#6b7280]">Chưa có khách hàng nào</div>
                    </td>
                  </tr>
                ) : (
                  stats.topCustomers.map((customer) => {
                    const displayName = customer.name || customer.phone || 'Khách lạ';
                    const displayChar = displayName !== 'Khách lạ' ? displayName.charAt(0).toUpperCase() : '?';
                    return (
                      <tr key={customer.id} className="relative cursor-pointer border-t border-[#f3f4f6] hover:bg-[#eff6ff]">
                        <td className="px-5 py-[11px]">
                          <Link href={`/admin/customers/${customer.id}`} className="absolute inset-0" aria-label={`Xem chi tiết khách hàng ${displayName}`} />
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: avatarColor(displayName) }}
                            >
                              {displayChar}
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold text-[#111827]">{displayName}</div>
                              <div className="text-[11.5px] text-[#9ca3af]">{customer.email || customer.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-[11px]">
                          <span className={`px-2.5 py-[3px] rounded-full text-[11px] font-bold ${rankPillClass(customer.rank)}`}>
                            {customer.rank}
                          </span>
                        </td>
                        <td className="px-3 py-[11px] text-right font-semibold text-[#111827]">{formatCurrency(customer.totalSpent)}</td>
                        <td className="px-5 py-[11px] text-right font-semibold text-[#4f46e5]">{customer._count?.orders || 0}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

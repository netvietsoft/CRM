import Link from 'next/link';
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getRankBadgeClass(rank: string) {
  const map: Record<string, string> = {
    MEMBER: 'badge-member',
    SILVER: 'badge-silver',
    GOLD: 'badge-gold',
    DIAMOND: 'badge-diamond',
    PLATINUM: 'badge-platinum',
  };
  return map[rank] || 'badge-member';
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

export default async function AdminDashboard() {
  let stats: any = {
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
    stats = await apiClient.get<any>('/admin/dashboard');
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Dashboard</h1>
          <p className="text-gray-600 text-sm">Tổng quan hệ thống chăm sóc khách hàng</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/customers" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            👥 Khách hàng
          </Link>
          <Link href="/admin/vouchers" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            🎫 Tạo Voucher
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng khách hàng</div>
          <div className="text-3xl text-gray-800 mb-2">{stats.totalCustomers?.toLocaleString()}</div>
          <div className="text-xs text-green-600">
            +{stats.newCustomersThisMonth} tháng này
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng doanh thu</div>
          <div className="text-2xl text-gray-800 mb-2">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="text-xs text-green-600 ">
            {stats.completedOrders} đơn hoàn thành
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Đơn hàng</div>
          <div className="text-3xl text-gray-800 mb-2">{stats.totalOrders?.toLocaleString()}</div>
          <div className="text-xs text-green-600 ">
            {stats.completedOrders} hoàn thành
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Voucher hoạt động</div>
          <div className="text-3xl text-gray-800">{stats.activeVouchers}</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Hoa hồng chờ duyệt</div>
          <div className="text-2xl text-gray-800">
            {formatCurrency(stats.pendingCommissions)}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-800">Đơn hàng gần đây</span>
            <Link href="/admin/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Xem tất cả →
            </Link>
          </div>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-gray-100">
            {!stats.recentOrders || stats.recentOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Chưa có đơn hàng nào</div>
            ) : (
              stats.recentOrders.map((order: any) => {
                const statusInfo = getStatusBadge(order.status);
                const displayName = order.shippingName || order.user?.name || order.user?.phone || 'Khách lạ';
                return (
                  <div key={`mob-order-${order.id}`} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm font-bold text-gray-800">{order.orderCode}</span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusInfo.class === 'badge-success' ? 'bg-green-100 text-green-700' :
                        statusInfo.class === 'badge-warning' ? 'bg-yellow-100 text-yellow-700' :
                          statusInfo.class === 'badge-info' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-gray-600">{displayName}</span>
                      <span className="font-bold text-rose-600">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã đơn</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!stats.recentOrders || stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <div className="text-gray-500">Chưa có đơn hàng nào</div>
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders.map((order: any) => {
                    const statusInfo = getStatusBadge(order.status);
                    const displayName = order.shippingName || order.user?.name || order.user?.phone || 'Khách lạ';
                    const displayChar = displayName !== 'Khách lạ' ? displayName.charAt(0).toUpperCase() : '?';
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-gray-800">
                            {order.orderCode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                              {displayChar}
                            </div>
                            <span className="text-sm">{displayName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 ">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs  ${statusInfo.class === 'badge-success' ? 'bg-green-100 text-green-700' :
                            statusInfo.class === 'badge-warning' ? 'bg-yellow-100 text-yellow-700' :
                              statusInfo.class === 'badge-info' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                            }`}>
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-800">Khách hàng VIP</span>
            <Link href="/admin/customers" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Xem tất cả →
            </Link>
          </div>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-gray-100">
            {!stats.topCustomers || stats.topCustomers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Chưa có khách hàng nào</div>
            ) : (
              stats.topCustomers.map((customer: any) => {
                const displayName = customer.name || customer.phone || 'Khách lạ';
                const displayChar = displayName !== 'Khách lạ' ? displayName.charAt(0).toUpperCase() : '?';
                return (
                  <div key={`mob-cust-${customer.id}`} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {displayChar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-gray-900 truncate pr-2">{displayName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${customer.rank === 'PLATINUM' ? 'bg-purple-100 text-purple-700' :
                            customer.rank === 'DIAMOND' ? 'bg-blue-100 text-blue-700' :
                              customer.rank === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
                                customer.rank === 'SILVER' ? 'bg-gray-200 text-gray-700' :
                                  'bg-gray-100 text-gray-600'
                            }`}>
                            {customer.rank}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{customer.email || customer.phone}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-gray-500 mb-0.5">Đã chi</span>
                        <span className="font-bold text-gray-900">{formatCurrency(customer.totalSpent)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-gray-500 mb-0.5">Số đơn</span>
                        <span className="font-bold text-indigo-600">{customer._count?.orders || 0} đơn</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hạng</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đã chi</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!stats.topCustomers || stats.topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <div className="text-gray-500">Chưa có khách hàng nào</div>
                    </td>
                  </tr>
                ) : (
                  stats.topCustomers.map((customer: any) => {
                    const displayName = customer.name || customer.phone || 'Khách lạ';
                    const displayChar = displayName !== 'Khách lạ' ? displayName.charAt(0).toUpperCase() : '?';
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="text-sm">{displayName}</div>
                              <div className="text-xs text-gray-600">{customer.email || customer.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${customer.rank === 'PLATINUM' ? 'bg-purple-100 text-purple-700' :
                            customer.rank === 'DIAMOND' ? 'bg-blue-100 text-blue-700' :
                              customer.rank === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
                                customer.rank === 'SILVER' ? 'bg-gray-200 text-gray-700' :
                                  'bg-gray-100 text-gray-600'
                            }`}>
                            {customer.rank}
                          </span>
                        </td>
                        <td className="px-6 py-4">{formatCurrency(customer.totalSpent)}</td>
                        <td className="px-6 py-4">{customer._count?.orders || 0}</td>
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

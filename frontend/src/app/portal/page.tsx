export const dynamic = 'force-dynamic';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import TrackingButton from '@/components/customer/TrackingButton';
import { apiClient } from '@/lib/apiClient';
import { membershipBadgeClassMap, MembershipConfig, MembershipProgress, MembershipRank } from '@/lib/membership';
import { formatVndSymbol } from '@/lib/format';

function fmt(n: number) {
  return formatVndSymbol(n);
}

interface RecentOrder {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  createdAt: string | Date;
}

interface DashboardUser {
  totalSpent: number;
  rank: MembershipRank;
  commissionBalance: number;
  points: number;
  referralCode: string;
  dob: string | Date | null;
}

interface PortalDashboardData {
  user: DashboardUser;
  voucherCount: number;
  orderCount: number;
  refereeCount: number;
  recentOrders: RecentOrder[];
  rankConfigs: MembershipConfig[];
  rankProgress: MembershipProgress;
}

export default async function PortalDashboard() {
  const session = await getSession();
  if (!session) return null;

  let dashboardData: PortalDashboardData;
  try {
    dashboardData = await apiClient.get<PortalDashboardData>('/users/dashboard');
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-red-600">Đã xảy ra lỗi</h2>
        <p className="text-gray-600 mt-2">Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  const { user, voucherCount, orderCount, refereeCount, recentOrders, rankProgress } = dashboardData;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">
          Xin chào, {session.name}!
        </h1>
        <p className="text-gray-600 text-sm">
          Chào mừng bạn quay lại
        </p>
      </div>

      <div className="mb-6">
        <TrackingButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Voucher của bạn</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">{voucherCount}</div>
          <Link href="/portal/vouchers" className="text-xs text-blue-500 hover:text-blue-600">Xem voucher →</Link>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Đơn hàng của bạn</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">{orderCount}</div>
          <Link href="/portal/orders" className="text-xs text-blue-500 hover:text-blue-600">Xem đơn →</Link>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Bạn bè đã mời</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">{refereeCount}</div>
          <Link href="/portal/referral" className="text-xs text-blue-500 hover:text-blue-600">Xem ngay →</Link>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Số dư hoa hồng</div>
          <div className="text-2xl font-bold text-gray-800 mb-2">{fmt(user.commissionBalance)}</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Tiến trình hạng thành viên</h3>
          <span className={`px-3.5 py-1 rounded-full text-sm font-semibold shadow-sm border ${membershipBadgeClassMap[user.rank]}`}>
            {user.rank}
          </span>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs font-medium text-gray-700 mb-2">
            <span>{fmt(user.totalSpent)}</span>
            {rankProgress.nextRank !== 'MAX' && <span>{fmt(rankProgress.nextThreshold)} → {rankProgress.nextRank}</span>}
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
              style={{ width: `${rankProgress.progressPercent}%` }}
            />
          </div>
        </div>
        {rankProgress.nextRank !== 'MAX' ? (
          <p className="text-xs text-gray-600 font-medium">
            🔥 Còn <span className="text-indigo-600 font-bold">{fmt(rankProgress.remainingToNext)}</span> nữa để lên hạng <span className="font-bold">{rankProgress.nextRank}</span>
          </p>
        ) : (
          <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
            🎉 Chúc mừng bạn đã đạt cấp bậc cao nhất!
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Link href="/portal/spin" className="bg-white p-6 rounded-xl shadow-sm text-center hover:shadow-md transition-shadow border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
          <div className="font-bold text-gray-800">Vòng quay may mắn</div>
          <div className="text-xs text-gray-600 mt-2">Quay ngay để nhận quà</div>
        </Link>
        <Link href="/portal/referral" className="bg-white p-6 rounded-xl shadow-sm text-center hover:shadow-md transition-shadow border border-green-100 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
          <div className="font-bold text-gray-800">Giới thiệu bạn bè</div>
          <div className="text-xs text-gray-600 mt-2">Nhận hoa hồng {user.referralCode}</div>
        </Link>
        <Link href="/portal/vouchers" className="bg-white p-6 rounded-xl shadow-sm text-center hover:shadow-md transition-shadow border border-orange-100 bg-gradient-to-br from-orange-50/50 to-red-50/50">
          <div className="font-bold text-gray-800">Voucher của tôi</div>
          <div className="text-xs text-gray-600 mt-2">{voucherCount} voucher khả dụng</div>
        </Link>
      </div>

      {recentOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-800">Đơn hàng gần đây</span>
            <Link href="/portal/orders" className="text-sm text-blue-500 hover:text-blue-600 font-medium">Xem tất cả →</Link>
          </div>
          <div className="md:hidden flex flex-col divide-y divide-gray-100">
            {recentOrders.map((o) => (
              <div key={o.id} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-800">{o.orderCode}</span>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    o.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{new Intl.DateTimeFormat('vi-VN').format(new Date(o.createdAt))}</span>
                  <span className="font-semibold text-rose-600">{fmt(o.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto mb-6">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã đơn</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs font-mono text-gray-800">{o.orderCode}</td>
                    <td className="px-6 py-4 font-semibold text-rose-600">{fmt(o.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        o.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{new Intl.DateTimeFormat('vi-VN').format(new Date(o.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

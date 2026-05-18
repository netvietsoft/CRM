export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

const levelLabels: Record<number, string> = { 1: 'F1 → F0', 2: 'F2 → F0', 3: 'F3 → F0', 4: 'F4 → F0' };
const statusMap: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-yellow-100 text-yellow-700', label: 'Chờ duyệt' },
  APPROVED: { cls: 'bg-blue-100 text-blue-700', label: 'Đã duyệt' },
  PAID: { cls: 'bg-green-100 text-green-700', label: 'Đã trả' },
  CANCELLED: { cls: 'bg-red-100 text-red-700', label: 'Hủy' },
};

export default async function CommissionsPage() {
  let commissions: any[] = [];
  let configs: any[] = [];
  let stats: any = { total: { amount: 0, count: 0 }, pending: { amount: 0, count: 0 } };

  try {
    const [ledgerRes, configsRes, statsRes] = await Promise.all([
      apiClient.get<any[]>('/commissions/admin/ledger'),
      apiClient.get<any[]>('/commissions/admin/configs'),
      apiClient.get<any>('/commissions/admin/stats'),
    ]);
    commissions = ledgerRes;
    configs = configsRes;
    stats = statsRes;
  } catch (error) {
    console.error('Error fetching admin commissions:', error);
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Hoa hồng Referral</h1>
        <p className="text-gray-600 text-sm">Quản lý tỷ lệ hoa hồng và lịch sử chi trả</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng hoa hồng đã sinh</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">{fmt(stats.total.amount)}</div>
          <div className="text-xs text-gray-600">{stats.total.count} giao dịch</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Hoa hồng chờ duyệt</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">{fmt(stats.pending.amount)}</div>
          <div className="text-xs text-gray-600">{stats.pending.count} giao dịch</div>
        </div>
        {configs.map((c: any) => (
          <div key={c.id} className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-sm text-gray-600 mb-2">Tầng F{c.level}</div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{c.percentage}%</div>
            <div className="text-xs text-gray-600">{c.isActive ? 'Đang hoạt động' : 'Tắt'}</div>
          </div>
        ))}
      </div>

      {/* Commission Config */}
      <div className="bg-white mb-6 p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold mb-4">
          📊 Cấu hình tỷ lệ hoa hồng
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {configs.map((c: any) => (
            <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-2">
                Khi F{c.level} mua hàng
              </div>
              <div className="text-2xl font-extrabold text-blue-600">
                {c.percentage}%
              </div>
              <div className="text-xs text-gray-600 mt-1">
                F0 nhận hoa hồng
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Ví dụ: F0 giới thiệu F1, F1 giới thiệu F2. Khi F2 mua hàng 1,000,000đ → F0 nhận 3% = 30,000đ, F1 nhận 5% = 50,000đ
        </p>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-800">Lịch sử hoa hồng</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người nhận</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tầng</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đơn hàng</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Giá trị đơn</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tỷ lệ</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hoa hồng</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center py-12">
                      <div className="text-6xl mb-3">💰</div>
                      <div className="text-xl font-semibold text-gray-800">Chưa có hoa hồng</div>
                    </div>
                  </td>
                </tr>
              ) : commissions.map((c: any) => {
                const st = statusMap[c.status] || { cls: 'bg-gray-100 text-gray-600', label: c.status };
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{c.user.name}</div>
                      <div className="text-xs text-gray-600 font-mono">{c.user.referralCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {levelLabels[c.level] || `F${c.level}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700">{c.order.orderCode}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{fmt(c.order.totalAmount)}</td>
                    <td className="px-6 py-4 font-semibold text-blue-600">{c.percentage}%</td>
                    <td className="px-6 py-4 font-bold text-green-600">{fmt(c.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
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

export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import CommissionRateEdit from '@/components/admin/CommissionRateEdit';
export default async function ReferralsPage() {
  let topReferrers: any[] = [];
  let referralStats: any = { totalReferrals: 0, totalCommPaid: 0, topReferrersCount: 0 };
  let commissionConfigs: any[] = [];

  try {
    const [statsRes, referrersRes, configsRes] = await Promise.all([
      apiClient.get<any>('/commissions/admin/referral-stats'),
      apiClient.get<any[]>('/commissions/admin/top-referrers'),
      apiClient.get<any[]>('/commissions/admin/configs'),
    ]);
    referralStats = statsRes || referralStats;
    topReferrers = referrersRes || [];
    commissionConfigs = configsRes || [];
  } catch (error) {
    console.error('Error fetching admin referral data:', error);
  }

  const { totalReferrals, totalCommPaid, topReferrersCount } = referralStats;

  // Create a map for easy lookup, with defaults
  const configMap = new Map(commissionConfigs.map((c: any) => [c.level, c.percentage]));
  const getRate = (level: number) => configMap.get(level) || 0;

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Chương trình Referral</h1>
        <p className="text-gray-600 text-sm">Giới thiệu khách hàng — mua sắm miễn phí</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng KH được giới thiệu</div>
          <div className="text-3xl font-bold text-gray-800">{totalReferrals}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Người giới thiệu</div>
          <div className="text-3xl font-bold text-gray-800">{topReferrers.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng hoa hồng đã trả</div>
          <div className="text-2xl font-bold text-gray-800">{fmt(totalCommPaid || 0)}</div>
        </div>
      </div>

      {/* Referral Schema Diagram */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h3 className="text-lg font-bold mb-4">
          🔗 Cách hoạt động
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <CommissionRateEdit
            level={1}
            initialPercentage={getRate(1)}
            label="F1 mua"
            description={`F0 nhận ${getRate(1)}% giá trị đơn`}
          />
          <CommissionRateEdit
            level={2}
            initialPercentage={getRate(2)}
            label="F2 mua"
            description={`F0 nhận ${getRate(2)}%, F1 nhận ${getRate(1)}%`}
          />
          <CommissionRateEdit
            level={3}
            initialPercentage={getRate(3)}
            label="F3 mua"
            description={`F0 nhận ${getRate(3)}%, F1 nhận ${getRate(2)}%`}
          />
          <CommissionRateEdit
            level={4}
            initialPercentage={getRate(4)}
            label="F4 mua"
            description={`F0 nhận ${getRate(4)}%, F1 nhận ${getRate(3)}%`}
          />
        </div>
      </div>

      {/* Top Referrers */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-800">Top Referrers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người giới thiệu</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã giới thiệu</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Số KH đã mời</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Số dư hoa hồng</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topReferrers.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="text-center py-12">
                      <div className="text-6xl mb-3">🔗</div>
                      <div className="text-xl font-semibold text-gray-800">Chưa có referrals</div>
                    </div>
                  </td>
                </tr>
              ) : topReferrers.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {r.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{r.name}</div>
                        <div className="text-xs text-gray-600">{r.email || r.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-bold bg-gray-100 px-2.5 py-1 rounded tracking-wide">
                      {r.referralCode}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                      {r._count.referees} người
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">{fmt(r.commissionBalance)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      r.rank === 'PLATINUM' ? 'bg-purple-100 text-purple-700' :
                      r.rank === 'DIAMOND' ? 'bg-blue-100 text-blue-700' :
                      r.rank === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
                      r.rank === 'SILVER' ? 'bg-gray-200 text-gray-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {r.rank}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

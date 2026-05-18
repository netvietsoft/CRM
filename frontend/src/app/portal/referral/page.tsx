import { getSession } from '@/lib/auth';
import ReferralCard from './ReferralCard';
import { apiClient } from '@/lib/apiClient';
import { headers } from 'next/headers';

export default async function PortalReferralPage() {
  const session = await getSession();
  if (!session) return null;

  let user: any = null;
  let referees: any[] = [];
  let commissions: any[] = [];
  let commissionConfigs: any[] = [];
  let rewardConfig: any = { tiers: [] };

  try {
    const [userData, networkData, ledgerData, configsData, rewardConfigData] = await Promise.all([
      apiClient.get<any>('/users/profile'),
      apiClient.get<any[]>('/commissions/network'),
      apiClient.get<any[]>('/commissions/ledger'),
      apiClient.get<any[]>('/commissions/configs'),
      apiClient.get<any>('/vouchers/referral-rewards-config/public').catch(() => ({ tiers: [] })),
    ]);
    user = userData;
    referees = networkData;
    commissions = ledgerData;
    commissionConfigs = configsData;
    rewardConfig = rewardConfigData || { tiers: [] };
  } catch (error) {
    console.error('Error fetching referral data:', error);
  }

  // Create a map for easy lookup, with defaults
  const configMap = new Map(commissionConfigs.map(c => [c.level, c.percentage]));
  const getRate = (level: number) => configMap.get(level) || 0;

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
  
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const referralLink = `${protocol}://${host}/login?ref=${user?.referralCode}`;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Giới thiệu bạn bè</h1>
        <p className="text-gray-600 text-sm">Giới thiệu càng nhiều, mua sắm càng miễn phí!</p>
      </div>

      {/* Referral Link Card */}
      <ReferralCard
        referralCode={user?.referralCode || ''}
        referralLink={referralLink}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* How it works */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">
            💡 Cách hoạt động
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { step: '1', title: 'Chia sẻ link', desc: 'Gửi mã giới thiệu', icon: '📤' },
              { step: '2', title: 'Bạn bè đăng ký', desc: 'Tạo TK qua link', icon: '👤' },
              { step: '3', title: 'Bạn bè mua hàng', desc: 'Thanh toán thành công', icon: '🛒' },
              { step: '4', title: 'Nhận hoa hồng', desc: 'Nhận % giá trị', icon: '💰' },
            ].map(s => (
              <div key={s.step} className="text-center p-2">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="font-bold text-sm mb-1">{s.title}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-gray-700 text-center">
            <strong>Tỷ lệ HOA HỒNG:</strong> F1 ({getRate(1)}%) | F2 ({getRate(2)}%) | F3 ({getRate(3)}%) | F4 ({getRate(4)}%)
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold mb-4">
            Phần thưởng mời bạn mới
          </h3>
          <div className="space-y-6">
            {(rewardConfig.tiers && rewardConfig.tiers.length > 0) ? (
              rewardConfig.tiers.map((tier: any, idx: number) => {
                const colors = [
                  'bg-rose-100 text-rose-600',
                  'bg-purple-100 text-purple-600',
                  'bg-blue-100 text-blue-600',
                  'bg-amber-100 text-amber-600',
                  'bg-emerald-100 text-emerald-600',
                  'bg-pink-100 text-pink-600',
                ];
                const colorClass = colors[idx % colors.length];
                const label = tier.milestone === 1 ? 'Người đầu tiên' : `Người thứ ${tier.milestone}`;
                let desc = '';
                if (tier.rewardType === 'SPIN') {
                  desc = `Bạn nhận được ${tier.spinTurns || 1} lượt quay may mắn.`;
                } else if (tier.rewardType === 'VOUCHER') {
                  desc = tier.voucherName || 'Bạn nhận được voucher đặc biệt.';
                }
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 ${colorClass} rounded-full flex items-center justify-center font-bold text-sm mt-0.5`}>{tier.milestone}</div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">Chương trình thưởng đang được cập nhật.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referees */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-800">Người đã mời ({referees.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tên</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tầng</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đơn hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày gia nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <div className="text-gray-500">Chưa mời ai. Hãy chia sẻ link ngay!</div>
                    </td>
                  </tr>
                ) : referees.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-800">{r.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        F{r.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {r._count.orders} đơn
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {new Intl.DateTimeFormat('vi-VN').format(new Date(r.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commission history */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <span className="text-lg font-bold text-gray-800">Lịch sử hoa hồng</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đơn</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tầng</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hoa hồng</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <div className="text-gray-500">Chưa có hoa hồng</div>
                    </td>
                  </tr>
                ) : commissions.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-800">{c.order?.orderCode || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        F{c.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-green-600">{fmt(c.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${c.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        c.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

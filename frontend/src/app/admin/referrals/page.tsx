export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import CommissionRateEdit from '@/components/admin/CommissionRateEdit';

interface TopReferrer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  referralCode: string;
  commissionBalance: number;
  rank: string;
  _count: {
    referees: number;
  };
}

interface ReferralStats {
  totalReferrals: number;
  totalCommPaid: number;
  topReferrersCount: number;
}

interface CommissionConfig {
  level: number;
  percentage: number;
}

const rankBadge: Record<string, { bg: string; fg: string }> = {
  PLATINUM: { bg: '#ede9fe', fg: '#6d28d9' },
  DIAMOND: { bg: '#dbeafe', fg: '#1d4ed8' },
  GOLD: { bg: '#fef3c7', fg: '#92400e' },
  SILVER: { bg: '#e5e7eb', fg: '#374151' },
};

export default async function ReferralsPage() {
  let topReferrers: TopReferrer[] = [];
  let referralStats: ReferralStats = { totalReferrals: 0, totalCommPaid: 0, topReferrersCount: 0 };
  let commissionConfigs: CommissionConfig[] = [];

  try {
    const [statsRes, referrersRes, configsRes] = await Promise.all([
      apiClient.get<ReferralStats>('/commissions/admin/referral-stats'),
      apiClient.get<TopReferrer[]>('/commissions/admin/top-referrers'),
      apiClient.get<CommissionConfig[]>('/commissions/admin/configs'),
    ]);
    referralStats = statsRes || referralStats;
    topReferrers = referrersRes || [];
    commissionConfigs = configsRes || [];
  } catch (error) {
    console.error('Error fetching admin referral data:', error);
  }

  const { totalReferrals, totalCommPaid } = referralStats;

  // Create a map for easy lookup, with defaults
  const configMap = new Map(commissionConfigs.map((config) => [config.level, config.percentage]));
  const getRate = (level: number) => configMap.get(level) || 0;

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <div className="mb-[18px]">
        <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-slate-900">Referral</h1>
        <p className="mt-1 mb-0 text-[13px] text-[#6b7280]">Chương trình giới thiệu khách hàng và bảng xếp hạng</p>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-[14px] md:grid-cols-3">
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Tổng KH được giới thiệu</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-slate-900">{totalReferrals}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Người giới thiệu</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-slate-900">{topReferrers.length}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Tổng hoa hồng đã trả</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-slate-900">{fmt(totalCommPaid || 0)}</div>
        </div>
      </div>

      {/* Referral Schema / tier-rate config */}
      <div className="mb-4 rounded-[14px] border border-[#eceef2] bg-white p-5">
        <div className="mb-[14px] text-[15px] font-bold text-slate-900">Cách hoạt động</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="border-b border-[#f0f1f5] px-5 py-[15px] text-[15px] font-bold text-slate-900">Top người giới thiệu</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Hạng</th>
                <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Khách hàng</th>
                <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Mã giới thiệu</th>
                <th className="px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Đã giới thiệu</th>
                <th className="px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Số dư hoa hồng</th>
                <th className="px-4 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Xếp hạng</th>
              </tr>
            </thead>
            <tbody>
              {topReferrers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="py-12 text-center">
                      <div className="mb-3 text-6xl">🔗</div>
                      <div className="text-xl font-semibold text-slate-900">Chưa có referrals</div>
                    </div>
                  </td>
                </tr>
              ) : topReferrers.map((r, idx) => {
                const badge = rankBadge[r.rank] || { bg: '#f3f4f6', fg: '#4b5563' };
                return (
                  <tr
                    key={r.id}
                    className="border-t border-[#f3f4f6] hover:bg-[#eff6ff]"
                    style={{ background: idx % 2 === 1 ? '#f7f9fc' : '#fff' }}
                  >
                    <td className="px-4 py-3 text-[14px] font-extrabold text-[#2563eb]">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="whitespace-nowrap font-semibold text-slate-900">{r.name}</div>
                      <div className="text-[11.5px] text-[#9ca3af]">{r.email || r.phone}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] font-bold text-[#2140da]">{r.referralCode}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">{r._count.referees}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-[#059669]">{fmt(r.commissionBalance)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="rounded-full px-[10px] py-[3px] text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.fg }}
                      >
                        {r.rank}
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

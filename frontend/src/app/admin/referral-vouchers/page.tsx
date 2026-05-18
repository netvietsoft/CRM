export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import ReferralVoucherActions from '@/components/admin/ReferralVoucherActions';
import ReferralRewardConfig from '@/components/admin/ReferralRewardConfig';
import ReferralVoucherTable from '@/components/admin/ReferralVoucherTable';

export default async function ReferralVouchersPage() {
  let vouchers: any[] = [];
  let rewardConfig: any = { tiers: [] };

  try {
    const [vouchersRes, configRes] = await Promise.all([
      apiClient.get<any[]>('/vouchers/referral-vouchers'),
      apiClient.get<any>('/vouchers/referral-rewards-config'),
    ]);
    vouchers = vouchersRes || [];
    rewardConfig = configRes || { tiers: [] };
  } catch (error) {
    console.error('Error fetching referral vouchers data:', error);
  }

  const activeCount = vouchers.filter(v => v.isActive).length;
  const usedCount = vouchers.reduce((sum, v) => sum + (v._count?.userVouchers || 0), 0);

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Voucher Mã Mời</h1>
          <p className="text-gray-600 text-sm">Quản lý voucher phần thưởng cho chương trình giới thiệu bạn bè</p>
        </div>
        <div className="flex items-center gap-3">
          <ReferralRewardConfig
            initialTiers={rewardConfig.tiers || []}
            vouchers={vouchers}
          />
          <ReferralVoucherActions />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng voucher</div>
          <div className="text-3xl font-bold text-gray-800">{vouchers.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Đang hoạt động</div>
          <div className="text-3xl font-bold text-green-600">{activeCount}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Lượt đã cấp</div>
          <div className="text-3xl font-bold text-blue-600">{usedCount}</div>
        </div>
      </div>

      {/* Voucher Table */}
      <ReferralVoucherTable vouchers={vouchers} />
    </>
  );
}

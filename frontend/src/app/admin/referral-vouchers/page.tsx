export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import ReferralVoucherActions from '@/components/admin/ReferralVoucherActions';
import ReferralRewardConfig from '@/components/admin/ReferralRewardConfig';
import ReferralVoucherTable from '@/components/admin/ReferralVoucherTable';

interface ReferralRewardTier {
  milestone: number;
  rewardType: 'SPIN' | 'VOUCHER';
  spinTurns: number;
  voucherId: string | null;
  voucherName?: string;
}

interface ReferralRewardConfigData {
  tiers: ReferralRewardTier[];
}

interface ReferralVoucher {
  id: string;
  code: string;
  name: string;
  description: string;
  campaignCategory: string;
  type: string;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  totalUsageLimit: number | null;
  perCustomerLimit: number;
  validFrom: string | null;
  validTo: string | null;
  durationDays: number | null;
  isStackable: boolean;
  isActive: boolean;
  usedCount: number;
  stackTiers: Array<{
    conditionType?: string | null;
    minProducts?: number | null;
    minAmount?: number | null;
    discount?: number | null;
    type?: string | null;
    maxDiscount?: number | null;
  }> | null;
  _count?: {
    userVouchers?: number;
  } | null;
}

export default async function ReferralVouchersPage() {
  let vouchers: ReferralVoucher[] = [];
  let rewardConfig: ReferralRewardConfigData = { tiers: [] };

  try {
    const [vouchersRes, configRes] = await Promise.all([
      apiClient.get<ReferralVoucher[]>('/vouchers/referral-vouchers'),
      apiClient.get<ReferralRewardConfigData>('/vouchers/referral-rewards-config'),
    ]);
    vouchers = vouchersRes || [];
    rewardConfig = configRes || { tiers: [] };
  } catch (error) {
    console.error('Error fetching referral vouchers data:', error);
  }

  const activeCount = vouchers.filter(voucher => voucher.isActive).length;
  const usedCount = vouchers.reduce((sum, voucher) => sum + (voucher._count?.userVouchers || 0), 0);

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

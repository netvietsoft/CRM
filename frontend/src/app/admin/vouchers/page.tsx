export const dynamic = 'force-dynamic';
import VoucherActions from '@/components/admin/VoucherActions';
import VoucherTableClient from '@/components/admin/VoucherTableClient';
import { apiClient } from '@/lib/apiClient';

function getCampaignBadge(cat: string) {
  const map: Record<string, { class: string; label: string }> = {
    WELCOME: { class: 'badge-success', label: '🎉 Welcome' },
    VIP: { class: 'badge-gold', label: '👑 VIP' },
    BUNDLE: { class: 'badge-primary', label: '📦 Bundle' },
    FREESHIP: { class: 'badge-info', label: '🚚 Freeship' },
    GAMIFICATION: { class: 'badge-warning', label: '🎰 Vòng quay' },
    REFERRAL: { class: 'badge-diamond', label: '🔗 Referral' },
    BIRTHDAY: { class: 'badge-danger', label: '🎂 Sinh nhật' },
  };
  return map[cat] || { class: 'badge-member', label: cat };
}

export default async function VouchersPage() {
  let vouchers: any[] = [];
  try {
    vouchers = await apiClient.get<any[]>('/vouchers/admin', {
      params: { excludeGamification: 'true' }
    });
  } catch (error) {
    console.error('Error fetching admin vouchers:', error);
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Voucher</h1>
          <p className="text-gray-600 text-sm">Quản lý mã giảm giá và chiến dịch khuyến mãi</p>
        </div>
        <VoucherActions />
      </div>

      {/* Campaign Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {['WELCOME', 'VIP', 'BUNDLE', 'FREESHIP'].map((cat) => {
          const count = vouchers.filter(v => v.campaignCategory === cat && v.isActive).length;
          const info = getCampaignBadge(cat);
          return (
            <div key={cat} className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-sm text-gray-600 mb-2">{info.label}</div>
              <div className="text-3xl font-bold text-gray-800 mb-2">{count}</div>
              <div className="text-xs text-gray-600">voucher hoạt động</div>
            </div>
          );
        })}
      </div>

      {/* Voucher Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-800">Tất cả Voucher</span>
          <span className="text-sm text-gray-500">{vouchers.length} voucher</span>
        </div>
        <VoucherTableClient vouchers={vouchers} />
      </div>
    </>
  );
}

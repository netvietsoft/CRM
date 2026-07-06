export const dynamic = 'force-dynamic';
import VoucherActions from '@/components/admin/VoucherActions';
import VoucherTableClient, { type VoucherTableRow } from '@/components/admin/VoucherTableClient';
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
  let vouchers: VoucherTableRow[] = [];
  try {
    vouchers = await apiClient.get<VoucherTableRow[]>('/vouchers/admin', {
      params: { excludeGamification: 'true' },
    });
  } catch (error) {
    console.error('Error fetching admin vouchers:', error);
  }

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-slate-900">Voucher</h1>
          <p className="mt-1 mb-0 text-[13px] text-[#6b7280]">Quản lý mã giảm giá và chiến dịch khuyến mãi</p>
        </div>
        <VoucherActions />
      </div>

      {/* Campaign Overview */}
      <div className="mb-4 grid grid-cols-1 gap-[14px] md:grid-cols-4">
        {['WELCOME', 'VIP', 'BUNDLE', 'FREESHIP'].map((cat) => {
          const count = vouchers.filter(v => v.campaignCategory === cat && v.isActive).length;
          const info = getCampaignBadge(cat);
          return (
            <div key={cat} className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
              <div className="mb-[5px] text-[12px] text-[#6b7280]">{info.label}</div>
              <div className="text-[22px] font-extrabold tracking-[-0.3px] text-slate-900">{count}</div>
              <div className="mt-[3px] text-[11.5px] font-semibold text-[#6b7280]">voucher hoạt động</div>
            </div>
          );
        })}
      </div>

      {/* Voucher Table */}
      <VoucherTableClient vouchers={vouchers} />
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import EditVoucherModal from './EditVoucherModal';
import { formatVndSymbol } from '@/lib/format';

interface VoucherStackTier {
  conditionType?: string | null;
  minProducts?: number | null;
  minAmount?: number | null;
  discount: number;
  type: string;
  maxDiscount?: number | null;
}

export interface VoucherTableRow {
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
  requiredCategoryId?: string | null;
  minProductCount?: number | null;
  orderSources?: string[] | null;
  salesChannels?: string[] | null;
  customerSegments?: string[] | null;
  customerRanks?: string[] | null;
  customerOccasions?: string[] | null;
  shippingProvinces?: string[] | null;
  paymentMethods?: string[] | null;
  isStackable: boolean;
  isActive: boolean;
  usedCount: number;
  stackTiers: VoucherStackTier[] | null;
}

function formatCurrency(amount: number) {
  return formatVndSymbol(amount);
}

function formatDate(date: string | Date | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date));
}

function formatDateRange(validFrom: string | Date | null, validTo: string | Date | null) {
  if (!validFrom && !validTo) return 'Không giới hạn';
  if (!validFrom) return `Đến ${formatDate(validTo)}`;
  if (!validTo) return `Từ ${formatDate(validFrom)}`;
  return `${formatDate(validFrom)} - ${formatDate(validTo)}`;
}

function getTypeBadge(type: string) {
  const map: Record<string, { class: string; label: string }> = {
    PERCENT: { class: 'badge-primary', label: 'Giảm %' },
    FIXED_AMOUNT: { class: 'badge-success', label: 'Giảm tiền' },
    FREESHIP: { class: 'badge-info', label: 'Free ship' },
    STACK: { class: 'badge-warning', label: '📊 Stack' },
  };
  return map[type] || { class: 'badge-member', label: type };
}

function getCampaignBadge(cat: string) {
  const map: Record<string, { class: string; label: string; bg: string; fg: string }> = {
    WELCOME: { class: 'badge-success', label: '🎉 Welcome', bg: '#d1fae5', fg: '#047857' },
    VIP: { class: 'badge-gold', label: '👑 VIP', bg: '#fef3c7', fg: '#92400e' },
    BUNDLE: { class: 'badge-primary', label: '📦 Bundle', bg: '#dbeafe', fg: '#1d4ed8' },
    FREESHIP: { class: 'badge-info', label: '🚚 Freeship', bg: '#cffafe', fg: '#0e7490' },
    GAMIFICATION: { class: 'badge-warning', label: '🎰 Vòng quay', bg: '#ffedd5', fg: '#c2410c' },
    REFERRAL: { class: 'badge-diamond', label: '🔗 Referral', bg: '#e0e7ff', fg: '#4338ca' },
    BIRTHDAY: { class: 'badge-danger', label: '🎂 Sinh nhật', bg: '#fee2e2', fg: '#dc2626' },
  };
  return map[cat] || { class: 'badge-member', label: cat, bg: '#f1f5f9', fg: '#475569' };
}

export default function VoucherTableClient({ vouchers }: { vouchers: VoucherTableRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editVoucher, setEditVoucher] = useState<VoucherTableRow | null>(null);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Bạn chắc chắn muốn xoá voucher "${code}"?\nHành động này không thể hoàn tác.`)) return;

    setDeletingId(id);
    try {
      await apiClientClient.delete(`/vouchers/${id}`);
      router.refresh();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Lỗi xoá voucher');
    } finally {
      setDeletingId(null);
    }
  };

  const openRow = (e: React.MouseEvent, voucher: VoucherTableRow) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="switch"]')) return;
    setEditVoucher(voucher);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    setTogglingId(id);
    try {
      await apiClientClient.patch(`/vouchers/${id}`, { isActive: !current });
      router.refresh();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Lỗi cập nhật trạng thái');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
              <th className="px-4 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Mã voucher</th>
              <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Chiến dịch</th>
              <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Loại</th>
              <th className="px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Giá trị</th>
              <th className="px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Đơn tối thiểu</th>
              <th className="min-w-[150px] px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Đã dùng</th>
              <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">HSD</th>
              <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Kích hoạt</th>
              <th className="px-4 py-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-3">🎫</div>
                    <div className="text-xl font-semibold text-gray-800 mb-2">Chưa có voucher nào</div>
                    <div className="text-gray-600">Tạo voucher đầu tiên để bắt đầu chiến dịch</div>
                  </div>
                </td>
              </tr>
            ) : vouchers.map((voucher, idx) => {
              const campInfo = getCampaignBadge(voucher.campaignCategory);
              const isDeleting = deletingId === voucher.id;
              const isToggling = togglingId === voucher.id;

              const usedPct = voucher.totalUsageLimit
                ? Math.min(100, Math.round((voucher.usedCount / voucher.totalUsageLimit) * 100))
                : voucher.usedCount > 0 ? 100 : 0;
              const barColor = usedPct >= 90 ? '#dc2626' : usedPct >= 60 ? '#c2410c' : '#2563eb';

              return (
                <tr
                  key={voucher.id}
                  onClick={(e) => openRow(e, voucher)}
                  className={`cursor-pointer border-t border-[#f3f4f6] transition-colors hover:bg-[#eff6ff] ${idx % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'} ${isDeleting ? 'opacity-50' : ''}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[12.5px] font-bold text-[#2140da]">
                    {voucher.code}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span
                      className="whitespace-nowrap rounded-full px-[10px] py-[3px] text-[11px] font-bold"
                      style={{ background: campInfo.bg, color: campInfo.fg }}
                    >
                      {campInfo.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[#4b5563]">{getTypeBadge(voucher.type).label}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-900">
                    {voucher.type === 'STACK'
                      ? (() => {
                          const tiers = voucher.stackTiers;
                          if (tiers && tiers.length > 0) {
                            const minTier = tiers.reduce((min, tier) => tier.discount < min.discount ? tier : min, tiers[0]);
                            const maxTier = tiers.reduce((max, tier) => tier.discount > max.discount ? tier : max, tiers[0]);
                            const isPercent = maxTier.type === 'PERCENT';
                            const condition = tiers[0].conditionType === 'amount' ? 'giá trị' : 'số SP';
                            return (
                              <div className="flex flex-col items-end">
                                <span className="text-indigo-600">Theo {condition}</span>
                                <span className="text-[11px] font-normal text-gray-500">
                                  {isPercent ? `${minTier.discount}% - ${maxTier.discount}%` : `${formatCurrency(minTier.discount)} - ${formatCurrency(maxTier.discount)}`}
                                </span>
                              </div>
                            );
                          }
                          return '—';
                        })()
                      : voucher.type === 'PERCENT'
                        ? `${voucher.value}%`
                        : formatCurrency(voucher.value)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-[#4b5563]">{formatCurrency(voucher.minOrderValue)}</td>
                  <td className="px-3 py-3">
                    <div className="mb-1 whitespace-nowrap text-[12px] font-semibold text-slate-900">
                      {voucher.usedCount}
                      {voucher.totalUsageLimit ? `/${voucher.totalUsageLimit}` : ''}
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-[#f3f4f6]">
                      <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: barColor }} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[#6b7280]">{formatDateRange(voucher.validFrom, voucher.validTo)}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(voucher.id, voucher.isActive)}
                      disabled={isToggling}
                      aria-pressed={voucher.isActive}
                      className={`inline-flex h-5 w-[34px] items-center rounded-full p-[2px] transition-colors disabled:opacity-50 ${voucher.isActive ? 'bg-[#2563eb]' : 'bg-[#cbd5e1]'}`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${voucher.isActive ? 'translate-x-[14px]' : 'translate-x-0'}`}
                      />
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => setEditVoucher(voucher)}
                      className="mr-3 cursor-pointer text-[12.5px] font-semibold text-[#2563eb] hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(voucher.id, voucher.code)}
                      disabled={isDeleting}
                      className="cursor-pointer text-[12.5px] font-semibold text-[#dc2626] hover:underline disabled:opacity-50"
                    >
                      {isDeleting ? '...' : 'Xoá'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      {/* Edit Modal */}
      {editVoucher && (
        <EditVoucherModal
          voucher={editVoucher}
          onSaved={() => {
            setEditVoucher(null);
            router.refresh();
          }}
          onClose={() => setEditVoucher(null)}
        />
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import EditVoucherModal from './EditVoucherModal';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | Date | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date));
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

export default function VoucherTableClient({ vouchers }: { vouchers: any[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editVoucher, setEditVoucher] = useState<any>(null);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Bạn chắc chắn muốn xoá voucher "${code}"?\nHành động này không thể hoàn tác.`)) return;

    setDeletingId(id);
    try {
      await apiClientClient.delete(`/vouchers/${id}`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi xoá voucher');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Code</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Tên</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Chiến dịch</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Loại</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Giá trị</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Đơn tối thiểu</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Đã dùng</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Hạn dùng</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Trạng thái</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-3">🎫</div>
                    <div className="text-xl font-semibold text-gray-800 mb-2">Chưa có voucher nào</div>
                    <div className="text-gray-600">Tạo voucher đầu tiên để bắt đầu chiến dịch</div>
                  </div>
                </td>
              </tr>
            ) : vouchers.map((voucher) => {
              const typeInfo = getTypeBadge(voucher.type);
              const campInfo = getCampaignBadge(voucher.campaignCategory);
              const isDeleting = deletingId === voucher.id;

              return (
                <tr key={voucher.id} className={`hover:bg-gray-50/50 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-sm bg-gray-100 px-2 py-1 rounded">
                      {voucher.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{voucher.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      campInfo.class === 'badge-success' ? 'bg-green-100 text-green-700' :
                      campInfo.class === 'badge-gold' ? 'bg-yellow-100 text-yellow-700' :
                      campInfo.class === 'badge-primary' ? 'bg-blue-100 text-blue-700' :
                      campInfo.class === 'badge-info' ? 'bg-cyan-100 text-cyan-700' :
                      campInfo.class === 'badge-warning' ? 'bg-orange-100 text-orange-700' :
                      campInfo.class === 'badge-diamond' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {campInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      typeInfo.class === 'badge-primary' ? 'bg-blue-100 text-blue-700' :
                      typeInfo.class === 'badge-success' ? 'bg-green-100 text-green-700' :
                      typeInfo.class === 'badge-warning' ? 'bg-orange-100 text-orange-700' :
                      'bg-cyan-100 text-cyan-700'
                    }`}>
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">
                    {voucher.type === 'STACK'
                      ? (() => {
                          const tiers = voucher.stackTiers as any[] | null;
                          if (tiers && tiers.length > 0) {
                            const minTier = tiers.reduce((min: any, t: any) => t.discount < min.discount ? t : min, tiers[0]);
                            const maxTier = tiers.reduce((max: any, t: any) => t.discount > max.discount ? t : max, tiers[0]);
                            const isPercent = maxTier.type === 'PERCENT';
                            const condition = tiers[0].conditionType === 'amount' ? 'giá trị' : 'số SP';
                            return (
                              <div className="flex flex-col">
                                <span className="text-indigo-600">Theo {condition}</span>
                                <span className="text-[11px] text-gray-500">
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
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatCurrency(voucher.minOrderValue)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {voucher.usedCount}
                    {voucher.totalUsageLimit ? `/${voucher.totalUsageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(voucher.validTo)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      voucher.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {voucher.isActive ? 'Hoạt động' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditVoucher(voucher)}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(voucher.id, voucher.code)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? '...' : '🗑️ Xoá'}
                      </button>
                    </div>
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

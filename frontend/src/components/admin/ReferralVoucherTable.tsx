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
  discount?: number | null;
  type?: string | null;
  maxDiscount?: number | null;
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
  stackTiers: VoucherStackTier[] | null;
  _count?: {
    userVouchers?: number;
  } | null;
}

function formatCurrency(amount: number) {
  return formatVndSymbol(amount);
}

function getTypeBadge(type: string) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    PERCENT: { bg: '#dbeafe', fg: '#1d4ed8', label: 'Giảm %' },
    FIXED_AMOUNT: { bg: '#d1fae5', fg: '#047857', label: 'Giảm tiền' },
    FREESHIP: { bg: '#cffafe', fg: '#0e7490', label: 'Free ship' },
    STACK: { bg: '#ffedd5', fg: '#c2410c', label: 'Stack' },
  };
  return map[type] || { bg: '#f3f4f6', fg: '#4b5563', label: type };
}

export default function ReferralVoucherTable({ vouchers }: { vouchers: ReferralVoucher[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editVoucher, setEditVoucher] = useState<ReferralVoucher | null>(null);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Bạn chắc chắn muốn xoá voucher "${code}"?\nHành động này không thể hoàn tác.`)) return;

    setDeletingId(id);
    try {
      await apiClientClient.delete(`/vouchers/${id}`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Lỗi xoá voucher');
    } finally {
      setDeletingId(null);
    }
  };

  const openRow = (e: React.MouseEvent, voucher: ReferralVoucher) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="switch"]')) return;
    setEditVoucher(voucher);
  };

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="flex items-center justify-between border-b border-[#f0f1f5] px-5 py-[15px]">
          <span className="text-[15px] font-bold text-slate-900">Danh sách Voucher Referral</span>
          <span className="text-[12.5px] text-[#6b7280]">{vouchers.length} voucher</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="whitespace-nowrap px-4 py-[10px] text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Code</th>
                <th className="whitespace-nowrap px-3 py-[10px] text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Tên</th>
                <th className="whitespace-nowrap px-3 py-[10px] text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Loại</th>
                <th className="whitespace-nowrap px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Giá trị</th>
                <th className="whitespace-nowrap px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Đơn tối thiểu</th>
                <th className="whitespace-nowrap px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Đã dùng</th>
                <th className="whitespace-nowrap px-3 py-[10px] text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Trạng thái</th>
                <th className="whitespace-nowrap px-4 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-12 text-center">
                      <div className="mb-2 text-xl font-semibold text-slate-900">Chưa có voucher referral</div>
                      <div className="text-[13px] text-[#6b7280]">Tạo voucher đầu tiên để gán vào phần thưởng mời bạn</div>
                    </div>
                  </td>
                </tr>
              ) : vouchers.map((voucher, idx) => {
                const typeInfo = getTypeBadge(voucher.type);
                const isDeleting = deletingId === voucher.id;

                return (
                  <tr
                    key={voucher.id}
                    onClick={(e) => openRow(e, voucher)}
                    className={`cursor-pointer border-t border-[#f3f4f6] transition-colors hover:bg-[#eff6ff] ${isDeleting ? 'opacity-50' : ''}`}
                    style={{ background: idx % 2 === 1 ? '#f7f9fc' : '#fff' }}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded bg-[#f3f4f6] px-2 py-1 font-mono text-[12px] font-bold text-slate-900">
                        {voucher.code}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">{voucher.name}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className="rounded-full px-[10px] py-[3px] text-[11px] font-semibold"
                        style={{ background: typeInfo.bg, color: typeInfo.fg }}
                      >
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-900">
                      {voucher.type === 'PERCENT'
                        ? `${voucher.value}%`
                        : formatCurrency(voucher.value)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[#4b5563]">{formatCurrency(voucher.minOrderValue)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[#4b5563]">
                      {voucher._count?.userVouchers || voucher.usedCount || 0}
                      {voucher.totalUsageLimit ? `/${voucher.totalUsageLimit}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className="rounded-full px-[10px] py-[3px] text-[11px] font-semibold"
                        style={voucher.isActive ? { background: '#d1fae5', color: '#047857' } : { background: '#fee2e2', color: '#dc2626' }}
                      >
                        {voucher.isActive ? 'Hoạt động' : 'Tắt'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setEditVoucher(voucher)}
                          className="text-[12.5px] font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(voucher.id, voucher.code)}
                          disabled={isDeleting}
                          className="text-[12.5px] font-semibold text-[#dc2626] transition-colors hover:text-[#b91c1c] disabled:opacity-50"
                        >
                          {isDeleting ? '...' : 'Xoá'}
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

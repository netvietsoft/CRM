'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndTight } from '@/lib/format';

interface RewardTier {
  milestone: number;
  rewardType: 'SPIN' | 'VOUCHER';
  spinTurns: number;
  voucherId: string | null;
  voucherName?: string;
}

interface VoucherSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface Props {
  initialTiers: RewardTier[];
  vouchers: VoucherSummary[];
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function ReferralRewardConfig({ initialTiers, vouchers }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [tiers, setTiers] = useState<RewardTier[]>(
    initialTiers.length > 0
      ? initialTiers
      : [
        { milestone: 1, rewardType: 'VOUCHER', spinTurns: 1, voucherId: null },
        { milestone: 2, rewardType: 'SPIN', spinTurns: 1, voucherId: null },
        { milestone: 3, rewardType: 'VOUCHER', spinTurns: 1, voucherId: null },
        { milestone: 4, rewardType: 'SPIN', spinTurns: 1, voucherId: null },
      ]
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateTier = <K extends keyof RewardTier>(idx: number, field: K, value: RewardTier[K]) => {
    setTiers(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
    setSuccess(false);
  };

  const addTier = () => {
    const nextMilestone = tiers.length > 0 ? Math.max(...tiers.map(t => t.milestone)) + 1 : 1;
    setTiers(prev => [
      ...prev,
      { milestone: nextMilestone, rewardType: 'SPIN', spinTurns: 1, voucherId: null },
    ]);
    setSuccess(false);
  };

  const removeTier = (idx: number) => {
    setTiers(prev => prev.filter((_, i) => i !== idx));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await apiClientClient.post('/vouchers/referral-rewards-config', { tiers });
      setSuccess(true);
      router.refresh();
    } catch (error) {
      alert(getErrorMessage(error, 'Lỗi lưu cấu hình'));
    } finally {
      setSaving(false);
    }
  };

  const getVoucherLabel = (v: VoucherSummary | null | undefined) => {
    if (!v) return '';
    const valStr = v.type === 'PERCENT'
      ? `${v.value}%`
      : v.type === 'FREESHIP'
        ? `Freeship ${formatVndTight(v.value)}`
        : formatVndTight(v.value);
    return `${v.code} — ${v.name} (${valStr})`;
  };

  return (
    <>
      <button
        className="rounded-[10px] border border-[#e5e7eb] px-4 py-[9px] text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]"
        onClick={() => setShowModal(true)}
        id="config-referral-reward-btn"
      >
        ⚙️ Cấu hình
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[16px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f0f1f5] p-6">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900">Cấu hình thưởng theo lần mời</h2>
              </div>
              <button
                className="text-2xl leading-none text-[#9ca3af] transition-colors hover:text-[#4b5563]"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {success && (
                <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#d1fae5] bg-[#ecfdf5] px-4 py-2.5 text-[13px] text-[#047857]">
                  <span>✅</span>
                  <span>Đã lưu cấu hình thành công!</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-[80px_160px_1fr_36px] gap-3 px-1 text-[11.5px] font-semibold text-[#6b7280]">
                  <span>Lần mời</span>
                  <span>Loại thưởng</span>
                  <span>Chi tiết</span>
                  <span></span>
                </div>

                {tiers.map((tier, idx) => (
                  <div key={idx} className="grid grid-cols-[80px_160px_1fr_36px] gap-3 items-center">
                    {/* Milestone number */}
                    <div className="flex items-center">
                      <input type="number" value={tier.milestone} onChange={e => updateTier(idx, 'milestone', parseInt(e.target.value))} className="w-13 rounded-[10px] border border-[#e5e7eb] bg-white px-2.5 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]" />
                    </div>

                    {/* Reward type */}
                    <select
                      className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-2.5 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      value={tier.rewardType}
                      onChange={e => updateTier(idx, 'rewardType', e.target.value as RewardTier['rewardType'])}
                    >
                      <option value="SPIN">Lượt quay</option>
                      <option value="VOUCHER">Voucher</option>
                    </select>

                    {/* Detail */}
                    {tier.rewardType === 'SPIN' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-[#6b7280]">Số lượt:</span>
                        <input
                          type="number"
                          min={1}
                          className="w-20 rounded-[10px] border border-[#e5e7eb] bg-white px-2.5 py-2 text-center text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                          value={tier.spinTurns}
                          onChange={e => updateTier(idx, 'spinTurns', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    ) : (
                      <select
                        className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-2.5 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                        value={tier.voucherId || ''}
                        onChange={e => updateTier(idx, 'voucherId', e.target.value || null)}
                      >
                        <option value="">— Chọn voucher —</option>
                        {vouchers.map((v) => (
                          <option key={v.id} value={v.id}>
                            {getVoucherLabel(v)}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Remove */}
                    <button
                      type="button"
                      className="text-lg leading-none text-[#dc2626] transition-colors hover:text-[#b91c1c] disabled:opacity-30"
                      onClick={() => removeTier(idx)}
                      disabled={tiers.length <= 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[12px] text-[#6b7280]">
                💡 Khi user B đăng ký qua referral code của user A, hệ thống sẽ tự động cấp thưởng cho A theo cấu hình trên.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-[#f0f1f5] p-6">
              <button
                type="button"
                onClick={addTier}
                className="rounded-[10px] bg-[#eff6ff] px-3 py-1.5 text-[13px] font-semibold text-[#2563eb] transition-colors hover:bg-[#dbeafe]"
              >
                + Thêm lần
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-[10px] border border-[#e5e7eb] px-4 py-2 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]"
                  onClick={() => setShowModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-[10px] bg-[#2563eb] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : '💾 Lưu cấu hình'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

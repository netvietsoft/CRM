'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface RewardTier {
  milestone: number;
  rewardType: 'SPIN' | 'VOUCHER';
  spinTurns: number;
  voucherId: string | null;
  voucherName?: string;
}

interface Props {
  initialTiers: RewardTier[];
  vouchers: any[];
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

  const updateTier = (idx: number, field: string, value: any) => {
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
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const getVoucherLabel = (v: any) => {
    if (!v) return '';
    const valStr = v.type === 'PERCENT'
      ? `${v.value}%`
      : v.type === 'FREESHIP'
        ? `Freeship ${new Intl.NumberFormat('vi-VN').format(v.value)}đ`
        : `${new Intl.NumberFormat('vi-VN').format(v.value)}đ`;
    return `${v.code} — ${v.name} (${valStr})`;
  };

  return (
    <>
      <button
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        onClick={() => setShowModal(true)}
        id="config-referral-reward-btn"
      >
        ⚙️ Cấu hình
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Cấu hình thưởng theo lần mời</h2>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm mb-4 flex items-center gap-2">
                  <span>✅</span>
                  <span>Đã lưu cấu hình thành công!</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-[80px_160px_1fr_36px] gap-3 text-xs font-semibold text-gray-500 px-1">
                  <span>Lần mời</span>
                  <span>Loại thưởng</span>
                  <span>Chi tiết</span>
                  <span></span>
                </div>

                {tiers.map((tier, idx) => (
                  <div key={idx} className="grid grid-cols-[80px_160px_1fr_36px] gap-3 items-center">
                    {/* Milestone number */}
                    <div className="flex items-center">
                      <input type="number" value={tier.milestone} onChange={e => updateTier(idx, 'milestone', parseInt(e.target.value))} className="w-13 px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white" />
                    </div>

                    {/* Reward type */}
                    <select
                      className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      value={tier.rewardType}
                      onChange={e => updateTier(idx, 'rewardType', e.target.value)}
                    >
                      <option value="SPIN">Lượt quay</option>
                      <option value="VOUCHER">Voucher</option>
                    </select>

                    {/* Detail */}
                    {tier.rewardType === 'SPIN' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Số lượt:</span>
                        <input
                          type="number"
                          min={1}
                          className="w-20 px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          value={tier.spinTurns}
                          onChange={e => updateTier(idx, 'spinTurns', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    ) : (
                      <select
                        className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        value={tier.voucherId || ''}
                        onChange={e => updateTier(idx, 'voucherId', e.target.value || null)}
                      >
                        <option value="">— Chọn voucher —</option>
                        {vouchers.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {getVoucherLabel(v)}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Remove */}
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none disabled:opacity-30"
                      onClick={() => removeTier(idx)}
                      disabled={tiers.length <= 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-4">
                💡 Khi user B đăng ký qua referral code của user A, hệ thống sẽ tự động cấp thưởng cho A theo cấu hình trên.
              </p>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={addTier}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                + Thêm lần
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

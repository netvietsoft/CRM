'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface VoucherData {
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
  stackTiers: any[] | null;
}

interface Props {
  voucher: VoucherData;
  onSaved: () => void;
  onClose: () => void;
}

export default function EditVoucherModal({ voucher, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: voucher.name || '',
    description: voucher.description || '',
    campaignCategory: voucher.campaignCategory || 'WELCOME',
    type: voucher.type || 'PERCENT',
    value: String(voucher.value || ''),
    minOrderValue: String(voucher.minOrderValue || '0'),
    maxDiscount: voucher.maxDiscount ? String(voucher.maxDiscount) : '',
    totalUsageLimit: voucher.totalUsageLimit ? String(voucher.totalUsageLimit) : '',
    perCustomerLimit: String(voucher.perCustomerLimit || 1),
    durationDays: voucher.durationDays ? String(voucher.durationDays) : '',
    isStackable: voucher.isStackable || false,
    isActive: voucher.isActive,
  });

  const [stackTiers, setStackTiers] = useState<any[]>(
    voucher.stackTiers && Array.isArray(voucher.stackTiers) ? voucher.stackTiers : [
      { conditionType: 'products', minProducts: 1, minAmount: 0, discount: 200000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    ]
  );

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.patch(`/vouchers/${voucher.id}`, {
        name: form.name,
        description: form.description,
        campaignCategory: form.campaignCategory,
        type: form.type,
        value: form.type === 'STACK' ? 0 : parseFloat(form.value),
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        totalUsageLimit: form.totalUsageLimit ? parseInt(form.totalUsageLimit) : null,
        perCustomerLimit: parseInt(form.perCustomerLimit) || 1,
        durationDays: form.durationDays ? parseInt(form.durationDays) : null,
        isStackable: form.isStackable,
        isActive: form.isActive,
        stackTiers: form.type === 'STACK' ? stackTiers : undefined,
      });

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Lỗi cập nhật voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Sửa Voucher</h2>
            <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{voucher.code}</span>
          </div>
          <button
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị *</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                value={form.name}
                onChange={e => update('name', e.target.value)}
              />
            </div>

            {/* Campaign + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chiến dịch</label>
                <Select
                  value={form.campaignCategory}
                  onChange={(val) => update('campaignCategory', val)}
                  className="w-full"
                  options={[
                    { value: 'WELCOME', label: '🎉 Welcome' },
                    { value: 'VIP', label: '👑 VIP' },
                    { value: 'BUNDLE', label: '📦 Bundle' },
                    { value: 'FREESHIP', label: '🚚 Freeship' },
                    { value: 'GAMIFICATION', label: '🎰 Vòng quay' },
                    { value: 'REFERRAL', label: '🔗 Referral' },
                    { value: 'BIRTHDAY', label: '🎂 Sinh nhật' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giảm giá</label>
                <Select
                  value={form.type}
                  onChange={(val) => update('type', val)}
                  className="w-full"
                  options={[
                    { value: 'PERCENT', label: 'Giảm %' },
                    { value: 'FIXED_AMOUNT', label: 'Giảm tiền mặt' },
                    { value: 'FREESHIP', label: 'Free ship' },
                    { value: 'STACK', label: '📊 Stack (theo SP)' }
                  ]}
                />
              </div>
            </div>

            {/* Value + Min + Max */}
            <div className="grid grid-cols-3 gap-4">
              {form.type !== 'STACK' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá trị {form.type === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={form.type !== 'STACK'}
                    value={form.value}
                    onChange={e => update('value', e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.minOrderValue}
                  onChange={e => update('minOrderValue', e.target.value)}
                />
              </div>
              {form.type !== 'STACK' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giảm tối đa (VNĐ)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.maxDiscount}
                    onChange={e => update('maxDiscount', e.target.value)}
                    placeholder="Không giới hạn"
                  />
                </div>
              )}
            </div>

            {/* Stack Tiers Editor */}
            {form.type === 'STACK' && (
              <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-800">📊 Bảng mốc giảm giá</h4>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                    onClick={() => setStackTiers(prev => [...prev, { conditionType: 'products', minProducts: prev.length + 1, minAmount: 0, discount: 0, type: 'FIXED_AMOUNT', maxDiscount: 0 }])}
                  >
                    + Thêm mốc
                  </button>
                </div>
                <div className="space-y-2">
                    <div className="grid grid-cols-[140px_90px_1fr_100px_120px_32px] gap-3 text-xs font-semibold text-gray-500 px-1">
                      <span>Điều kiện</span>
                      <span>Mốc</span>
                      <span>Giảm</span>
                      <span>Loại</span>
                      <span>Tối đa</span>
                      <span></span>
                    </div>
                  {stackTiers.map((tier, idx) => (
                    <div key={idx} className="grid grid-cols-[140px_90px_1fr_100px_120px_32px] gap-3 items-center">
                      <Select
                        size="xs"
                        className="w-full"
                        value={tier.conditionType || 'products'}
                        onChange={(val) => {
                          const updated = [...stackTiers];
                          updated[idx] = { ...updated[idx], conditionType: val };
                          setStackTiers(updated);
                        }}
                        options={[
                          { value: 'products', label: 'Số lượng SP' },
                          { value: 'amount', label: 'Mốc tiền' }
                        ]}
                      />
                      <input
                        type="number"
                        min={tier.conditionType === 'amount' ? 0 : 1}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        value={tier.conditionType === 'amount' ? (tier.minAmount || 0) : (tier.minProducts || 0)}
                        onChange={e => {
                          const updated = [...stackTiers];
                          if (tier.conditionType === 'amount') {
                            updated[idx] = { ...updated[idx], minAmount: parseFloat(e.target.value) || 0 };
                          } else {
                            updated[idx] = { ...updated[idx], minProducts: parseInt(e.target.value) || 1 };
                          }
                          setStackTiers(updated);
                        }}
                        placeholder={tier.conditionType === 'amount' ? '500000' : '1'}
                      />
                      <input
                        type="number"
                        min={0}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        value={tier.discount}
                        onChange={e => {
                          const updated = [...stackTiers];
                          updated[idx] = { ...updated[idx], discount: parseFloat(e.target.value) || 0 };
                          setStackTiers(updated);
                        }}
                        placeholder={tier.type === 'PERCENT' ? '10' : '200000'}
                      />
                      <Select
                        size="xs"
                        className="w-full"
                        value={tier.type}
                        onChange={(val) => {
                          const updated = [...stackTiers];
                          updated[idx] = { ...updated[idx], type: val };
                          setStackTiers(updated);
                        }}
                        options={[
                          { value: 'FIXED_AMOUNT', label: 'VNĐ' },
                          { value: 'PERCENT', label: '%' }
                        ]}
                      />
                      <input
                        type="number"
                        min={0}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400"
                        value={tier.maxDiscount || ''}
                        disabled={tier.type !== 'PERCENT'}
                        onChange={e => {
                          const updated = [...stackTiers];
                          updated[idx] = { ...updated[idx], maxDiscount: parseFloat(e.target.value) || 0 };
                          setStackTiers(updated);
                        }}
                        placeholder={tier.type === 'PERCENT' ? 'Tối đa' : '-'}
                      />
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none"
                        onClick={() => setStackTiers(prev => prev.filter((_, i) => i !== idx))}
                        disabled={stackTiers.length <= 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  💡 <strong>Số lượng SP</strong> = số sản phẩm khác nhau trong đơn. <strong>Mốc tiền</strong> = tổng giá trị đơn hàng.
                </p>
              </div>
            )}

            {/* Limits */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn tổng</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.totalUsageLimit}
                  onChange={e => update('totalUsageLimit', e.target.value)}
                  placeholder="Không giới hạn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mỗi KH dùng</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.perCustomerLimit}
                  onChange={e => update('perCustomerLimit', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn dùng (ngày)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.durationDays}
                  onChange={e => update('durationDays', e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                value={form.description}
                onChange={e => update('description', e.target.value)}
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={form.isStackable}
                  onChange={e => update('isStackable', e.target.checked)}
                />
                <span className="text-gray-700">Cho phép cộng dồn</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  checked={form.isActive as boolean}
                  onChange={e => update('isActive', e.target.checked)}
                />
                <span className="text-gray-700">Đang hoạt động</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

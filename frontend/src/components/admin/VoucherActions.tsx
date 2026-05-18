'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

export default function VoucherActions() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    campaignCategory: 'WELCOME',
    type: 'PERCENT',
    value: '',
    minOrderValue: '399000',
    maxDiscount: '',
    totalUsageLimit: '',
    perCustomerLimit: '1',
    validFrom: '',
    validTo: '',
    durationDays: '30',
    isStackable: false,
  });

  const defaultStackTiers = [
    { conditionType: 'products', minProducts: 1, minAmount: 0, discount: 200000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 2, minAmount: 0, discount: 300000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 3, minAmount: 0, discount: 500000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 4, minAmount: 0, discount: 800000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 5, minAmount: 0, discount: 1000000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
  ];

  const [stackTiers, setStackTiers] = useState(defaultStackTiers);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post('/vouchers', {
        ...form,
        value: form.type === 'STACK' ? 0 : parseFloat(form.value),
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        totalUsageLimit: form.totalUsageLimit ? parseInt(form.totalUsageLimit) : null,
        perCustomerLimit: parseInt(form.perCustomerLimit) || 1,
        durationDays: form.durationDays ? parseInt(form.durationDays) : null,
        stackTiers: form.type === 'STACK' ? stackTiers : null,
      });

      setShowModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Lỗi tạo voucher');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors" 
        onClick={() => setShowModal(true)} 
        id="add-voucher-btn"
      >
        + Tạo Voucher
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Tạo Voucher mới</h2>
              <button 
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none" 
                onClick={() => setShowModal(false)}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-code">
                      Mã voucher *
                    </label>
                    <input 
                      id="v-code" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono" 
                      required
                      value={form.code} 
                      onChange={e => update('code', e.target.value.toUpperCase())}
                      placeholder="VD: NEW10, VIP20" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-name">
                      Tên hiển thị *
                    </label>
                    <input 
                      id="v-name" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      required
                      value={form.name} 
                      onChange={e => update('name', e.target.value)}
                      placeholder="Giảm 10% đơn đầu" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-campaign">
                      Chiến dịch
                    </label>
                    <select 
                      id="v-campaign" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.campaignCategory} 
                      onChange={e => update('campaignCategory', e.target.value)}
                    >
                      <option value="WELCOME">🎉 Welcome – Khách mới</option>
                      <option value="VIP">👑 VIP – Khách thân thiết</option>
                      <option value="BUNDLE">📦 Bundle – Mua combo</option>
                      <option value="FREESHIP">🚚 Freeship</option>
                      <option value="GAMIFICATION">🎰 Vòng quay</option>
                      <option value="REFERRAL">🔗 Referral</option>
                      <option value="BIRTHDAY">🎂 Sinh nhật</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-type">
                      Loại giảm giá
                    </label>
                    <select 
                      id="v-type" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.type} 
                      onChange={e => {
                        update('type', e.target.value);
                        if (e.target.value === 'STACK') setStackTiers([...defaultStackTiers]);
                      }}
                    >
                      <option value="PERCENT">Giảm %</option>
                      <option value="FIXED_AMOUNT">Giảm tiền mặt</option>
                      <option value="FREESHIP">Free ship</option>
                      <option value="STACK">📊 Stack (theo SP)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {form.type !== 'STACK' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-value">
                        Giá trị {form.type === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                      </label>
                      <input 
                        id="v-value" 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        required={form.type !== 'STACK'}
                        value={form.value} 
                        onChange={e => update('value', e.target.value)}
                        placeholder={form.type === 'PERCENT' ? '10' : '50000'} 
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-min">
                      Đơn tối thiểu (VNĐ)
                    </label>
                    <input 
                      id="v-min" 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.minOrderValue} 
                      onChange={e => update('minOrderValue', e.target.value)}
                      placeholder="399000" 
                    />
                  </div>
                  {form.type !== 'STACK' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-max">
                        Giảm tối đa (VNĐ)
                      </label>
                      <input 
                        id="v-max" 
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
                      <h4 className="text-sm font-bold text-gray-800">📊 Bảng mốc giảm giá theo số SP</h4>
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
                          <select
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            value={tier.conditionType || 'products'}
                            onChange={e => {
                              const updated = [...stackTiers];
                              updated[idx] = { ...updated[idx], conditionType: e.target.value };
                              setStackTiers(updated);
                            }}
                          >
                            <option value="products">Số lượng SP</option>
                            <option value="amount">Mốc tiền</option>
                          </select>
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
                          <select
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            value={tier.type}
                            onChange={e => {
                              const updated = [...stackTiers];
                              updated[idx] = { ...updated[idx], type: e.target.value };
                              setStackTiers(updated);
                            }}
                          >
                            <option value="FIXED_AMOUNT">VNĐ</option>
                            <option value="PERCENT">%</option>
                          </select>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-total-limit">
                      Giới hạn tổng
                    </label>
                    <input 
                      id="v-total-limit" 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.totalUsageLimit} 
                      onChange={e => update('totalUsageLimit', e.target.value)}
                      placeholder="Không giới hạn" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-per-cust">
                      Mỗi KH dùng
                    </label>
                    <input 
                      id="v-per-cust" 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.perCustomerLimit} 
                      onChange={e => update('perCustomerLimit', e.target.value)}
                      placeholder="1" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-duration">
                      Hạn dùng (ngày)
                    </label>
                    <input 
                      id="v-duration" 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.durationDays} 
                      onChange={e => update('durationDays', e.target.value)}
                      placeholder="30" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-desc">
                    Mô tả
                  </label>
                  <textarea 
                    id="v-desc" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    rows={2}
                    value={form.description} 
                    onChange={e => update('description', e.target.value)}
                    placeholder="Mô tả chi tiết voucher..." 
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={form.isStackable}
                    onChange={e => update('isStackable', e.target.checked)} 
                  />
                  <span className="text-gray-700">Cho phép cộng dồn với voucher khác</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors" 
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={loading} 
                  id="save-voucher-btn"
                >
                  {loading ? 'Đang tạo...' : 'Tạo Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

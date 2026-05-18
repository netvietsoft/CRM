'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

export default function ReferralVoucherActions() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'FIXED_AMOUNT',
    value: '',
    minOrderValue: '0',
    maxDiscount: '',
    totalUsageLimit: '',
    perCustomerLimit: '1',
    durationDays: '30',
    isStackable: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post('/vouchers/referral-voucher', {
        ...form,
        value: parseFloat(form.value),
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        totalUsageLimit: form.totalUsageLimit ? parseInt(form.totalUsageLimit) : null,
        perCustomerLimit: parseInt(form.perCustomerLimit) || 1,
        durationDays: form.durationDays ? parseInt(form.durationDays) : null,
      });

      setShowModal(false);
      setForm({
        code: '',
        name: '',
        description: '',
        type: 'FIXED_AMOUNT',
        value: '',
        minOrderValue: '0',
        maxDiscount: '',
        totalUsageLimit: '',
        perCustomerLimit: '1',
        durationDays: '30',
        isStackable: false,
      });
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
        id="add-referral-voucher-btn"
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
              <div>
                <h2 className="text-xl font-bold text-gray-800">Tạo Voucher Mã Mời</h2>
                <span className="text-xs text-gray-500">Campaign: 🔗 Referral (tự động gán)</span>
              </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-code">
                      Mã voucher *
                    </label>
                    <input
                      id="rv-code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      required
                      value={form.code}
                      onChange={e => update('code', e.target.value.toUpperCase())}
                      placeholder="VD: REF-FREESHIP25K"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-name">
                      Tên hiển thị *
                    </label>
                    <input
                      id="rv-name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="Freeship 25k mã mời"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-type">
                      Loại giảm giá
                    </label>
                    <Select
                      value={form.type}
                      onChange={(val) => update('type', val)}
                      className="w-full"
                      options={[
                        { value: 'PERCENT', label: 'Giảm %' },
                        { value: 'FIXED_AMOUNT', label: 'Giảm tiền mặt' },
                        { value: 'FREESHIP', label: 'Free ship' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-value">
                      Giá trị {form.type === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                    </label>
                    <input
                      id="rv-value"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      value={form.value}
                      onChange={e => update('value', e.target.value)}
                      placeholder={form.type === 'PERCENT' ? '10' : '25000'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-min">
                      Đơn tối thiểu (VNĐ)
                    </label>
                    <input
                      id="rv-min"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.minOrderValue}
                      onChange={e => update('minOrderValue', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {form.type === 'PERCENT' && (
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-max">
                      Giảm tối đa (VNĐ)
                    </label>
                    <input
                      id="rv-max"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.maxDiscount}
                      onChange={e => update('maxDiscount', e.target.value)}
                      placeholder="Không giới hạn"
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-total-limit">
                      Giới hạn tổng
                    </label>
                    <input
                      id="rv-total-limit"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.totalUsageLimit}
                      onChange={e => update('totalUsageLimit', e.target.value)}
                      placeholder="Không giới hạn"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-per-cust">
                      Mỗi KH dùng
                    </label>
                    <input
                      id="rv-per-cust"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.perCustomerLimit}
                      onChange={e => update('perCustomerLimit', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-duration">
                      Hạn dùng (ngày)
                    </label>
                    <input
                      id="rv-duration"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.durationDays}
                      onChange={e => update('durationDays', e.target.value)}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rv-desc">
                    Mô tả
                  </label>
                  <textarea
                    id="rv-desc"
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
                  id="save-referral-voucher-btn"
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

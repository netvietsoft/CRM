'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

export default function SpinPrizeActions() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    type: 'VOUCHER',
    color: '#6366f1',
    probability: '10',
    quantity: '',
    // Voucher config
    voucherCode: '',
    voucherName: '',
    voucherDescription: '',
    campaignCategory: 'GAMIFICATION',
    voucherType: 'PERCENT',
    value: '',
    minOrderValue: '0',
    maxDiscount: '',
    perCustomerLimit: '1',
    durationDays: '30',
    isStackable: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post('/spin/admin/prizes', {
        name: form.name,
        type: form.type,
        color: form.color,
        probability: parseFloat(form.probability) / 100,
        quantity: form.quantity ? parseInt(form.quantity) : null,
        // Voucher data
        voucher: {
          code: form.voucherCode,
          name: form.voucherName,
          description: form.voucherDescription,
          campaignCategory: form.campaignCategory,
          type: form.voucherType,
          value: parseFloat(form.value),
          minOrderValue: parseFloat(form.minOrderValue) || 0,
          maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
          perCustomerLimit: parseInt(form.perCustomerLimit) || 1,
          durationDays: form.durationDays ? parseInt(form.durationDays) : null,
          isStackable: form.isStackable,
        },
      });

      setShowModal(false);
      setForm({
        name: '',
        type: 'VOUCHER',
        color: '#6366f1',
        probability: '10',
        quantity: '',
        voucherCode: '',
        voucherName: '',
        voucherDescription: '',
        campaignCategory: 'GAMIFICATION',
        voucherType: 'PERCENT',
        value: '',
        minOrderValue: '0',
        maxDiscount: '',
        perCustomerLimit: '1',
        durationDays: '30',
        isStackable: false,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo giải thưởng');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      // Auto-generate voucher code from name
      if (field === 'name' && typeof value === 'string') {
        newForm.voucherCode = 'SPIN_' + value
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/Đ/g, 'D')
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        newForm.voucherName = value;
      }
      return newForm;
    });
  };

  const colorOptions = [
    { value: '#ef4444', label: '🔴 Đỏ' },
    { value: '#f97316', label: '🟠 Cam' },
    { value: '#eab308', label: '🟡 Vàng' },
    { value: '#22c55e', label: '🟢 Xanh lá' },
    { value: '#06b6d4', label: '🔵 Xanh dương' },
    { value: '#6366f1', label: '🟣 Tím' },
    { value: '#ec4899', label: '🩷 Hồng' },
  ];

  return (
    <>
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors" 
        onClick={() => setShowModal(true)}
      >
        + Thêm Giải thưởng
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Thêm Giải thưởng Voucher</h2>
              <button 
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none" 
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Prize Config Section */}
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">🎰 Cấu hình vòng quay</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prize-name">
                        Tên giải thưởng *
                      </label>
                      <input 
                        id="prize-name" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        required
                        value={form.name} 
                        onChange={e => update('name', e.target.value)}
                        placeholder="VD: Giảm 10%" 
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prize-color">
                          Màu sắc
                        </label>
                        <Select
                          value={form.color}
                          onChange={(val) => update('color', val)}
                          className="w-full"
                          options={colorOptions}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prize-prob">
                          Xác suất (%) *
                        </label>
                        <input 
                          id="prize-prob" 
                          type="number" 
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          required
                          value={form.probability} 
                          onChange={e => update('probability', e.target.value)}
                          placeholder="10" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prize-qty">
                          Số lượng
                        </label>
                        <input 
                          id="prize-qty" 
                          type="number" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={form.quantity} 
                          onChange={e => update('quantity', e.target.value)}
                          placeholder="Không giới hạn" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voucher Config Section */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">🎫 Cấu hình voucher</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-code">
                          Mã voucher *
                        </label>
                        <input 
                          id="v-code" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" 
                          required
                          value={form.voucherCode} 
                          onChange={e => update('voucherCode', e.target.value.toUpperCase())}
                          placeholder="SPIN_GIAM10" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-name">
                          Tên voucher *
                        </label>
                        <input 
                          id="v-name" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          required
                          value={form.voucherName} 
                          onChange={e => update('voucherName', e.target.value)}
                          placeholder="Giảm 10%" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-type">
                        Loại giảm giá
                      </label>
                      <Select
                        value={form.voucherType}
                        onChange={(val) => update('voucherType', val)}
                        className="w-full"
                        options={[
                          { value: 'PERCENT', label: 'Giảm %' },
                          { value: 'FIXED_AMOUNT', label: 'Giảm tiền mặt' },
                          { value: 'FREESHIP', label: 'Free ship' }
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-value">
                          Giá trị {form.voucherType === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                        </label>
                        <input 
                          id="v-value" 
                          type="number" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          required
                          value={form.value} 
                          onChange={e => update('value', e.target.value)}
                          placeholder={form.voucherType === 'PERCENT' ? '10' : '50000'} 
                        />
                      </div>
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
                          placeholder="0" 
                        />
                      </div>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                        value={form.voucherDescription} 
                        onChange={e => update('voucherDescription', e.target.value)}
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
                </div>
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
                >
                  {loading ? 'Đang tạo...' : 'Tạo Giải thưởng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

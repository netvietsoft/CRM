'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface SpinPrize {
  id: string;
  name: string;
  type: string;
  color: string | null;
  probability: number;
  quantity: number | null;
  voucher: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: string;
    value: number;
    minOrderValue: number;
    maxDiscount: number | null;
    perCustomerLimit: number;
    durationDays: number | null;
    isStackable: boolean;
  } | null;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function SpinPrizeRowActions({ prize }: { prize: SpinPrize }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [form, setForm] = useState({
    name: prize.name,
    color: prize.color || '#6366f1',
    probability: (prize.probability * 100).toString(),
    quantity: prize.quantity?.toString() || '',
    voucherCode: prize.voucher?.code || '',
    voucherName: prize.voucher?.name || '',
    voucherDescription: prize.voucher?.description || '',
    voucherType: prize.voucher?.type || 'PERCENT',
    value: prize.voucher?.value.toString() || '',
    minOrderValue: prize.voucher?.minOrderValue.toString() || '0',
    maxDiscount: prize.voucher?.maxDiscount?.toString() || '',
    perCustomerLimit: prize.voucher?.perCustomerLimit.toString() || '1',
    durationDays: prize.voucher?.durationDays?.toString() || '30',
    isStackable: prize.voucher?.isStackable || false,
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.put(`/spin/admin/prizes/${prize.id}`, {
        name: form.name,
        color: form.color,
        probability: parseFloat(form.probability) / 100,
        quantity: form.quantity ? parseInt(form.quantity) : null,
        voucher: prize.voucher ? {
          code: form.voucherCode,
          name: form.voucherName,
          description: form.voucherDescription,
          type: form.voucherType,
          value: parseFloat(form.value),
          minOrderValue: parseFloat(form.minOrderValue) || 0,
          maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
          perCustomerLimit: parseInt(form.perCustomerLimit) || 1,
          durationDays: form.durationDays ? parseInt(form.durationDays) : null,
          isStackable: form.isStackable,
        } : undefined,
      });

      setShowEditModal(false);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, 'Lỗi cập nhật giải thưởng'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiClientClient.delete(`/spin/admin/prizes/${prize.id}`);
      setShowDeleteModal(false);
      router.refresh();
    } catch (error) {
      alert(getErrorMessage(error, 'Lỗi xóa giải thưởng'));
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
      <div className="inline-flex items-center whitespace-nowrap">
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="text-[#2563eb] font-semibold cursor-pointer text-[12.5px] mr-3 hover:underline"
        >
          Sửa
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="text-[#dc2626] font-semibold cursor-pointer text-[12.5px] hover:underline"
        >
          Xoá
        </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-[rgba(15,23,42,0.5)] flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#eceef2]">
              <h2 className="text-xl font-bold text-[#111827]">Sửa giải thưởng</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Prize Config */}
                <div className="border-b border-[#eceef2] pb-4">
                  <h3 className="text-sm font-bold text-[#4b5563] mb-3">Cấu hình vòng quay</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Tên giải thưởng *</label>
                      <input 
                        className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]" 
                        required
                        value={form.name} 
                        onChange={e => update('name', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Màu sắc</label>
                        <Select
                          value={form.color}
                          onChange={(val) => update('color', val)}
                          className="w-full"
                          options={colorOptions}
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Tỷ lệ (%) *</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]" 
                          required
                          value={form.probability} 
                          onChange={e => update('probability', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Kho</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          value={form.quantity} 
                          onChange={e => update('quantity', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voucher Config */}
                {prize.voucher && (
                  <div>
                    <h3 className="text-sm font-bold text-[#4b5563] mb-3">Cấu hình voucher</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Mã voucher *</label>
                          <input 
                            className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb] font-mono" 
                            required
                            value={form.voucherCode} 
                            onChange={e => update('voucherCode', e.target.value.toUpperCase())}
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Tên voucher *</label>
                          <input 
                            className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]" 
                            required
                            value={form.voucherName} 
                            onChange={e => update('voucherName', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Loại giảm giá</label>
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
                          <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">
                            Giá trị {form.voucherType === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                          </label>
                          <input 
                            type="number" 
                            className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]" 
                            required
                            value={form.value} 
                            onChange={e => update('value', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Đơn tối thiểu (VNĐ)</label>
                          <input 
                            type="number" 
                            className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                            value={form.minOrderValue} 
                            onChange={e => update('minOrderValue', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Giảm tối đa (VNĐ)</label>
                          <input 
                            type="number" 
                            className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                            value={form.maxDiscount} 
                            onChange={e => update('maxDiscount', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Mỗi KH dùng</label>
                          <input 
                            type="number" 
                            className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                            value={form.perCustomerLimit} 
                            onChange={e => update('perCustomerLimit', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Hạn dùng (ngày)</label>
                          <input 
                            type="number" 
                            className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                            value={form.durationDays} 
                            onChange={e => update('durationDays', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5">Mô tả</label>
                        <textarea
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb] resize-y"
                          rows={2}
                          value={form.voucherDescription}
                          onChange={e => update('voucherDescription', e.target.value)}
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-[13px]">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-[#2563eb] border-[#e5e7eb] rounded focus:ring-[#2563eb]"
                          checked={form.isStackable}
                          onChange={e => update('isStackable', e.target.checked)}
                        />
                        <span className="text-[#4b5563]">Cho phép cộng dồn với voucher khác</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-[#eceef2]">
                <button
                  type="button"
                  className="px-4 py-2.5 border border-[#e5e7eb] text-[#374151] rounded-[10px] font-semibold text-[13px] cursor-pointer transition-colors hover:bg-[#f9fafb]"
                  onClick={() => setShowEditModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#2563eb] text-white rounded-[10px] font-semibold text-[13px] cursor-pointer transition-colors hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.5)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#111827] mb-4">Xác nhận xoá</h3>
            <p className="text-[#4b5563] mb-6">
              Bạn có chắc chắn muốn xoá giải thưởng <strong>{prize.name}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 border border-[#e5e7eb] text-[#374151] rounded-[10px] font-semibold text-[13px] cursor-pointer transition-colors hover:bg-[#f9fafb]"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 bg-[#dc2626] text-white rounded-[10px] font-semibold text-[13px] cursor-pointer transition-colors hover:bg-[#b91c1c] disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

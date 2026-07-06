'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { getApiErrorMessage } from '@/lib/apiError';
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
    } catch (error) {
      setError(getApiErrorMessage(error, 'Lỗi tạo voucher'));
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
        className="rounded-[10px] bg-[#2563eb] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
        onClick={() => setShowModal(true)}
        id="add-referral-voucher-btn"
      >
        + Tạo Voucher
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[16px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f0f1f5] p-6">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900">Tạo Voucher Mã Mời</h2>
                <span className="text-[11.5px] text-[#6b7280]">Campaign: 🔗 Referral (tự động gán)</span>
              </div>
              <button
                className="text-2xl leading-none text-[#9ca3af] transition-colors hover:text-[#4b5563]"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 p-6">
                {error && (
                  <div className="flex items-center gap-2 rounded-[10px] border border-[#fee2e2] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#dc2626]">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-code">
                      Mã voucher *
                    </label>
                    <input
                      id="rv-code"
                      className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 font-mono text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      required
                      value={form.code}
                      onChange={e => update('code', e.target.value.toUpperCase())}
                      placeholder="VD: REF-FREESHIP25K"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-name">
                      Tên hiển thị *
                    </label>
                    <input
                      id="rv-name"
                      className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      required
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="Freeship 25k mã mời"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-type">
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
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-value">
                      Giá trị {form.type === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                    </label>
                    <input
                      id="rv-value"
                      type="number"
                      className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      required
                      value={form.value}
                      onChange={e => update('value', e.target.value)}
                      placeholder={form.type === 'PERCENT' ? '10' : '25000'}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-min">
                      Đơn tối thiểu (VNĐ)
                    </label>
                    <input
                      id="rv-min"
                      type="number"
                      className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      value={form.minOrderValue}
                      onChange={e => update('minOrderValue', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {form.type === 'PERCENT' && (
                  <div className="w-1/3">
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-max">
                      Giảm tối đa (VNĐ)
                    </label>
                    <input
                      id="rv-max"
                      type="number"
                      className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      value={form.maxDiscount}
                      onChange={e => update('maxDiscount', e.target.value)}
                      placeholder="Không giới hạn"
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-total-limit">
                      Giới hạn tổng
                    </label>
                    <input
                      id="rv-total-limit"
                      type="number"
                      className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      value={form.totalUsageLimit}
                      onChange={e => update('totalUsageLimit', e.target.value)}
                      placeholder="Không giới hạn"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-per-cust">
                      Mỗi KH dùng
                    </label>
                    <input
                      id="rv-per-cust"
                      type="number"
                      className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      value={form.perCustomerLimit}
                      onChange={e => update('perCustomerLimit', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-duration">
                      Hạn dùng (ngày)
                    </label>
                    <input
                      id="rv-duration"
                      type="number"
                      className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      value={form.durationDays}
                      onChange={e => update('durationDays', e.target.value)}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12.5px] font-semibold text-[#374151]" htmlFor="rv-desc">
                    Mô tả
                  </label>
                  <textarea
                    id="rv-desc"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] text-slate-900 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                    rows={2}
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder="Mô tả chi tiết voucher..."
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#e5e7eb] text-[#2563eb] focus:ring-[#2563eb]"
                    checked={form.isStackable}
                    onChange={e => update('isStackable', e.target.checked)}
                  />
                  <span className="text-[#374151]">Cho phép cộng dồn với voucher khác</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#f0f1f5] p-6">
                <button
                  type="button"
                  className="rounded-[10px] border border-[#e5e7eb] px-4 py-2 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-[10px] bg-[#2563eb] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
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

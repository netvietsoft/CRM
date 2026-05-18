'use client';

import { useState, useEffect } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { Pencil, Trash2 } from 'lucide-react';
import Select from '@/components/ui/Select';

interface Props {
  orderId: string;
  orderCode: string;
}

function fmtVND(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
}

export default function CreateOrderVoucherButton({ orderId, orderCode }: Props) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingVoucher, setExistingVoucher] = useState<any>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState('FIXED_AMOUNT');
  const [customValue, setCustomValue] = useState('');
  const [customMinOrder, setCustomMinOrder] = useState('');
  const [customMaxDiscount, setCustomMaxDiscount] = useState('');
  const [customDurationDays, setCustomDurationDays] = useState('');
  const [customUsageLimit, setCustomUsageLimit] = useState('');

  const defaultStackTiers = [
    { conditionType: 'products', minProducts: 1, minAmount: 0, discount: 200000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 2, minAmount: 0, discount: 300000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 3, minAmount: 0, discount: 500000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
  ];
  const [stackTiers, setStackTiers] = useState(defaultStackTiers);

  useEffect(() => {
    checkExisting();
  }, [orderCode]);

  async function checkExisting() {
    try {
      const res = await apiClientClient.get<any>(`/vouchers/order-voucher/${orderCode}`);
      if (res.exists) {
        setExistingVoucher(res.voucher);
      } else {
        setExistingVoucher(null);
      }
    } catch (e) {
      // ignore
    } finally {
      setChecking(false);
    }
  }

  async function handleCreateOrUpdate() {
    setLoading(true);
    try {
      if (isEditMode && existingVoucher) {
        // PATCH existing
        const body: any = {};
        if (customName) body.name = customName;
        body.type = customType;
        body.value = customType === 'STACK' ? 0 : (customValue ? Number(customValue) : 0);
        body.minOrderValue = customMinOrder ? Number(customMinOrder) : 0;
        body.maxDiscount = customMaxDiscount ? Number(customMaxDiscount) : null;
        body.durationDays = customDurationDays ? Number(customDurationDays) : null;
        body.perCustomerLimit = customUsageLimit ? Number(customUsageLimit) : null;
        if (customType === 'STACK') body.stackTiers = stackTiers;

        const res = await apiClientClient.patch<any>(`/vouchers/${existingVoucher.id}`, body);
        alert('Cập nhật voucher thành công!');
        setExistingVoucher(res);
      } else {
        // POST new
        const body: any = { orderId };
        if (customName) body.name = customName;
        body.type = customType;
        body.value = customType === 'STACK' ? 0 : (customValue ? Number(customValue) : undefined);
        if (customMinOrder) body.minOrderValue = Number(customMinOrder);
        if (customMaxDiscount) body.maxDiscount = Number(customMaxDiscount);
        if (customDurationDays) body.durationDays = Number(customDurationDays);
        if (customUsageLimit) body.perCustomerLimit = Number(customUsageLimit);
        if (customType === 'STACK') body.stackTiers = stackTiers;
        const res = await apiClientClient.post<any>('/vouchers/create-order-voucher', body);
        alert(res.message || 'Tạo voucher thành công!');
        setExistingVoucher(res.voucher);
      }
      setShowForm(false);
      setIsEditMode(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi xử lý voucher');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Bạn chắc chắn muốn xoá voucher này? Khách hàng sẽ không thể nhận được nữa.')) return;
    setLoading(true);
    try {
      await apiClientClient.delete(`/vouchers/${existingVoucher.id}`);
      alert('Đã xoá voucher thành công.');
      setExistingVoucher(null);
      setShowForm(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi xoá voucher');
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick() {
    setIsEditMode(true);
    setCustomName(existingVoucher.name || '');
    setCustomType(existingVoucher.type || 'FIXED_AMOUNT');
    setCustomValue(existingVoucher.value?.toString() || '');
    setCustomMinOrder(existingVoucher.minOrderValue?.toString() || '');
    setCustomMaxDiscount(existingVoucher.maxDiscount?.toString() || '');
    setCustomDurationDays(existingVoucher.durationDays?.toString() || '');
    setCustomUsageLimit(existingVoucher.perCustomerLimit?.toString() || '');
    if (existingVoucher.type === 'STACK' && existingVoucher.stackTiers?.length) {
      setStackTiers(existingVoucher.stackTiers);
    } else {
      setStackTiers([...defaultStackTiers]);
    }
    setShowForm(true);
  }

  function handleCancelForm() {
    setShowForm(false);
    setIsEditMode(false);
  }

  if (checking) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Đang kiểm tra voucher...</span>
        </div>
      </div>
    );
  }

  if (existingVoucher && !showForm) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 relative">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🎟️ Voucher QR đơn hàng</h2>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-lg">✅</span>
              <span className="font-semibold text-green-800">Đã có voucher riêng</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleEditClick} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Sửa">
                <Pencil size={16} />
              </button>
              <button onClick={handleDelete} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Xoá">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tên Voucher:</span>
              <span className="font-semibold text-gray-800">{existingVoucher.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mã voucher:</span>
              <span className="font-mono font-bold text-gray-800">{existingVoucher.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Giá trị:</span>
              <span className="font-bold text-green-700">
                {existingVoucher.type === 'PERCENT' ? `${existingVoucher.value}%` : existingVoucher.type === 'FREESHIP' ? 'Freeship' : fmtVND(existingVoucher.value)}
              </span>
            </div>
            {existingVoucher.type === 'PERCENT' && existingVoucher.maxDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Giảm tối đa:</span>
                <span className="text-gray-700">{fmtVND(existingVoucher.maxDiscount)}</span>
              </div>
            )}
            {existingVoucher.minOrderValue > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Đơn tối thiểu:</span>
                <span className="text-gray-700">{fmtVND(existingVoucher.minOrderValue)}</span>
              </div>
            )}
            {existingVoucher.durationDays > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Hạn dùng:</span>
                <span className="text-gray-700">{existingVoucher.durationDays} ngày</span>
              </div>
            )}
            {existingVoucher.perCustomerLimit > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Giới hạn dùng/user:</span>
                <span className="text-gray-700">{existingVoucher.perCustomerLimit} lần</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{isEditMode ? 'Sửa Voucher Đơn Hàng' : 'Voucher QR đơn hàng'}</h2>
      {!isEditMode && (
        <p className="text-sm text-gray-500 mb-4">
          Tạo voucher riêng cho đơn hàng này. Khi khách quét QR sẽ nhận được voucher này thay vì voucher mặc định.
        </p>
      )}

      <div className="space-y-4">


          <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên Voucher</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={`Voucher QR đơn #${orderCode}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loại giảm giá</label>
                  <Select
                    value={customType}
                    onChange={(val) => {
                      setCustomType(val);
                      if (val === 'STACK') setStackTiers([...defaultStackTiers]);
                    }}
                    className="w-full bg-white"
                    options={[
                      { value: 'FIXED_AMOUNT', label: 'Giảm tiền (VNĐ)' },
                      { value: 'PERCENT', label: 'Giảm phần trăm (%)' },
                      { value: 'FREESHIP', label: 'Miễn phí vận chuyển' },
                      { value: 'STACK', label: '📊 Stack (theo SP)' }
                    ]}
                  />
                </div>
                {customType !== 'FREESHIP' && customType !== 'STACK' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mức giảm</label>
                    <input
                      type="number"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      placeholder={customType === 'PERCENT' ? 'VD: 10' : 'VD: 50000'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Stack Tiers Editor */}
              {customType === 'STACK' && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-800">📊 Mốc giảm giá</h4>
                    <button
                      type="button"
                      className="text-xs font-medium text-amber-600 hover:text-amber-700 px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 transition-colors"
                      onClick={() => setStackTiers(prev => [...prev, { conditionType: 'products', minProducts: prev.length + 1, minAmount: 0, discount: 0, type: 'FIXED_AMOUNT', maxDiscount: 0 }])}
                    >
                      + Thêm mốc
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[120px_80px_1fr_80px_90px_24px] gap-2 text-[10px] font-semibold text-gray-500 px-0.5">
                      <span>ĐK</span>
                      <span>Mốc</span>
                      <span>Giảm</span>
                      <span>Loại</span>
                      <span>TĐ</span>
                      <span></span>
                    </div>
                    {stackTiers.map((tier, idx) => (
                      <div key={idx} className="grid grid-cols-[120px_80px_1fr_80px_90px_24px] gap-2 items-center">
                        <Select
                          size="xs"
                          className="w-full bg-white"
                          value={tier.conditionType || 'products'}
                          onChange={(val) => {
                            const updated = [...stackTiers];
                            updated[idx] = { ...updated[idx], conditionType: val };
                            setStackTiers(updated);
                          }}
                          options={[
                            { value: 'products', label: 'Số SP' },
                            { value: 'amount', label: 'Tiền' }
                          ]}
                        />
                        <input
                          type="number"
                          min={tier.conditionType === 'amount' ? 0 : 1}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-amber-500 focus:border-transparent bg-white"
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
                        />
                        <input
                          type="number"
                          min={0}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:border-transparent bg-white"
                          value={tier.discount}
                          onChange={e => {
                            const updated = [...stackTiers];
                            updated[idx] = { ...updated[idx], discount: parseFloat(e.target.value) || 0 };
                            setStackTiers(updated);
                          }}
                          placeholder={tier.type === 'PERCENT' ? '10' : '50000'}
                        />
                        <Select
                          size="xs"
                          className="w-full bg-white"
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
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400"
                          value={tier.maxDiscount || ''}
                          disabled={tier.type !== 'PERCENT'}
                          onChange={e => {
                            const updated = [...stackTiers];
                            updated[idx] = { ...updated[idx], maxDiscount: parseFloat(e.target.value) || 0 };
                            setStackTiers(updated);
                          }}
                          placeholder={tier.type === 'PERCENT' ? 'TĐ' : '-'}
                        />
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-600 transition-colors text-xs leading-none"
                          onClick={() => setStackTiers(prev => prev.filter((_, i) => i !== idx))}
                          disabled={stackTiers.length <= 1}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    💡 <strong>Số SP</strong> = SP khác nhau. <strong>Tiền</strong> = tổng đơn. <strong>TĐ</strong> = giảm tối đa (chỉ cho %).
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {customType === 'PERCENT' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Giảm tối đa (VNĐ)</label>
                    <input
                      type="number"
                      value={customMaxDiscount}
                      onChange={(e) => setCustomMaxDiscount(e.target.value)}
                      placeholder="Không giới hạn"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>
                )}
                <div className={customType !== 'PERCENT' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Đơn tối thiểu (VNĐ)</label>
                  <input
                    type="number"
                    value={customMinOrder}
                    onChange={(e) => setCustomMinOrder(e.target.value)}
                    placeholder="VD: 100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Số ngày hiệu lực</label>
                  <input
                    type="number"
                    value={customDurationDays}
                    onChange={(e) => setCustomDurationDays(e.target.value)}
                    placeholder="Không giới hạn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Giới hạn số lượng dùng / user</label>
                  <input
                    type="number"
                    value={customUsageLimit}
                    onChange={(e) => setCustomUsageLimit(e.target.value)}
                    placeholder="Không giới hạn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleCreateOrUpdate}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : isEditMode ? 'Lưu thay đổi' : 'Tạo Voucher Ngay'}
            </button>
            {isEditMode && (
              <button
                onClick={handleCancelForm}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
              >
                Hủy
              </button>
            )}
          </div>
        </div>
    </div>
  );
}

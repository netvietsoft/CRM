'use client';

import React, { useState } from 'react';
import { useOrderSave } from '@/components/admin/OrderSaveProvider';
import { apiClientClient } from '@/lib/apiClientClient';

function fmt(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
}

function NumberInput({ value, onChange, placeholder = '0' }: { value: number; onChange: (val: number) => void; placeholder?: string }) {
  const { setHasChanges } = useOrderSave();
  const [str, setStr] = useState(value ? new Intl.NumberFormat('vi-VN').format(value) : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setStr('');
      onChange(0);
      setHasChanges(true);
      return;
    }
    const num = parseInt(raw, 10);
    setStr(new Intl.NumberFormat('vi-VN').format(num));
    onChange(num);
    setHasChanges(true);
  };

  return (
    <input
      type="text"
      value={str}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-32 bg-white border border-gray-200 rounded px-3 py-1.5 text-right font-mono text-sm text-black focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
    />
  );
}

interface OrderPaymentClientProps {
  order: any;
  metadata: any;
  isPancake: boolean;
}

export default function OrderPaymentClient({ order, metadata, isPancake }: OrderPaymentClientProps) {
  const { setHasChanges, registerSaveAction } = useOrderSave();
  
  const payment = metadata?.payment || {};
  const financial = metadata?.financial || {};

  const [shippingFee, setShippingFee] = useState(order.shippingFee || 0);
  const [discountAmount, setDiscountAmount] = useState(order.discountAmount || 0);
  const [transferMoney, setTransferMoney] = useState(isPancake ? (payment.transferMoney || 0) : 0);
  const [surcharge, setSurcharge] = useState(isPancake ? (financial.surcharge || 0) : 0);
  const [points, setPoints] = useState(payment.prepaidByPoint?.point || 0);

  const subtotal = order.subtotal || 0;
  const sauGiamGia = Math.max(0, subtotal - discountAmount);
  const tienCanThu = sauGiamGia + shippingFee + surcharge;

  // Other non-editable payment methods
  const cash = payment.cash || 0;
  const momo = payment.chargedByMomo || 0;
  const vnpay = payment.chargedByVnpay || 0;
  const card = payment.chargedByCard || 0;
  const qrpay = payment.chargedByQrpay || 0;
  const fundiin = payment.chargedByFundiin || 0;
  const kredivo = payment.chargedByKredivo || 0;

  // Total paid = transfer + others
  // Note: we don't include COD here because COD is money to be collected, not already paid.
  const daThanhToan = transferMoney + cash + momo + vnpay + card + qrpay + fundiin + kredivo;

  const conThieu = Math.max(0, tienCanThu - daThanhToan);

  // Register save action
  React.useEffect(() => {
    registerSaveAction('payment', async () => {
      await apiClientClient.patch(`/orders/${order.id}/admin-update`, {
        shippingFee,
        discountAmount,
        surcharge,
        transferMoney,
        points,
      });
    });
  }, [shippingFee, discountAmount, surcharge, transferMoney, points, order.id]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-5">Thanh toán</h2>

      {/* Checkboxes row */}
      {isPancake && (
        <div className="flex items-center gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
            <input
              type="checkbox"
              checked={shippingFee === 0}
              onChange={(e) => {
                if (e.target.checked) setShippingFee(0);
              }}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
            Miễn phí giao hàng
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
            Chỉ thu phí nếu hoàn
          </label>
        </div>
      )}

      {/* Total weight */}
      {isPancake && (
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-800">
            Tổng khối lượng đơn hàng:{' '}
            {(() => {
              const items = metadata?.items || [];
              const totalWeight = items.reduce(
                (sum: number, item: any) => sum + (item.weight || 0) * (item.quantity || 1),
                0
              );
              return totalWeight > 0 ? `${new Intl.NumberFormat('vi-VN').format(totalWeight)} (g)` : '—';
            })()}
          </p>
        </div>
      )}

      {/* Editable Line Items */}
      <div className="space-y-0 divide-y divide-gray-100">
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-black font-medium">Phí vận chuyển</span>
          <div className="flex items-center gap-2">
            <NumberInput value={shippingFee} onChange={setShippingFee} />
            <span className="text-sm text-black w-3">đ</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-black font-medium">Giảm giá đơn hàng</span>
          <div className="flex items-center gap-2">
            <NumberInput value={discountAmount} onChange={setDiscountAmount} />
            <span className="text-sm text-black w-3">đ</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-black font-medium">Tiền chuyển khoản</span>
          <div className="flex items-center gap-2">
            <NumberInput value={transferMoney} onChange={setTransferMoney} />
            <span className="text-sm text-black w-3">đ</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-black font-medium">Phụ thu</span>
          <div className="flex items-center gap-2">
            <NumberInput value={surcharge} onChange={setSurcharge} />
            <span className="text-sm text-black w-3">đ</span>
          </div>
        </div>

        {isPancake && (
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-black font-medium">Điểm thưởng</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={points || ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setPoints(parseInt(raw, 10) || 0);
                  setHasChanges(true);
                }}
                placeholder="0"
                className="w-32 bg-white border border-gray-200 rounded px-3 py-1.5 text-right font-mono text-sm text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
              />
              <span className="text-sm text-black w-3"></span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Box */}
      <div className="mt-5 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Tổng số tiền</span>
          <span className="text-sm font-bold text-gray-900">{fmt(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Giảm giá</span>
          <span className={`text-sm font-semibold ${discountAmount > 0 ? 'text-gray-400 italic' : 'text-gray-400 italic'}`}>
            {discountAmount > 0 ? `-${fmt(discountAmount)}` : `0 đ`}
          </span>
        </div>

        <div className="flex items-center justify-between pb-3 border-b border-gray-200 border-dashed">
          <span className="text-sm text-gray-700">Sau giảm giá</span>
          <span className="text-sm font-bold text-gray-900">{fmt(sauGiamGia)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 font-medium">Tiền cần thu</span>
          <span className="text-sm font-bold text-blue-600">{fmt(tienCanThu)}</span>
        </div>

        <div className="flex items-center justify-between pb-3 border-b border-gray-200 border-dashed">
          <span className="text-sm text-gray-700">Đã thanh toán</span>
          <span className={`text-sm font-semibold ${daThanhToan > 0 ? 'text-green-600' : 'text-gray-400 italic'}`}>
            {daThanhToan > 0 ? fmt(daThanhToan) : `0 đ`}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-gray-700 font-medium">Còn thiếu</span>
          <span className={`text-sm font-bold ${conThieu > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {fmt(conThieu)}
          </span>
        </div>
      </div>
    </div>
  );
}

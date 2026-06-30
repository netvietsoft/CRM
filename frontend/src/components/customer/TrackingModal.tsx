'use client';

import Image from '@/components/ui/AppImage';
import { useState } from 'react';
import { X, Package, Search, Phone, ArrowLeft } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import { passthroughImageLoader } from '@/lib/imageLoader';
import { formatVnd } from '@/lib/format';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CourierUpdate {
  status?: string | null;
  key?: string | null;
  note?: string | null;
  address?: string | null;
  location?: string | null;
  update_at?: string | Date | null;
  update_time?: string | Date | null;
  time?: string | Date | null;
}

interface TrackingDetails {
  trackingCode?: string | null;
  deliveryName?: string | null;
  deliveryPhone?: string | null;
  totalFee?: number | null;
  courierUpdates?: CourierUpdate[] | null;
}

interface TrackingOrderItem {
  name: string;
  image?: string | null;
  quantity: number;
  price?: number | null;
  size?: string | null;
  color?: string | null;
  isGift?: boolean;
}

interface TrackingOrderResponse {
  orderCode: string;
  status: string;
  createdAt: string;
  subtotal: number;
  discountAmount?: number;
  voucherDiscountAmount?: number;
  shippingFee?: number;
  totalAmount: number;
  items: TrackingOrderItem[];
  tracking?: TrackingDetails | null;
}

const statusMap: Record<string, { label: string; cls: string; step: number }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'bg-orange-100 text-orange-700', step: 0 },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-cyan-100 text-cyan-700', step: 1 },
  WAITING_FOR_GOODS: { label: 'Chờ hàng', cls: 'bg-yellow-100 text-yellow-700', step: 1 },
  PACKAGING: { label: 'Đang đóng gói', cls: 'bg-purple-100 text-purple-700', step: 2 },
  WAITING_FOR_SHIPPING: { label: 'Chờ vận chuyển', cls: 'bg-indigo-100 text-indigo-700', step: 2 },
  SHIPPED: { label: 'Đang giao hàng', cls: 'bg-blue-100 text-blue-700', step: 3 },
  DELIVERED: { label: 'Đã nhận hàng', cls: 'bg-teal-100 text-teal-700', step: 4 },
  PAYMENT_COLLECTED: { label: 'Đã thu tiền', cls: 'bg-emerald-100 text-emerald-700', step: 4 },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-green-100 text-green-700', step: 5 },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700', step: -1 },
  REFUNDED: { label: 'Hoàn trả', cls: 'bg-red-100 text-red-700', step: -1 },
  RETURNING: { label: 'Đang hoàn', cls: 'bg-amber-100 text-amber-700', step: -1 },
  EXCHANGING: { label: 'Đang đổi', cls: 'bg-amber-100 text-amber-700', step: -1 },
};

const progressSteps = ['Đặt hàng', 'Xác nhận', 'Đóng gói', 'Vận chuyển', 'Nhận hàng', 'Hoàn thành'];

function fmt(amount: number) {
  return formatVnd(amount);
}

function fmtDate(d: string | Date) {
  if (!d) return '—';
  const date = new Date(d);
  
  if (isNaN(date.getTime()) && typeof d === 'string') {
    const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/) ||
                  d.match(/^(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) return d;
    return d;
  }

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(date);
  } catch {
    return String(d);
  }
}

export default function TrackingModal({ isOpen, onClose }: TrackingModalProps) {
  const [trackingCode, setTrackingCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackingData, setTrackingData] = useState<TrackingOrderResponse | null>(null);

  if (!isOpen) return null;

  const handleTrack = async () => {
    if (!trackingCode.trim() || !phoneNumber.trim()) {
      setError('Vui lòng nhập đầy đủ mã đơn và số điện thoại');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const response = await apiClientClient.get<TrackingOrderResponse>(`/orders/public/track`, {
        params: {
          code: trackingCode.trim(),
          phone: phoneNumber.trim()
        }
      });
      setTrackingData(response);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không tìm thấy thông tin đơn hàng');
      setTrackingData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTrack();
    }
  };

  const resetAndClose = () => {
    setTrackingCode('');
    setPhoneNumber('');
    setError('');
    setTrackingData(null);
    onClose();
  };

  const st = trackingData ? (statusMap[trackingData.status] || { label: trackingData.status, cls: 'bg-gray-100 text-gray-700', step: 0 }) : null;
  const tracking = trackingData?.tracking ?? null;
  const courierUpdates = tracking?.courierUpdates ?? [];
  const voucherDiscountAmount = Number(trackingData?.voucherDiscountAmount) || 0;
  const totalDiscountAmount = Number(trackingData?.discountAmount) || 0;
  const otherDiscountAmount = Math.max(0, totalDiscountAmount - voucherDiscountAmount);
  const shippingFee =
    (Number(trackingData?.shippingFee) || 0) > 0
      ? Number(trackingData?.shippingFee) || 0
      : Number(tracking?.totalFee) || 0;
  const items = trackingData?.items ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {trackingData ? (
              <button 
                onClick={() => setTrackingData(null)}
                className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            ) : (
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-800">Tra cứu vận chuyển</h2>
          </div>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {!trackingData ? (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mã đơn hàng / Mã vận đơn <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Package className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="VD: HD123456 hoặc VTP123..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Số điện thoại đặt hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập số điện thoại..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Để bảo mật, vui lòng nhập chính xác số điện thoại đặt hàng.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={resetAndClose}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleTrack}
                  disabled={!trackingCode.trim() || !phoneNumber.trim() || isLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {isLoading ? 'Đang tra cứu...' : 'Tra cứu'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Đơn #{trackingData.orderCode}</h3>
                  <p className="text-sm text-gray-500">{fmtDate(trackingData.createdAt)}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${st?.cls}`}>
                  {st?.label}
                </span>
              </div>

              {/* Progress Bar */}
              {st && st.step >= 0 && (
                <div className="py-2">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 z-0" />
                    <div
                      className="absolute top-3 left-0 h-0.5 bg-green-500 z-0 transition-all duration-500"
                      style={{ width: `${Math.min(100, (st.step / (progressSteps.length - 1)) * 100)}%` }}
                    />
                    {progressSteps.map((label, i) => (
                      <div key={label} className="flex flex-col items-center relative z-10 gap-1">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                            i <= st.step
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'bg-white border-gray-300 text-gray-400'
                          }`}
                        >
                          {i <= st.step ? '✓' : i + 1}
                        </div>
                        <span className={`text-[10px] hidden sm:block ${i <= st.step ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {items.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-800">Sản phẩm ({items.length})</h4>
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex gap-3 rounded-lg bg-white p-3">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                          {item.image ? (
                            <Image
                              loader={passthroughImageLoader}
                              unoptimized
                              src={item.image}
                              alt={item.name}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg text-gray-400">📦</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                          <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span>SL: {item.quantity}</span>
                            {item.size && <span>Size: {item.size}</span>}
                            {item.color && <span>Màu: {item.color}</span>}
                            {item.price ? <span>Giá: {fmt(item.price)}</span> : null}
                          </div>
                          {item.isGift && (
                            <span className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Quà tặng
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Details */}
              {tracking && tracking.trackingCode && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Chi tiết vận chuyển</h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Mã vận đơn</p>
                      <p className="font-mono font-bold text-gray-800">{tracking.trackingCode}</p>
                    </div>
                    {tracking.deliveryName && (
                      <div>
                        <p className="text-xs text-gray-500">Shipper</p>
                        <p className="font-medium text-gray-800">{tracking.deliveryName}</p>
                      </div>
                    )}
                    {tracking.deliveryPhone && (
                      <div>
                        <p className="text-xs text-gray-500">SĐT Shipper</p>
                        <p className="font-medium text-gray-800">{tracking.deliveryPhone}</p>
                      </div>
                    )}
                  </div>

                  {/* Courier Updates Timeline */}
                  {courierUpdates.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h5 className="font-semibold text-gray-700 text-xs mb-4 uppercase tracking-wider">Lịch sử vận chuyển</h5>
                      <div className="relative pl-6 max-h-64 overflow-y-auto pr-2">
                        {/* Vertical line */}
                        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />
                        <div className="space-y-4">
                          {courierUpdates.map((update, idx: number) => {
                            const updatedAt = update.update_at ?? update.update_time ?? update.time ?? null;

                            return (
                            <div key={idx} className="relative">
                              {/* Dot */}
                              <div className={`absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center z-10 ${
                                idx === 0 
                                  ? 'bg-blue-500 border-blue-500' 
                                  : 'bg-white border-gray-300'
                              }`}>
                                {idx === 0 && (
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                )}
                              </div>
                              {/* Content */}
                              <div className="ml-2 pb-1">
                                <p className={`text-sm ${idx === 0 ? 'text-black' : 'text-black'}`}>
                                  <span className='font-semibold text-sm text-black'>Trạng thái VC:</span> {update.status || update.key || 'Cập nhật'}
                                </p>
                                {update.note && (
                                  <p className="text-xs text-black mt-0.5"><span className='font-semibold text-xs text-black'>Ghi chú: </span>{update.note}</p>
                                )}
                                {update.address && (
                                  <p className="text-xs text-black mt-0.5"><span className='font-semibold text-xs text-black'>Địa chỉ: </span>{update.address}</p>
                                )}
                                {update.location && (
                                  <p className="text-xs text-black mt-0.5">Vị trí: {update.location}</p>
                                )}
                                {updatedAt && (
                                  <p className="text-xs text-black mt-1"><span className='font-semibold text-xs text-black'>Cập nhật gần nhất:</span> {fmtDate(updatedAt)}</p>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Summary */}
              <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                <h4 className="mb-3 font-semibold text-blue-950">Thông tin thanh toán</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Tiền hàng:</span>
                    <span>{fmt(trackingData.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-green-700">
                    <span>Giảm giá voucher:</span>
                    <span className="font-semibold">
                      {voucherDiscountAmount > 0 ? `-${fmt(voucherDiscountAmount)}` : fmt(0)}
                    </span>
                  </div>
                  {otherDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-green-700">
                      <span>Giảm trừ khác:</span>
                      <span className="font-semibold">-{fmt(otherDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Phí ship:</span>
                    <span>{fmt(shippingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-blue-100 pt-2 text-base font-bold">
                    <span>Tổng thanh toán:</span>
                    <span>{fmt(trackingData.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, CreditCard, Ticket, CheckCircle2, Loader2, X } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import VietQRPaymentClient from './vietqr/VietQRPaymentClient';
import Select from '@/components/ui/Select';

interface AddressOption {
  code: string;
  name: string;
}

interface Voucher {
  id: string;
  code: string;
  name: string;
  type: 'FIXED_AMOUNT' | 'PERCENT' | 'FREESHIP' | 'STACK';
  value: number;
  maxDiscount?: number;
  minOrderValue: number;
  stackTiers?: Array<{
    conditionType?: string;
    minProducts?: number;
    minAmount?: number;
    discount: number;
    type?: string;
    maxDiscount?: number;
  }>;
}

interface OrderItem {
  cartItemId?: string;
  product: any;
  quantity: number;
  size: string | null;
  color: string | null;
  price: number;
}

interface CheckoutClientProps {
  user: any;
  items: OrderItem[];
  store: { id: string; name: string; addressStreet?: string | null; addressWard?: string | null; addressProvince?: string | null } | null;
  cartMode: boolean;
}

export default function CheckoutClient({ user, items, store, cartMode }: CheckoutClientProps) {
  const router = useRouter();

  // Form State
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [street, setStreet] = useState(user.addressStreet || '');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [note, setNote] = useState('');

  // Address Dropdown states
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);
  const [province, setProvince] = useState(user.addressProvince || '');
  const [ward, setWard] = useState(user.addressWard || '');

  // Vouchers and Points
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
  const [useCommissionPoints, setUseCommissionPoints] = useState(false);
  const [commissionPointsInput, setCommissionPointsInput] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showVietQRModal, setShowVietQRModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [importingAddress, setImportingAddress] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalWeight = items.reduce((sum, item) => sum + item.quantity * (item.product.weight || 500), 0);
  const distinctProductCount = new Set(items.map(item => item.product.id)).size;

  const normalizeName = useCallback((name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/^(tỉnh|thành phố|thành\s*phố|quận|huyện|phường|xã|thị trấn|thị\s*trấn)\s+/i, '')
      .replace(/\s+/g, ' ');
  }, []);

  const findAddressOption = useCallback((options: AddressOption[], value: string) => {
    const normalizedValue = normalizeName(value);
    return options.find(option => {
      const normalizedOption = normalizeName(option.name);
      return normalizedOption === normalizedValue || normalizedOption.includes(normalizedValue) || normalizedValue.includes(normalizedOption);
    });
  }, [normalizeName]);

  const loadProvinces = useCallback(async () => {
    const res = await fetch('/internal-api/address?type=provinces');
    if (!res.ok) throw new Error('Failed to load provinces');
    const data = await res.json();
    return data as AddressOption[];
  }, []);

  useEffect(() => {
    loadProvinces().then(setProvinces).catch(console.error);
  }, [loadProvinces]);

  const loadWards = useCallback(async (provinceName: string, provinceOptions = provinces) => {
    if (!provinceName) return null;
    const p = findAddressOption(provinceOptions, provinceName);
    if (!p) return null;
    const res = await fetch(`/internal-api/address?type=wards&provinceCode=${p.code}`);
    if (!res.ok) throw new Error('Failed to load wards');
    const data = await res.json();
    return { province: p, wards: data as AddressOption[] };
  }, [findAddressOption, provinces]);

  useEffect(() => {
    if (provinces.length && province && !wards.length) {
      loadWards(province)
        .then(result => {
          if (!result) return;
          setWards(result.wards);
          setProvince(result.province.name);
        })
        .catch(() => { });
    }
  }, [provinces, province, loadWards, wards.length]);

  // Calculate shipping fee
  useEffect(() => {
    if (!province || !ward || !street || street.length < 5) {
      setShippingFee(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculatingFee(true);
      try {
        const data = await apiClientClient.post<any>('/orders/shipping-fee', {
          province,
          ward,
          street,
          totalWeight,
          storeId: store?.id
        });
        if (data && data.fee !== undefined) {
          setShippingFee(data.fee);
        } else {
          setShippingFee(30000);
        }
      } catch {
        setShippingFee(30000);
      } finally {
        setIsCalculatingFee(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [province, ward, street, totalWeight, store?.id]);

  const handleImportSavedAddress = async () => {
    setImportingAddress(true);
    try {
      const nextProvince = user.addressProvince || '';
      const nextWard = user.addressWard || '';
      const provinceOptions = provinces.length ? provinces : await loadProvinces();
      if (!provinces.length) setProvinces(provinceOptions);
      const provinceOption = nextProvince ? findAddressOption(provinceOptions, nextProvince) : null;

      setName(user.name || '');
      setPhone(user.phone || '');
      setProvince(provinceOption?.name || nextProvince);
      setStreet(user.addressStreet || '');

      if (provinceOption) {
        const result = await loadWards(provinceOption.name, provinceOptions);
        const wardOptions = result?.wards || [];
        setWards(wardOptions);
        const wardOption = nextWard ? findAddressOption(wardOptions, nextWard) : null;
        setWard(wardOption?.name || nextWard);
      } else {
        setWards([]);
        setWard(nextWard);
      }
    } finally {
      window.setTimeout(() => setImportingAddress(false), 250);
    }
  };

  const getMatchedStackTier = useCallback((voucher: Voucher) => {
    if (voucher.type !== 'STACK' || !voucher.stackTiers || voucher.stackTiers.length === 0) {
      return null;
    }

    const sortedTiers = [...voucher.stackTiers].sort((a, b) => {
      const aVal = a.conditionType === 'amount' ? (a.minAmount || 0) : (a.minProducts || 0);
      const bVal = b.conditionType === 'amount' ? (b.minAmount || 0) : (b.minProducts || 0);
      return bVal - aVal;
    });

    return sortedTiers.find(t => {
      if (t.conditionType === 'amount') {
        return subtotal >= (t.minAmount || 0);
      }
      return distinctProductCount >= (t.minProducts || 0);
    }) || null;
  }, [distinctProductCount, subtotal]);

  const isVoucherApplicable = useCallback((voucher: Voucher) => {
    if (subtotal < voucher.minOrderValue) return false;
    if (voucher.type === 'STACK') return Boolean(getMatchedStackTier(voucher));
    return true;
  }, [getMatchedStackTier, subtotal]);

  useEffect(() => {
    // Lấy storeId trực tiếp từ sản phẩm trong giỏ hàng để đảm bảo chính xác tuyệt đối
    const cartStoreId = items?.[0]?.product?.storeId || items?.[0]?.product?.store?.id || store?.id;

    Promise.all([
      apiClientClient.get<any[]>('/vouchers/user/my-vouchers'),
      apiClientClient.get<Voucher[]>('/vouchers', { params: cartStoreId ? { storeId: cartStoreId } : undefined }),
    ])
      .then(([userVoucherData, systemVoucherData]) => {
        const voucherMap = new Map<string, Voucher>();

        if (Array.isArray(userVoucherData)) {
          userVoucherData
            .filter((uv: any) => !uv.isUsed && uv.voucher && uv.status === 'ACTIVE')
            .filter((uv: any) => {
              // Only show vouchers that match current store or have no store (system-wide)
              const voucherStoreId = uv.voucher?.store?.id || uv.voucher?.storeId || null;
              if (!voucherStoreId) return true; // System-wide voucher
              return voucherStoreId === cartStoreId; // Must match order store
            })
            .forEach((uv: any) => {
              if (uv.expiresAt && new Date(uv.expiresAt) <= new Date()) return;
              voucherMap.set(uv.voucher.id, {
                id: uv.voucher.id,
                code: uv.voucher.code,
                name: uv.voucher.name,
                type: uv.voucher.type,
                value: uv.voucher.value,
                maxDiscount: uv.voucher.maxDiscount,
                minOrderValue: uv.voucher.minOrderValue,
                stackTiers: uv.voucher.stackTiers,
              });
            });
        }

        if (Array.isArray(systemVoucherData)) {
          systemVoucherData.forEach(v => {
            voucherMap.set(v.id, v);
          });
        }

        setVouchers(Array.from(voucherMap.values()));
      })
      .catch(console.error);
  }, [store?.id]);

  useEffect(() => {
    if (selectedVoucherIds.length > 0) {
      setSelectedVoucherIds(prev => prev.filter(id => {
        const v = vouchers.find(vv => vv.id === id);
        return v && isVoucherApplicable(v);
      }));
    }
  }, [vouchers, isVoucherApplicable]);

  // Calc Discounts - sum all selected vouchers
  let voucherDiscount = 0;
  for (const vid of selectedVoucherIds) {
    const sel = vouchers.find(v => v.id === vid);
    if (!sel) continue;
    let thisDiscount = 0;
    if (sel.type === 'STACK' && sel.stackTiers && sel.stackTiers.length > 0) {
      const matchedTier = getMatchedStackTier(sel);
      if (matchedTier) {
        if (matchedTier.type === 'PERCENT') {
          thisDiscount = subtotal * (matchedTier.discount / 100);
          if (matchedTier.maxDiscount && thisDiscount > matchedTier.maxDiscount) {
            thisDiscount = matchedTier.maxDiscount;
          }
        } else {
          thisDiscount = matchedTier.discount;
        }
      }
    } else {
      thisDiscount = sel.type === 'PERCENT' ? subtotal * (sel.value / 100) : sel.value;
      if (sel.maxDiscount && thisDiscount > sel.maxDiscount) thisDiscount = sel.maxDiscount;
    }
    voucherDiscount += thisDiscount;
  }

  let finalAmount = subtotal + shippingFee - voucherDiscount;
  if (finalAmount < 0) finalAmount = 0;

  const maxPointsApplicable = Math.min(user.commissionBalance || 0, finalAmount);
  const requestedPoints = parseInt(commissionPointsInput) || 0;
  const pointDiscount = Math.min(requestedPoints, maxPointsApplicable);
  finalAmount -= pointDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !province || !ward || !street) {
      alert('Vui lòng điền đầy đủ thông tin giao hàng');
      return;
    }

    setLoading(true);
    try {
      const data = await apiClientClient.post<any>('/orders', {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
        cartItemIds: cartMode ? items.map(i => i.cartItemId).filter(Boolean) : undefined,
        paymentMethod,
        name, phone, note,
        addressStreet: street,
        addressWard: ward,
        addressProvince: province,
        shippingFee,
        voucherIds: selectedVoucherIds.length > 0 ? selectedVoucherIds : undefined,
        useCommissionPoints: pointDiscount > 0,
        appliedCommissionPoints: pointDiscount,
      });

      // alert('Đặt hàng thành công!');
      if (paymentMethod === 'VIETQR' && data.vietqr) {
        localStorage.setItem(`vietqr_${data.orderId}`, JSON.stringify(data.vietqr));
        setCreatedOrderId(data.orderId);
        setShowVietQRModal(true);
      } else {
        router.push(`/portal/checkout/success?orderId=${data.orderId}`);
      }
    } catch (error: any) {
      alert(error.message || 'Lỗi đặt hàng');
    } finally {
      setLoading(false);
    }
  };

  function formatPrice(val: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT COLUMN */}
      <div className="lg:col-span-2 space-y-6">
        {/* Address Card */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="text-blue-600" /> Thông tin giao hàng
            </h2>
            <button
              type="button"
              onClick={handleImportSavedAddress}
              disabled={importingAddress}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 disabled:opacity-70 disabled:cursor-wait inline-flex items-center justify-center gap-2 min-w-[210px]"
            >
              {importingAddress ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="h-4 w-32 rounded bg-indigo-200/80 animate-pulse" aria-label="Dang ap dung dia chi" />
                </>
              ) : (
                'Sử dụng địa chỉ mặc định'
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg focus:ring-indigo-500 px-4 py-2.5 outline-none" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
              <input type="tel" className="w-full border border-gray-300 rounded-lg focus:ring-indigo-500 px-4 py-2.5 outline-none" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố *</label>
                <Select value={province} onChange={async nextProvince => {
                  setProvince(nextProvince);
                  setWard('');
                  setWards([]);
                  try {
                    const result = await loadWards(nextProvince);
                    if (result) setWards(result.wards);
                  } catch { }
                }} size="md" placeholder="Chọn Tỉnh/Thành" options={[
                  { value: '', label: 'Chọn Tỉnh/Thành' },
                  ...provinces.map(p => ({ value: p.name, label: p.name })),
                ]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã *</label>
                <Select value={ward} onChange={setWard} disabled={!province} size="md" placeholder="Chọn Phường/Xã" options={[
                  { value: '', label: 'Chọn Phường/Xã' },
                  ...wards.map(w => ({ value: w.name, label: w.name })),
                ]} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số nhà, Tên đường *</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg focus:ring-indigo-500 px-4 py-2.5 outline-none" placeholder="Số nhà, đường phố..." value={street} onChange={e => setStreet(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú đơn hàng (tùy chọn)</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg focus:ring-indigo-500 px-4 py-2.5 outline-none resize-none"
                placeholder="Ví dụ: Giao hàng giờ hành chính, gọi trước 15 phút..."
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1 text-right">{note.length}/500 ký tự</div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN */}
      <div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-4">Thông tin đơn hàng ({items.length} sản phẩm)</h2>

          {/* Items list */}
          <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.product.imageUrl ? <img src={item.product.imageUrl} className="w-full h-full object-cover" /> : <span className="text-xl mt-3 block text-center">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2">{item.product.name}</h3>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.size && <span>Size: {item.size} </span>}
                    {item.color && <span>&bull; Màu: {item.color}</span>}
                  </div>
                  <div className="text-sm font-bold text-gray-900 mt-1 flex justify-between">
                    <span>{formatPrice(item.price)}</span>
                    <span>x{item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="py-4 space-y-6 border-b border-gray-100">
            {/* Payment Methods */}
            <div>
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CreditCard className="w-5 h-5 text-indigo-600" /> Phương thức thanh toán
                </label>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="text-indigo-600 font-bold hover:underline text-sm border-0 bg-transparent p-0"
                >
                  {paymentMethod === 'COD' ? 'COD' : 'VietQR'}
                </button>
              </div>
            </div>

            {/* Vouchers */}
            <div className='pb-3 border-b border-gray-100'>
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Ticket className="w-5 h-5 text-indigo-600" /> Mã giảm giá
                </label>
                <div className="flex items-center gap-3">
                  {selectedVoucherIds.length > 0 && (
                    <button type="button" onClick={() => setSelectedVoucherIds([])} className="text-xs text-rose-500 font-medium hover:underline border-0 bg-transparent p-0">Bỏ chọn</button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowVoucherModal(true)}
                    className="text-indigo-600 font-bold hover:underline text-sm border-0 bg-transparent p-0"
                  >
                    {selectedVoucherIds.length > 0 ? `${selectedVoucherIds.length} mã đã chọn` : 'Chọn mã'}
                  </button>
                </div>
              </div>
              {selectedVoucherIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedVoucherIds.map(id => {
                    const v = vouchers.find(vv => vv.id === id);
                    return v ? (
                      <span key={id} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200">
                        {v.code}
                        <button type="button" onClick={() => setSelectedVoucherIds(prev => prev.filter(x => x !== id))} className="text-sky-400 hover:text-sky-600 ml-0.5 border-0 bg-transparent p-0 leading-none">&times;</button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Points */}
            <div className={`rounded-xl transition-all`}>
              <div className="flex justify-between items-center mb-1 gap-1">
                <div>
                  <div className="font-medium text-gray-800 text-sm">Điểm giảm giá</div>
                </div>
                <div className="text-xs text-gray-500">Tối đa {formatPrice(maxPointsApplicable)}</div>
              </div>
              <div className="w-full mt-2">
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded px-1 py-1.5 outline-none text-right bg-white"
                  placeholder="0"
                  value={commissionPointsInput}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val)) {
                      setCommissionPointsInput(e.target.value === '' ? '' : '0');
                      return;
                    }
                    if (val < 0) val = 0;
                    if (val > maxPointsApplicable) val = maxPointsApplicable;
                    setCommissionPointsInput(val.toString());
                  }}
                  disabled={maxPointsApplicable <= 0}
                  max={maxPointsApplicable}
                  min={0}
                />
              </div>
              {pointDiscount > 0 && (
                <div className="text-xs font-semibold text-orange-600 mt-2">✅ Đã áp dụng giảm {formatPrice(pointDiscount)}</div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="pt-4 space-y-2 text-sm font-medium">
            <div className="flex justify-between text-gray-600"><span>Tạm tính</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center">
                Phí vận chuyển
                {isCalculatingFee && (
                  <svg className="animate-spin ml-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </span>
              <span>{shippingFee > 0 ? `+${formatPrice(shippingFee)}` : (isCalculatingFee ? 'Đang tính...' : '0 đ')}</span>
            </div>
            {voucherDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Giảm giá Voucher</span><span>-{formatPrice(voucherDiscount)}</span></div>}
            {pointDiscount > 0 && <div className="flex justify-between text-orange-600"><span>Dùng Hoa hồng</span><span>-{formatPrice(pointDiscount)}</span></div>}
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-3 mt-3 border-t border-gray-100">
              <span>Tổng cộng</span>
              <span className="text-indigo-600">{formatPrice(finalAmount)}</span>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading} className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {loading ? 'Đang xử lý...' : 'ĐẶT HÀNG NGAY'}
          </button>
        </div>
      </div>
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">Phương thức thanh toán</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => { setPaymentMethod('COD'); setShowPaymentModal(false); }} className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                <span className="ml-3 font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</span>
              </label>
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'VIETQR' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="payment" value="VIETQR" checked={paymentMethod === 'VIETQR'} onChange={() => { setPaymentMethod('VIETQR'); setShowPaymentModal(false); }} className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                <span className="ml-3 font-medium text-gray-900">Chuyển khoản VietQR</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-gray-900">Chọn mã giảm giá</h3>
              <button onClick={() => setShowVoucherModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {vouchers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Không có mã giảm giá nào</div>
              ) : (
                vouchers.map(v => {
                  const isEligible = isVoucherApplicable(v);
                  const isSelected = selectedVoucherIds.includes(v.id);

                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        if (!isEligible) return;
                        setSelectedVoucherIds(prev =>
                          isSelected ? prev.filter(x => x !== v.id) : [...prev, v.id]
                        );
                      }}
                      className={`relative p-4 rounded-xl border transition-all ${!isEligible
                        ? 'bg-gray-50 opacity-70 border-gray-200 cursor-not-allowed'
                        : isSelected
                          ? 'bg-sky-50 border-sky-200 cursor-pointer shadow-sm'
                          : 'bg-white border-gray-200 cursor-pointer hover:border-indigo-300 shadow-sm hover:shadow'
                        }`}
                    >
                      <div className="pr-8">
                        <div className="font-bold text-sm bg-sky-500 text-white inline-block px-2 py-0.5 rounded text-[10px] mb-2 uppercase tracking-wide">{v.code}</div>
                        <div className="text-base font-bold text-gray-900 mb-1">
                          {v.type === 'STACK' ? (
                            (() => {
                              if (v.stackTiers && v.stackTiers.length > 0) {
                                const maxTier = v.stackTiers.reduce((max, t) => t.discount > max.discount ? t : max, v.stackTiers[0]);
                                return `Giảm tầng đến ${maxTier.type === 'PERCENT' ? `${maxTier.discount}%` : formatPrice(maxTier.discount)}`;
                              }
                              return 'Giảm giá theo tầng';
                            })()
                          ) : (
                            `Giảm ${v.type === 'PERCENT' ? `${v.value}%` : formatPrice(v.value)}`
                          )}
                        </div>
                        {v.type === 'STACK' && v.stackTiers && v.stackTiers[0] && (
                          <div className="text-xs text-gray-500 mt-1">
                            Áp dụng theo {v.stackTiers[0].conditionType === 'amount' ? 'giá trị đơn' : 'số SP khác nhau'}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">Đơn tối thiểu: {formatPrice(v.minOrderValue)}</div>
                        {v.type !== 'STACK' && v.maxDiscount && <div className="text-xs text-gray-500">Giảm tối đa: {formatPrice(v.maxDiscount)}</div>}
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-6 h-6 text-green-500 absolute right-4 top-1/2 -translate-y-1/2" />
                      )}
                      {!isEligible && (
                        <div className="absolute right-4 bottom-3 text-[10px] font-semibold text-rose-500 uppercase tracking-wider bg-white px-1.5 py-0.5 rounded">
                          Không đủ điều kiện
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VietQR Modal */}
      {showVietQRModal && createdOrderId && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex justify-end p-2 border-b border-gray-100 shrink-0">
              <button onClick={() => router.push(`/portal/checkout/success?orderId=${createdOrderId}`)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <VietQRPaymentClient orderId={createdOrderId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

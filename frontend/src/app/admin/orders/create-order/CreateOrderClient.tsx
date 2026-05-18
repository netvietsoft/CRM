'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, X, Monitor, Scan, ShoppingCart, Check, ChevronDown, DownloadCloud, MapPin, Plus, Save } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface ProductVariant {
  id: string;
  price: number | null;
  stock: number;
  size?: { name: string } | null;
  color?: { name: string } | null;
}

interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  variants: ProductVariant[];
}

interface AddressOption {
  code: string;
  name: string;
}

interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  addressStreet?: string | null;
  addressWard?: string | null;
  addressProvince?: string | null;
}

interface OrderItem {
  productId: string;
  quantity: number;
  size: string | null;
  color: string | null;
  product: Product;
}

const REASON_GROUPS: { label: string; options?: string[] }[] = [
  {
    label: 'Do người nhận',
    options: [
      'Không liên lạc được / Thuê bao / Người nhận thuê bao',
      'Sai sản phẩm / Sai COD / Giao chậm / Đơn ảo / Đổi ý / Hàng lỗi',
      'Sai địa chỉ/Đổi địa chỉ/Sai SĐT',
      'Hẹn ngày giao/Hẹn Thời gian giao/Hẹn sau/Hẹn lại ngày'
    ]
  },
  {
    label: 'Do ĐVVC',
    options: [
      'Giao chậm',
      'Mất hàng',
      'Hư hỏng'
    ]
  },
  { label: 'Shop yêu cầu hoàn' },
  { label: 'Lý do khác' },
  { label: 'Do khách hàng' },
  { label: 'Do nhân viên' },
  { label: 'Do sản phẩm lỗi' },
  { label: 'Do đơn vị VC' },
  { label: 'Do đổi hàng' }
];

const ALL_STATUSES = [
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'WAITING_FOR_GOODS', label: 'Chờ hàng' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PACKAGING', label: 'Đang đóng hàng' },
  { value: 'WAITING_FOR_SHIPPING', label: 'Chờ vận chuyển' },
  { value: 'SHIPPED', label: 'Đã gửi hàng' },
  { value: 'DELIVERED', label: 'Đã nhận' },
  { value: 'PAYMENT_COLLECTED', label: 'Đã thu tiền' },
  { value: 'RETURNING', label: 'Đang hoàn' },
  { value: 'EXCHANGING', label: 'Đang đổi' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Hoàn trả' }
];

function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount).replace('₫', 'đ');
}

function NumberInput({ value, onChange, placeholder = '0' }: { value: number; onChange: (val: number) => void; placeholder?: string }) {
  const [str, setStr] = useState(value ? new Intl.NumberFormat('vi-VN').format(value) : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setStr('');
      onChange(0);
      return;
    }
    const num = parseInt(raw, 10);
    setStr(new Intl.NumberFormat('vi-VN').format(num));
    onChange(num);
  };

  return (
    <input
      type="text"
      value={str}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-right font-mono text-sm text-black focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors"
    />
  );
}

function getAvailableSizes(product: Product) {
  return Array.from(
    new Set(product.variants.map((variant) => variant.size?.name).filter(Boolean)),
  ) as string[];
}

function getAvailableColors(product: Product) {
  return Array.from(
    new Set(product.variants.map((variant) => variant.color?.name).filter(Boolean)),
  ) as string[];
}

function getUnitPrice(item: OrderItem) {
  const match = item.product.variants.find((variant) => {
    const sameSize = (variant.size?.name || null) === (item.size || null);
    const sameColor = (variant.color?.name || null) === (item.color || null);
    return sameSize && sameColor;
  });

  if (match?.price !== null && match?.price !== undefined) {
    return match.price;
  }

  return item.product.salePrice || item.product.originalPrice;
}

export default function CreateOrderClient({ currentUser }: { currentUser: { id: string; role: string; name?: string } }) {
  const router = useRouter();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Form State
  const [status, setStatus] = useState('PENDING');
  const [assigningCareId, setAssigningCareId] = useState('');
  const [assigningSellerId, setAssigningSellerId] = useState('');
  const [reasonValue, setReasonValue] = useState('');
  const [delayValue, setDelayValue] = useState('');
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [hoveredReasonGroup, setHoveredReasonGroup] = useState<string | null>(null);

  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingStreet, setShippingStreet] = useState('');
  const [shippingWard, setShippingWard] = useState('');
  const [shippingProvince, setShippingProvince] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [shippingFee, setShippingFee] = useState(0);
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [transferMoney, setTransferMoney] = useState(0);
  const [surcharge, setSurcharge] = useState(0);
  const [points, setPoints] = useState(0);
  const [gender, setGender] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // Address dropdown states
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);

  // Staff State
  const [staffList, setStaffList] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [activeNoteTab, setActiveNoteTab] = useState<'NOI_BO' | 'DE_IN'>('NOI_BO');

  useEffect(() => {
    apiClientClient.get<{ staff: any[] }>('/admin/staff/members')
      .then(res => {
        const list = res.staff || [];
        setStaffList(list);

        // Auto-assign current user as "NV xử lý" if they are STAFF or MODERATOR (not ADMIN)
        if (currentUser && currentUser.role !== 'ADMIN') {
          const match = list.find((s: any) => s.id === currentUser.id);
          if (match) {
            setAssigningSellerId(match.id);
          }
        }
      })
      .catch(console.error);
  }, [currentUser]);

  const staffOptions = [
    { value: '', label: 'Không gắn' },
    ...staffList.map(s => ({
      value: s.id,
      label: s.name || s.phone || 'User'
    }))
  ];

  // Address helpers
  const normalizeName = useCallback((n: string) => {
    return n
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
    loadProvinces().then(setProvinces).catch(console.error);
  }, [loadProvinces]);

  useEffect(() => {
    if (!selectedCustomer) return;

    setShippingName(selectedCustomer.name || '');
    setShippingPhone(selectedCustomer.phone || '');
    setShippingStreet(selectedCustomer.addressStreet || '');

    const fillAddress = async () => {
      const custProvince = selectedCustomer.addressProvince || '';
      const custWard = selectedCustomer.addressWard || '';

      if (!custProvince) {
        setShippingProvince('');
        setShippingWard('');
        setWards([]);
        return;
      }

      const provinceOptions = provinces.length ? provinces : await loadProvinces();
      if (!provinces.length) setProvinces(provinceOptions);
      const provinceOption = findAddressOption(provinceOptions, custProvince);
      setShippingProvince(provinceOption?.name || custProvince);

      if (provinceOption) {
        const result = await loadWards(provinceOption.name, provinceOptions);
        const wardOptions = result?.wards || [];
        setWards(wardOptions);
        const wardOption = custWard ? findAddressOption(wardOptions, custWard) : null;
        setShippingWard(wardOption?.name || custWard);
      } else {
        setWards([]);
        setShippingWard(custWard);
      }
    };

    fillAddress().catch(console.error);
  }, [selectedCustomer, provinces, loadProvinces, loadWards, findAddressOption]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!customerSearch || customerSearch.trim().length < 2) {
        setCustomers([]);
        return;
      }

      setSearchingCustomers(true);
      try {
        const data = await apiClientClient.get<any>('/admin/customers', {
          params: {
            search: customerSearch.trim(),
            limit: 8,
            includeAll: true,
          },
        });
        setCustomers(data.customers || []);
      } catch (err) {
        console.error('Customer search failed', err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!productSearch || productSearch.trim().length < 2) {
        setProducts([]);
        return;
      }

      setSearchingProducts(true);
      try {
        const data = await apiClientClient.get<any>('/products/admin', {
          params: {
            search: productSearch.trim(),
            limit: 8,
          },
        });
        setProducts(data.data || []);
      } catch (err) {
        console.error('Product search failed', err);
      } finally {
        setSearchingProducts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  const addProduct = (product: Product) => {
    setOrderItems((current) => [
      ...current,
      {
        productId: product.id,
        quantity: 1,
        size: null,
        color: null,
        product,
      },
    ]);
    setProductSearch('');
    setProducts([]);
  };

  const updateOrderItem = (
    index: number,
    next: Partial<Pick<OrderItem, 'quantity' | 'size' | 'color'>>,
  ) => {
    setOrderItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, ...next }
          : item,
      ),
    );
  };

  const removeOrderItem = (index: number) => {
    setOrderItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const subtotal = orderItems.reduce(
    (sum: number, item) => sum + getUnitPrice(item) * item.quantity,
    0,
  );

  const sauGiamGia = Math.max(0, subtotal - discountAmount);
  const tienCanThu = sauGiamGia + shippingFee + surcharge;
  const daThanhToan = transferMoney + points;
  const conThieu = Math.max(0, tienCanThu - daThanhToan);

  const handleSubmit = async () => {
    if (!shippingName || !shippingPhone) {
      alert('Vui lòng nhập tên và số điện thoại người nhận');
      return;
    }

    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiClientClient.post('/orders/admin', {
        userId: selectedCustomer?.id,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size || undefined,
          color: item.color || undefined,
        })),
        status,
        metadata: {
          assigningCareId: assigningCareId || undefined,
          assigningSellerId: assigningSellerId || undefined,
          reasonValue: reasonValue || undefined,
          delayValue: delayValue || undefined,
          carrier: carrier || undefined,
          trackingCode: trackingCode || undefined,
        },
        shippingName,
        shippingPhone,
        shippingStreet,
        shippingWard,
        shippingProvince,
        customerNote,
        adminNote,
        shippingFee,
        discountAmount,
      });

      router.push('/admin/orders');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể tạo đơn hàng');
      setError(err instanceof Error ? err.message : 'Lỗi tạo đơn');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full -mx-4 -my-4 md:-mx-6 md:-my-6 bg-[#f4f6f8] text-[13px] font-sans">
      <div className="ml-auto mr-7 mt-6 flex items-center gap-4">
        {error && <span className="text-red-500 font-medium text-sm animate-pulse flex items-center gap-1"><X className="w-4 h-4" /> {error}</span>}
        <button
          onClick={handleSubmit}
          disabled={submitting || orderItems.length === 0}
          className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <DownloadCloud className="w-4 h-4 animate-bounce" /> : <Save className="w-4 h-4" />}
          {submitting ? 'Đang tạo...' : 'Tạo đơn'}
        </button>
      </div>

      <div className="flex-1 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Left Column (Products, Payment, Notes) */}
          <div className="flex-1 flex flex-col gap-4">

            {/* Top: Products & Search */}
            <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 flex-1 min-h-[350px] flex flex-col overflow-hidden">
              {/* Search bar row */}
              <div className="flex flex-wrap items-center gap-3 p-3 border-b border-gray-100 bg-white relative">
                <div className="flex-1 relative min-w-[250px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 pl-9 pr-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-shadow placeholder-gray-400 font-medium text-sm"
                    placeholder="Nhập mã, tên sản phẩm hoặc Barcode"
                  />

                  {/* Product Search Results Dropdown */}
                  {(searchingProducts || products.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-50 max-h-80 overflow-y-auto">
                      {searchingProducts && <div className="p-3 text-center text-gray-500">Đang tìm...</div>}
                      {!searchingProducts && products.map(product => (
                        <button
                          key={product.id}
                          onClick={() => addProduct(product)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 border-b border-gray-50 text-left transition-colors last:border-0"
                        >
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-10 h-10 rounded object-cover border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center"><Plus className="w-4 h-4 text-gray-400" /></div>
                          )}
                          <div className="flex-1 overflow-hidden">
                            <p className="font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(product.salePrice || product.originalPrice)} • Tồn: {product.stockQuantity}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart items / Empty state */}
              <div className={`flex-1 overflow-y-auto ${orderItems.length === 0 ? 'bg-white flex items-center justify-center' : 'p-0 bg-white'}`}>
                {orderItems.length === 0 ? (
                  <div className="text-center text-gray-400 flex flex-col items-center">
                    <div className="w-20 h-20 mb-3 opacity-30">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                      </svg>
                    </div>
                    <p className="text-sm font-medium">Giỏ hàng trống</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {orderItems.map((item, index) => {
                      const sizes = getAvailableSizes(item.product);
                      const colors = getAvailableColors(item.product);
                      const unitPrice = getUnitPrice(item);
                      return (
                        <div key={index} className="flex items-center p-3 hover:bg-gray-50/50 group transition-colors">
                          <div className="w-8 text-center text-gray-400 font-medium">{index + 1}</div>
                          <div className="flex-1 flex gap-3">
                            {item.product.imageUrl ? (
                              <img src={item.product.imageUrl} alt="" className="w-12 h-12 rounded object-cover border border-gray-200 bg-gray-50" />
                            ) : (
                              <div className="w-12 h-12 rounded border border-gray-200 bg-gray-50" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 line-clamp-1">{item.product.name}</p>
                              <div className="flex gap-2 mt-1">
                                {sizes.length > 0 && (
                                  <select
                                    className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 outline-none hover:border-gray-300"
                                    value={item.size || ''}
                                    onChange={(e) => updateOrderItem(index, { size: e.target.value || null })}
                                  >
                                    <option value="">Size</option>
                                    {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                )}
                                {colors.length > 0 && (
                                  <select
                                    className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 outline-none hover:border-gray-300"
                                    value={item.color || ''}
                                    onChange={(e) => updateOrderItem(index, { color: e.target.value || null })}
                                  >
                                    <option value="">Màu</option>
                                    {colors.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="w-24 text-right font-medium text-gray-600">{formatCurrency(unitPrice)}</div>
                          <div className="w-24 px-4">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateOrderItem(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-16 text-center border border-gray-200 bg-gray-50 rounded-md py-1 outline-none focus:border-blue-500 focus:bg-white"
                            />
                          </div>
                          <div className="w-24 text-right font-bold text-gray-900">{formatCurrency(unitPrice * item.quantity)}</div>
                          <button onClick={() => removeOrderItem(index)} className="w-10 flex justify-end text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Payment & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Box */}
              <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 text-sm">Thanh toán</h3>
                </div>

                <div className="flex items-center gap-4 text-gray-600 mb-4 font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="rounded border-gray-300 w-3.5 h-3.5 text-blue-600" /> Miễn phí giao hàng</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" className="rounded border-gray-300 w-3.5 h-3.5 text-blue-600" /> Chỉ thu phí nếu hoàn</label>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Phí vận chuyển</span>
                    <div className="w-32"><NumberInput value={shippingFee} onChange={setShippingFee} /></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Giảm giá đơn hàng</span>
                    <div className="w-32"><NumberInput value={discountAmount} onChange={setDiscountAmount} /></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Tiền chuyển khoản</span>
                    <div className="w-32"><NumberInput value={transferMoney} onChange={setTransferMoney} /></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Phụ thu</span>
                    <div className="w-32"><NumberInput value={surcharge} onChange={setSurcharge} /></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Điểm thưởng</span>
                    <div className="w-32"><NumberInput value={points} onChange={setPoints} /></div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-2 mt-5">
                  <div className="flex justify-between"><span className="text-gray-600 font-medium">Tổng số tiền</span><span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600 font-medium">Giảm giá</span><span className="font-bold text-green-600">{formatCurrency(discountAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600 font-medium">Sau giảm giá</span><span className="font-bold text-gray-900">{formatCurrency(sauGiamGia)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 mt-2"><span className="text-gray-800 font-bold">Tiền cần thu</span><span className="font-bold text-blue-600">{formatCurrency(tienCanThu)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600 font-medium">Đã thanh toán</span><span className="font-bold text-gray-900">{formatCurrency(daThanhToan)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 mt-2"><span className="text-gray-800 font-bold">Còn thiếu</span><span className="font-bold text-red-600">{formatCurrency(conThieu)}</span></div>
                </div>
              </div>

              {/* Notes Box */}
              <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 flex flex-col">
                <h3 className="font-bold text-gray-800 text-sm mb-4">Ghi chú</h3>

                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 mb-3">
                  <button
                    onClick={() => setActiveNoteTab('NOI_BO')}
                    className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${activeNoteTab === 'NOI_BO' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Nội bộ
                  </button>
                  <button
                    onClick={() => setActiveNoteTab('DE_IN')}
                    className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${activeNoteTab === 'DE_IN' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Để In
                  </button>
                </div>

                <textarea
                  className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all mb-4 placeholder-gray-400"
                  placeholder="Viết ghi chú hoặc /shortcut để ghi chú nhanh"
                  value={activeNoteTab === 'NOI_BO' ? adminNote : customerNote}
                  onChange={(e) => activeNoteTab === 'NOI_BO' ? setAdminNote(e.target.value) : setCustomerNote(e.target.value)}
                />

                <div>
                  <button className="flex flex-col items-center justify-center w-[70px] h-[70px] border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-colors text-gray-500 hover:text-blue-500">
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-medium">Tải lên</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Info, Customer, Shipping, Carrier) */}
          <div className="w-full lg:w-[420px] xl:w-[500px] 2xl:w-[580px] flex flex-col gap-4">

            {/* Order Info */}
            <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 space-y-4">
              <div className="flex justify-between items-center text-gray-700">
                <span className="font-medium text-xs">Tạo lúc</span>
                <span className="font-bold text-gray-900 text-xs">{fmtDate(new Date())}</span>
              </div>
              <div className="flex items-center text-gray-700 gap-4">
                <span className="font-medium text-xs whitespace-nowrap w-20">Trạng thái</span>
                <div className="flex-1 w-full">
                  <Select
                    value={status}
                    onChange={setStatus}
                    options={ALL_STATUSES}
                    className="bg-gray-50 border-gray-200 py-1.5"
                  />
                </div>
              </div>
              <div className="flex items-center text-gray-700 gap-4">
                <span className="font-medium text-xs whitespace-nowrap w-20">NV xử lý</span>
                <div className="flex-1 w-full">
                  <Select
                    value={assigningSellerId}
                    onChange={setAssigningSellerId}
                    options={staffOptions}
                    className="bg-gray-50 border-gray-200 py-1.5"
                  />
                </div>
              </div>
              <div className="flex items-center text-gray-700 gap-4">
                <span className="font-medium text-xs whitespace-nowrap w-20">NV chăm sóc</span>
                <div className="flex-1 w-full">
                  <Select
                    value={assigningCareId}
                    onChange={setAssigningCareId}
                    options={staffOptions}
                    className="bg-gray-50 border-gray-200 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center text-gray-700 gap-4">
                <span className="font-medium text-xs whitespace-nowrap w-20">Trễ giao</span>
                <div className="flex-1 w-full">
                  <Select
                    value={delayValue}
                    onChange={setDelayValue}
                    options={[{ value: '', label: 'Chọn' }, { value: 'Chưa xử lý', label: 'Chưa xử lý' }, { value: 'Đang xử lý', label: 'Đang xử lý' }, { value: 'Đã xử lý', label: 'Đã xử lý' }]}
                    className="bg-gray-50 border-gray-200 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center text-gray-700 gap-4">
                <span className="font-medium text-xs whitespace-nowrap w-20">Lý do hoàn</span>
                <div className="flex-1 w-full relative">
                  <button
                    onClick={() => setIsReasonOpen(!isReasonOpen)}
                    className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 hover:bg-white transition-all rounded px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <span className="truncate">{reasonValue || 'Chọn lý do'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isReasonOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isReasonOpen && (
                    <div className="absolute right-0 bottom-full mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[60] py-1">
                      <div 
                        className="px-4 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer transition-colors border-b border-gray-100 font-medium"
                        onClick={() => {
                          setReasonValue('');
                          setIsReasonOpen(false);
                        }}
                      >
                        Bỏ chọn lý do
                      </div>
                      {REASON_GROUPS.map((group) => (
                        <div
                          key={group.label}
                          className="relative"
                          onMouseEnter={() => setHoveredReasonGroup(group.label)}
                          onMouseLeave={() => setHoveredReasonGroup(null)}
                          onClick={() => {
                            if (!group.options) {
                              setReasonValue(group.label);
                              setIsReasonOpen(false);
                            }
                          }}
                        >
                          <div className={`flex items-center justify-between px-4 py-2 text-xs cursor-pointer transition-colors ${hoveredReasonGroup === group.label ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                            <span>{group.label}</span>
                            {group.options && <X className="w-3 h-3 opacity-30 rotate-45" />}
                          </div>

                          {group.options && hoveredReasonGroup === group.label && (
                            <div className="absolute right-full top-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-[70] mr-1">
                              {group.options.map((opt) => (
                                <div
                                  key={opt}
                                  className="px-4 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReasonValue(opt);
                                    setIsReasonOpen(false);
                                    setHoveredReasonGroup(null);
                                  }}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-sm">Khách hàng</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                    className={`px-3 py-1.5 border rounded-md font-medium flex items-center gap-1 transition-colors text-xs ${
                      showCustomerSearch 
                        ? 'bg-blue-50 border-blue-300 text-blue-600' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" /> Chọn KH
                  </button>
                  <div className="w-28">
                    <Select
                      value={gender}
                      onChange={setGender}
                      options={[{value: '', label: 'Giới tính'}, {value: 'MALE', label: 'Nam'}, {value: 'FEMALE', label: 'Nữ'}, {value: 'OTHER', label: 'Khác'}]}
                      className="bg-gray-50 border-gray-200 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Search Panel */}
              {showCustomerSearch && (
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 pl-9 pr-3 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
                      placeholder="Tìm theo tên, SĐT, email..."
                      autoFocus
                    />
                  </div>
                  {selectedCustomer && (
                    <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                      <div className="flex-1">
                        <p className="font-bold text-blue-800 text-sm">{selectedCustomer.name || 'Khách vãng lai'}</p>
                        <p className="text-xs text-blue-600">{selectedCustomer.phone} {selectedCustomer.email ? `• ${selectedCustomer.email}` : ''}</p>
                      </div>
                      <button onClick={() => { setSelectedCustomer(null); setShippingName(''); setShippingPhone(''); }} className="text-blue-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {/* Customer Search Results */}
                  {customers.length > 0 && customerSearch && !selectedCustomer && (
                    <div className="mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                      {searchingCustomers && <div className="p-3 text-center text-gray-500 text-xs">Đang tìm...</div>}
                      {customers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomers([]); }}
                          className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                        >
                          <p className="font-bold text-gray-900 text-sm">{c.name || 'Khách vãng lai'}</p>
                          <p className="text-xs text-gray-500">{c.phone} {c.email ? `• ${c.email}` : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={shippingName}
                    onChange={e => setShippingName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
                    placeholder="Tên khách hàng"
                  />
                  <input
                    value={shippingPhone}
                    onChange={e => setShippingPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
                    placeholder="SĐT"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400" placeholder="Địa chỉ email" />
                  <div className="relative">
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-md pl-3 pr-8 py-2 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400" placeholder="Ngày sinh" />
                    <CalendarIcon className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> Nhận hàng</h3>
              </div>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Tỉnh/Thành phố *</label>
                    <Select
                      value={shippingProvince}
                      onChange={async (val) => {
                        setShippingProvince(val);
                        setShippingWard('');
                        setWards([]);
                        try {
                          const result = await loadWards(val);
                          if (result) setWards(result.wards);
                        } catch { }
                      }}
                      options={[{ value: '', label: 'Chọn Tỉnh/Thành phố' }, ...provinces.map(p => ({ value: p.name, label: p.name }))]}
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Phường/Xã *</label>
                    <Select
                      value={shippingWard}
                      onChange={setShippingWard}
                      disabled={!shippingProvince}
                      options={[{ value: '', label: 'Chọn Phường/Xã' }, ...wards.map(w => ({ value: w.name, label: w.name }))]}
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Số nhà, Tên đường *</label>
                  <input
                    value={shippingStreet}
                    onChange={e => setShippingStreet(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
                    placeholder="Số nhà, đường phố..."
                  />
                </div>
              </div>
            </div>

            {/* Carrier */}
            <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-sm">Vận chuyển</h3>
                <div className="w-32">
                  <Select
                    value={carrier}
                    onChange={setCarrier}
                    options={[{ value: '', label: 'Đơn vị VC' }, { value: 'VTP', label: 'ViettelPost (VTP)' }, { value: 'GHTK', label: 'Giao hàng tiết kiệm' }, { value: 'GHN', label: 'Giao hàng nhanh' }]}
                    className="bg-gray-50 border-gray-200 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <input
                  value={trackingCode}
                  onChange={e => setTrackingCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
                  placeholder="Mã vận đơn"
                />
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700 whitespace-nowrap">Phí</span>
                  <div className="flex-1">
                    <NumberInput value={shippingFee} onChange={setShippingFee} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}

// Icon for Calendar
function CalendarIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

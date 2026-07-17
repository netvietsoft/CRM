'use client';

import Image from '@/components/ui/AppImage';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Trash2, X, DownloadCloud, Plus, Save } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import { passthroughImageLoader } from '@/lib/imageLoader';
import CreateOrderSidebar from './CreateOrderSidebar';
import { CREATE_ORDER_CUSTOMER_DRAFT_KEY } from './createOrder.constants';
import {
  buildOrderItem,
  formatCurrency,
  formatDateInputValue,
  getAvailableColors,
  getAvailableSizes,
  getCatalogUnitPrice,
  getUnitPrice,
  NumberInput,
  syncOrderItemPricing,
} from './createOrder.helpers';
import type {
  AddressOption,
  Customer,
  CustomerPrefill,
  CustomerSearchResponse,
  CreateOrderCustomerDraft,
  OrderItem,
  Product,
  ProductSearchResponse,
  StaffMember,
  StaffMembersResponse,
} from './createOrder.types';

export default function CreateOrderClient({ currentUser }: { currentUser: { id: string; role: string; name?: string } }) {
  const router = useRouter();
  // ?source=CCM (từ trang Đơn hàng CCM) → đơn tạo ra gắn nguồn CCM, nằm trong bảng đơn CCM riêng.
  const orderSource = useSearchParams().get('source') || undefined;
  const hasHydratedCustomerDraftRef = useRef(false);
  const skipSelectedCustomerPrefillRef = useRef(false);
  const pendingWardRestoreRef = useRef<{ province: string; ward: string } | null>(null);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

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
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerDob, setCustomerDob] = useState('');
  const [gender, setGender] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [inlineCustomerQuery, setInlineCustomerQuery] = useState('');
  const [inlineCustomerResults, setInlineCustomerResults] = useState<Customer[]>([]);
  const [searchingInlineCustomers, setSearchingInlineCustomers] = useState(false);
  const [activeCustomerField, setActiveCustomerField] = useState<'name' | 'phone' | 'email' | null>(null);

  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [activeNoteTab, setActiveNoteTab] = useState<'NOI_BO' | 'DE_IN'>('NOI_BO');

  useEffect(() => {
    void apiClientClient.get<StaffMembersResponse>('/admin/staff/members')
      .then(res => {
        const list = res.staff || [];
        setStaffList(list);

        if (currentUser && currentUser.role !== 'ADMIN') {
          const match = list.find((staff) => staff.id === currentUser.id);
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
    void loadProvinces().then(setProvinces).catch(console.error);
  }, [loadProvinces]);

  useEffect(() => {
    let isCancelled = false;

    try {
      const rawDraft = window.localStorage.getItem(CREATE_ORDER_CUSTOMER_DRAFT_KEY);
      if (!rawDraft) {
        return;
      }

      const draft = JSON.parse(rawDraft) as CreateOrderCustomerDraft;
      queueMicrotask(() => {
        if (isCancelled) {
          return;
        }

        if (draft.selectedCustomer) {
          skipSelectedCustomerPrefillRef.current = true;
          setSelectedCustomer(draft.selectedCustomer);
        }

        setShippingName(draft.shippingName || '');
        setShippingPhone(draft.shippingPhone || '');
        setShippingStreet(draft.shippingStreet || '');
        setShippingWard(draft.shippingWard || '');
        setShippingProvince(draft.shippingProvince || '');
        setCustomerEmail(draft.customerEmail || '');
        setCustomerDob(draft.customerDob || '');
        setGender(draft.gender || '');

        if (draft.shippingProvince) {
          pendingWardRestoreRef.current = {
            province: draft.shippingProvince,
            ward: draft.shippingWard || '',
          };
        }
      });
    } catch (error) {
      console.error('Failed to restore create-order customer draft', error);
      window.localStorage.removeItem(CREATE_ORDER_CUSTOMER_DRAFT_KEY);
    } finally {
      hasHydratedCustomerDraftRef.current = true;
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingWardRestoreRef.current || provinces.length === 0) {
      return;
    }

    let isCancelled = false;
    const { province, ward } = pendingWardRestoreRef.current;

    void loadWards(province, provinces)
      .then((result) => {
        if (isCancelled) {
          return;
        }

        setWards(result?.wards || []);
        if (ward) {
          setShippingWard(ward);
        }
        pendingWardRestoreRef.current = null;
      })
      .catch(console.error);

    return () => {
      isCancelled = true;
    };
  }, [loadWards, provinces]);

  const buildCustomerPrefill = useCallback(async (customer: Customer): Promise<CustomerPrefill> => {
    const custProvince = customer.addressProvince || '';
    const custWard = customer.addressWard || '';

    const prefill: CustomerPrefill = {
      shippingName: customer.name || '',
      shippingPhone: customer.phone || '',
      shippingStreet: customer.addressStreet || '',
      shippingProvince: '',
      shippingWard: '',
      wards: [],
    };

    if (!custProvince) {
      return prefill;
    }

    const provinceOptions = provinces.length ? provinces : await loadProvinces();
    if (!provinces.length) {
      prefill.provinceOptions = provinceOptions;
    }

    const provinceOption = findAddressOption(provinceOptions, custProvince);
    prefill.shippingProvince = provinceOption?.name || custProvince;

    if (!provinceOption) {
      prefill.shippingWard = custWard;
      return prefill;
    }

    const result = await loadWards(provinceOption.name, provinceOptions);
    const wardOptions = result?.wards || [];
    const wardOption = custWard ? findAddressOption(wardOptions, custWard) : null;

    prefill.wards = wardOptions;
    prefill.shippingWard = wardOption?.name || custWard;

    return prefill;
  }, [findAddressOption, loadProvinces, loadWards, provinces]);

  useEffect(() => {
    if (!selectedCustomer) return;

    if (skipSelectedCustomerPrefillRef.current) {
      skipSelectedCustomerPrefillRef.current = false;
      return;
    }

    let isCancelled = false;

    void buildCustomerPrefill(selectedCustomer)
      .then((prefill) => {
        if (isCancelled) return;

        setShippingName(prefill.shippingName);
        setShippingPhone(prefill.shippingPhone);
        setShippingStreet(prefill.shippingStreet);
        setShippingProvince(prefill.shippingProvince);
        setShippingWard(prefill.shippingWard);
        setWards(prefill.wards);

        if (prefill.provinceOptions) {
          setProvinces(prefill.provinceOptions);
        }
      })
      .catch(console.error);

    return () => {
      isCancelled = true;
    };
  }, [buildCustomerPrefill, selectedCustomer]);

  const applySelectedCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShippingName(customer.name || '');
    setShippingPhone(customer.phone || '');
    setCustomerEmail(customer.email || '');
    setCustomerDob(formatDateInputValue(customer.dob));
    setGender(customer.gender || '');
    setCustomerSearch('');
    setCustomers([]);
    setInlineCustomerQuery('');
    setInlineCustomerResults([]);
    setActiveCustomerField(null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!customerSearch || customerSearch.trim().length < 2) {
        setCustomers([]);
        return;
      }

      setSearchingCustomers(true);
      try {
        const data = await apiClientClient.get<CustomerSearchResponse>('/admin/customers', {
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
      if (!inlineCustomerQuery || inlineCustomerQuery.trim().length < 2) {
        setInlineCustomerResults([]);
        setSearchingInlineCustomers(false);
        return;
      }

      setSearchingInlineCustomers(true);
      try {
        const data = await apiClientClient.get<CustomerSearchResponse>('/admin/customers', {
          params: {
            search: inlineCustomerQuery.trim(),
            limit: 8,
            includeAll: true,
          },
        });
        setInlineCustomerResults(data.customers || []);
      } catch (err) {
        console.error('Inline customer search failed', err);
      } finally {
        setSearchingInlineCustomers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inlineCustomerQuery]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!productSearch || productSearch.trim().length < 2) {
        setProducts([]);
        return;
      }

      setSearchingProducts(true);
      try {
        const data = await apiClientClient.get<ProductSearchResponse>('/products/admin', {
          params: {
            search: productSearch.trim(),
            limit: 8,
            isActive: 'true', // sản phẩm NGỪNG BÁN không hiện khi lên đơn
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
      buildOrderItem(product),
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
          ? syncOrderItemPricing(item, next)
          : item,
      ),
    );
  };

  const updateOrderItemPrice = (index: number, nextPrice: number) => {
    setOrderItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const catalogUnitPrice = getCatalogUnitPrice(item.product, item.size, item.color);
        return {
          ...item,
          unitPrice: nextPrice,
          isCustomPrice: nextPrice !== catalogUnitPrice,
        };
      }),
    );
  };

  const removeOrderItem = (index: number) => {
    setOrderItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleCustomerIdentityChange = (
    field: 'name' | 'phone' | 'email',
    value: string,
  ) => {
    if (field === 'name') {
      setShippingName(value);
    } else if (field === 'phone') {
      setShippingPhone(value);
    } else {
      setCustomerEmail(value);
    }

    setActiveCustomerField(field);
    setInlineCustomerQuery(value);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setShippingName('');
    setShippingPhone('');
    setCustomerEmail('');
    setCustomerDob('');
    setGender('');
    setCustomerSearch('');
    setCustomers([]);
    setInlineCustomerQuery('');
    setInlineCustomerResults([]);
    setActiveCustomerField(null);
  };

  useEffect(() => {
    if (!hasHydratedCustomerDraftRef.current) {
      return;
    }

    const hasCustomerDraft = Boolean(
      selectedCustomer ||
        shippingName ||
        shippingPhone ||
        shippingStreet ||
        shippingWard ||
        shippingProvince ||
        customerEmail ||
        customerDob ||
        gender,
    );

    if (!hasCustomerDraft) {
      window.localStorage.removeItem(CREATE_ORDER_CUSTOMER_DRAFT_KEY);
      return;
    }

    const draft: CreateOrderCustomerDraft = {
      selectedCustomer,
      shippingName,
      shippingPhone,
      shippingStreet,
      shippingWard,
      shippingProvince,
      customerEmail,
      customerDob,
      gender,
    };

    window.localStorage.setItem(CREATE_ORDER_CUSTOMER_DRAFT_KEY, JSON.stringify(draft));
  }, [
    customerDob,
    customerEmail,
    gender,
    selectedCustomer,
    shippingName,
    shippingPhone,
    shippingProvince,
    shippingStreet,
    shippingWard,
  ]);

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
        source: orderSource,
        userId: selectedCustomer?.id,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size || undefined,
          color: item.color || undefined,
          unitPrice: item.isCustomPrice ? item.unitPrice : undefined,
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
        customerEmail: customerEmail || undefined,
        customerGender: gender || undefined,
        customerDob: customerDob || undefined,
        shippingStreet,
        shippingWard,
        shippingProvince,
        customerNote,
        adminNote,
        shippingFee,
        discountAmount,
      });

      window.localStorage.removeItem(CREATE_ORDER_CUSTOMER_DRAFT_KEY);
      router.push(orderSource === 'CCM' ? '/admin/ccm-orders' : '/admin/orders');
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
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 flex-1 min-h-[350px] flex flex-col overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-3 border-b border-gray-100 bg-white relative">
                <div className="flex-1 relative min-w-[250px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 pl-9 pr-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-shadow placeholder-gray-400 font-medium text-sm"
                    placeholder="Nhập mã, tên sản phẩm hoặc Barcode"
                  />

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
                            <Image
                              loader={passthroughImageLoader}
                              unoptimized
                              src={product.imageUrl}
                              alt=""
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded object-cover border border-gray-200"
                            />
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
                              <Image
                                loader={passthroughImageLoader}
                                unoptimized
                                src={item.product.imageUrl}
                                alt=""
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded object-cover border border-gray-200 bg-gray-50"
                              />
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
                          <div className="w-32 px-2">
                            <NumberInput
                              value={unitPrice}
                              onChange={(value) => updateOrderItemPrice(index, value)}
                              className="py-1 text-sm"
                            />
                          </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <CreateOrderSidebar
            status={status}
            onStatusChange={setStatus}
            assigningSellerId={assigningSellerId}
            onAssigningSellerChange={setAssigningSellerId}
            assigningCareId={assigningCareId}
            onAssigningCareChange={setAssigningCareId}
            staffOptions={staffOptions}
            delayValue={delayValue}
            onDelayChange={setDelayValue}
            reasonValue={reasonValue}
            isReasonOpen={isReasonOpen}
            onReasonOpenChange={setIsReasonOpen}
            hoveredReasonGroup={hoveredReasonGroup}
            onHoveredReasonGroupChange={setHoveredReasonGroup}
            onReasonValueChange={setReasonValue}
            showCustomerSearch={showCustomerSearch}
            onShowCustomerSearchChange={setShowCustomerSearch}
            gender={gender}
            onGenderChange={setGender}
            customerSearch={customerSearch}
            onCustomerSearchChange={setCustomerSearch}
            selectedCustomer={selectedCustomer}
            onClearSelectedCustomer={clearSelectedCustomer}
            customers={customers}
            searchingCustomers={searchingCustomers}
            onSelectCustomer={applySelectedCustomer}
            shippingName={shippingName}
            shippingPhone={shippingPhone}
            customerEmail={customerEmail}
            customerDob={customerDob}
            onCustomerDobChange={setCustomerDob}
            onCustomerIdentityChange={handleCustomerIdentityChange}
            activeCustomerField={activeCustomerField}
            onActiveCustomerFieldChange={setActiveCustomerField}
            inlineCustomerQuery={inlineCustomerQuery}
            onInlineCustomerQueryChange={setInlineCustomerQuery}
            searchingInlineCustomers={searchingInlineCustomers}
            inlineCustomerResults={inlineCustomerResults}
            shippingProvince={shippingProvince}
            onSelectShippingProvince={async (value) => {
              setShippingProvince(value);
              setShippingWard('');
              setWards([]);
              try {
                const result = await loadWards(value);
                if (result) {
                  setWards(result.wards);
                }
              } catch {}
            }}
            shippingWard={shippingWard}
            onShippingWardChange={setShippingWard}
            provinces={provinces}
            wards={wards}
            shippingStreet={shippingStreet}
            onShippingStreetChange={setShippingStreet}
            carrier={carrier}
            onCarrierChange={setCarrier}
            trackingCode={trackingCode}
            onTrackingCodeChange={setTrackingCode}
            shippingFee={shippingFee}
            onShippingFeeChange={setShippingFee}
          />
        </div>
      </div>

    </div>
  );
}

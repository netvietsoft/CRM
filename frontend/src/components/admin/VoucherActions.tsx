'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { getApiErrorMessage } from '@/lib/apiError';

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

interface CategoryOption {
  id: string;
  name: string;
}

interface StoreOption {
  id: string;
  name: string;
}

interface AddressOption {
  code: string;
  name: string;
}

const ORDER_SOURCE_OPTIONS = [
  { value: 'PORTAL_DIRECT', label: 'Website / Web' },
  { value: 'ADMIN_MANUAL', label: 'Tại quầy / Admin tạo tay' },
  { value: 'PANCAKE', label: 'Pancake / Social commerce' },
];

const SALES_CHANNEL_OPTIONS = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'OFFLINE', label: 'Tại quầy' },
];

const CUSTOMER_SEGMENT_OPTIONS = [
  { value: 'NEW_CUSTOMER', label: 'Khách mới' },
  { value: 'EXISTING_CUSTOMER', label: 'Khách cũ' },
  { value: 'BOUGHT_1_TIME', label: 'Khách mua 1 lần' },
  { value: 'BOUGHT_2_3_TIMES', label: 'Khách mua 2-3 lần' },
  { value: 'VIP_CUSTOMER', label: 'VIP' },
  { value: 'INACTIVE_30D', label: 'Khách ngủ đông 30 ngày' },
  { value: 'INACTIVE_60D', label: 'Khách ngủ đông 60 ngày' },
  { value: 'CHURN_RISK', label: 'Khách sắp rời bỏ' },
  { value: 'DEAL_HUNTER', label: 'Khách săn sale' },
  { value: 'HIGH_AOV', label: 'Khách AOV cao' },
  { value: 'FREQUENT_RETURNS', label: 'Khách hoàn hàng nhiều' },
  { value: 'COD_FAILED', label: 'Khách COD fail' },
];

const CUSTOMER_RANK_OPTIONS = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'DIAMOND', label: 'Diamond' },
  { value: 'PLATINUM', label: 'Platinum' },
];

const CUSTOMER_OCCASION_OPTIONS = [
  { value: 'BIRTHDAY_TODAY', label: 'Đúng ngày sinh nhật' },
  { value: 'BIRTHDAY_MONTH', label: 'Trong tháng sinh nhật' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'COD', label: 'Thanh toán khi nhận hàng (COD)' },
  { value: 'VIETQR', label: 'VietQR' },
];

export default function VoucherActions() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const router = useRouter();

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    campaignCategory: 'WELCOME',
    type: 'PERCENT',
    value: '',
    minOrderValue: '399000',
    maxDiscount: '',
    totalUsageLimit: '',
    perCustomerLimit: '1',
    validFrom: '',
    validTo: '',
    durationDays: '30',
    storeId: '',
    requiredCategoryId: '',
    minProductCount: '',
    orderSources: [] as string[],
    salesChannels: [] as string[],
    customerSegments: [] as string[],
    customerRanks: [] as string[],
    customerOccasions: [] as string[],
    shippingProvinces: [] as string[],
    paymentMethods: [] as string[],
    isStackable: false,
  });

  const defaultStackTiers = [
    { conditionType: 'products', minProducts: 1, minAmount: 0, discount: 200000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 2, minAmount: 0, discount: 300000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 3, minAmount: 0, discount: 500000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 4, minAmount: 0, discount: 800000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
    { conditionType: 'products', minProducts: 5, minAmount: 0, discount: 1000000, type: 'FIXED_AMOUNT', maxDiscount: 0 },
  ];

  const [stackTiers, setStackTiers] = useState(defaultStackTiers);

  useEffect(() => {
    apiClientClient.get<CategoryOption[]>('/categories')
      .then(setCategories)
      .catch(() => setCategories([]));

    apiClientClient.get<StoreOption[]>('/stores/admin')
      .then((data) => setStores(Array.isArray(data) ? data : []))
      .catch(() => setStores([]));

    fetch('/internal-api/address?type=provinces')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProvinces(Array.isArray(data) ? data : []))
      .catch(() => setProvinces([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post('/vouchers', {
        ...form,
        value: form.type === 'STACK' ? 0 : parseFloat(form.value),
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        totalUsageLimit: form.totalUsageLimit ? parseInt(form.totalUsageLimit) : null,
        perCustomerLimit: parseInt(form.perCustomerLimit) || 1,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        durationDays: form.durationDays ? parseInt(form.durationDays) : null,
        storeId: form.storeId || null,
        requiredCategoryId: form.requiredCategoryId || null,
        minProductCount: form.minProductCount ? parseInt(form.minProductCount) : null,
        orderSources: form.orderSources,
        salesChannels: form.salesChannels,
        customerSegments: form.customerSegments,
        customerRanks: form.customerRanks,
        customerOccasions: form.customerOccasions,
        shippingProvinces: form.shippingProvinces,
        paymentMethods: form.paymentMethods,
        stackTiers: form.type === 'STACK' ? stackTiers : null,
      });

      setShowModal(false);
      setForm({
        code: '',
        name: '',
        description: '',
        campaignCategory: 'WELCOME',
        type: 'PERCENT',
        value: '',
        minOrderValue: '399000',
        maxDiscount: '',
        totalUsageLimit: '',
        perCustomerLimit: '1',
        validFrom: '',
        validTo: '',
        durationDays: '30',
        storeId: '',
        requiredCategoryId: '',
        minProductCount: '',
        orderSources: [],
        salesChannels: [],
        customerSegments: [],
        customerRanks: [],
        customerOccasions: [],
        shippingProvinces: [],
        paymentMethods: [],
        isStackable: false,
      });
      setStackTiers(defaultStackTiers);
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

  const toggleOrderSource = (source: string) => {
    setForm((prev) => ({
      ...prev,
      orderSources: prev.orderSources.includes(source)
        ? prev.orderSources.filter((item) => item !== source)
        : [...prev.orderSources, source],
    }));
  };

  const toggleSalesChannel = (channel: string) => {
    setForm((prev) => ({
      ...prev,
      salesChannels: prev.salesChannels.includes(channel)
        ? prev.salesChannels.filter((item) => item !== channel)
        : [...prev.salesChannels, channel],
    }));
  };

  const toggleCustomerSegment = (segment: string) => {
    setForm((prev) => ({
      ...prev,
      customerSegments: prev.customerSegments.includes(segment)
        ? prev.customerSegments.filter((item) => item !== segment)
        : [...prev.customerSegments, segment],
    }));
  };

  const toggleCustomerRank = (rank: string) => {
    setForm((prev) => ({
      ...prev,
      customerRanks: prev.customerRanks.includes(rank)
        ? prev.customerRanks.filter((item) => item !== rank)
        : [...prev.customerRanks, rank],
    }));
  };

  const toggleCustomerOccasion = (occasion: string) => {
    setForm((prev) => ({
      ...prev,
      customerOccasions: prev.customerOccasions.includes(occasion)
        ? prev.customerOccasions.filter((item) => item !== occasion)
        : [...prev.customerOccasions, occasion],
    }));
  };

  const toggleShippingProvince = (province: string) => {
    setForm((prev) => ({
      ...prev,
      shippingProvinces: prev.shippingProvinces.includes(province)
        ? prev.shippingProvinces.filter((item) => item !== province)
        : [...prev.shippingProvinces, province],
    }));
  };

  const togglePaymentMethod = (method: string) => {
    setForm((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((item) => item !== method)
        : [...prev.paymentMethods, method],
    }));
  };

  return (
    <>
      <button
        className="rounded-[10px] bg-[#2563eb] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
        onClick={() => setShowModal(true)}
        id="add-voucher-btn"
      >
        + Tạo voucher
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#eceef2] p-6">
              <h2 className="text-xl font-bold text-slate-900">Tạo Voucher mới</h2>
              <button
                className="text-2xl leading-none text-gray-400 hover:text-gray-600"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-[#fca5a5] bg-[#fee2e2] px-4 py-3 text-[#dc2626]">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-code">
                      Mã voucher *
                    </label>
                    <input
                      id="v-code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono invalid:border-[#dc2626]"
                      required
                      value={form.code}
                      onChange={e => update('code', e.target.value.toUpperCase())}
                      placeholder="VD: NEW10, VIP20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-name">
                      Tên hiển thị *
                    </label>
                    <input 
                      id="v-name" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      required
                      value={form.name} 
                      onChange={e => update('name', e.target.value)}
                      placeholder="Giảm 10% đơn đầu" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-campaign">
                      Chiến dịch
                    </label>
                    <select 
                      id="v-campaign" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.campaignCategory} 
                      onChange={e => update('campaignCategory', e.target.value)}
                    >
                      <option value="WELCOME">🎉 Welcome – Khách mới</option>
                      <option value="VIP">👑 VIP – Khách thân thiết</option>
                      <option value="BUNDLE">📦 Bundle – Mua combo</option>
                      <option value="FREESHIP">🚚 Freeship</option>
                      <option value="GAMIFICATION">🎰 Vòng quay</option>
                      <option value="REFERRAL">🔗 Referral</option>
                      <option value="BIRTHDAY">🎂 Sinh nhật</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-type">
                      Loại giảm giá
                    </label>
                    <select 
                      id="v-type" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.type} 
                      onChange={e => {
                        update('type', e.target.value);
                        if (e.target.value === 'STACK') setStackTiers([...defaultStackTiers]);
                      }}
                    >
                      <option value="PERCENT">Giảm %</option>
                      <option value="FIXED_AMOUNT">Giảm tiền mặt</option>
                      <option value="FREESHIP">Free ship</option>
                      <option value="STACK">📊 Stack (theo SP)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {form.type !== 'STACK' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-value">
                        Giá trị {form.type === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                      </label>
                      <input
                        id="v-value"
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent invalid:border-[#dc2626]"
                        required={form.type !== 'STACK'}
                        value={form.value}
                        onChange={e => update('value', e.target.value)}
                        placeholder={form.type === 'PERCENT' ? '10' : '50000'}
                      />
                    </div>
                  )}
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
                      placeholder="399000" 
                    />
                  </div>
                  {form.type !== 'STACK' && (
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
                  )}
                </div>

                {/* Stack Tiers Editor */}
                {form.type === 'STACK' && (
                  <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-800">📊 Bảng mốc giảm giá theo số SP</h4>
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                        onClick={() => setStackTiers(prev => [...prev, { conditionType: 'products', minProducts: prev.length + 1, minAmount: 0, discount: 0, type: 'FIXED_AMOUNT', maxDiscount: 0 }])}
                      >
                        + Thêm mốc
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[140px_90px_1fr_100px_120px_32px] gap-3 text-xs font-semibold text-gray-500 px-1">
                        <span>Điều kiện</span>
                        <span>Mốc</span>
                        <span>Giảm</span>
                        <span>Loại</span>
                        <span>Tối đa</span>
                        <span></span>
                      </div>
                      {stackTiers.map((tier, idx) => (
                        <div key={idx} className="grid grid-cols-[140px_90px_1fr_100px_120px_32px] gap-3 items-center">
                          <select
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            value={tier.conditionType || 'products'}
                            onChange={e => {
                              const updated = [...stackTiers];
                              updated[idx] = { ...updated[idx], conditionType: e.target.value };
                              setStackTiers(updated);
                            }}
                          >
                            <option value="products">Số lượng SP</option>
                            <option value="amount">Mốc tiền</option>
                          </select>
                          <input
                            type="number"
                            min={tier.conditionType === 'amount' ? 0 : 1}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                            placeholder={tier.conditionType === 'amount' ? '500000' : '1'}
                          />
                          <input
                            type="number"
                            min={0}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            value={tier.discount}
                            onChange={e => {
                              const updated = [...stackTiers];
                              updated[idx] = { ...updated[idx], discount: parseFloat(e.target.value) || 0 };
                              setStackTiers(updated);
                            }}
                            placeholder={tier.type === 'PERCENT' ? '10' : '200000'}
                          />
                          <select
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            value={tier.type}
                            onChange={e => {
                              const updated = [...stackTiers];
                              updated[idx] = { ...updated[idx], type: e.target.value };
                              setStackTiers(updated);
                            }}
                          >
                            <option value="FIXED_AMOUNT">VNĐ</option>
                            <option value="PERCENT">%</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400"
                            value={tier.maxDiscount || ''}
                            disabled={tier.type !== 'PERCENT'}
                            onChange={e => {
                              const updated = [...stackTiers];
                              updated[idx] = { ...updated[idx], maxDiscount: parseFloat(e.target.value) || 0 };
                              setStackTiers(updated);
                            }}
                            placeholder={tier.type === 'PERCENT' ? 'Tối đa' : '-'}
                          />
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none"
                            onClick={() => setStackTiers(prev => prev.filter((_, i) => i !== idx))}
                            disabled={stackTiers.length <= 1}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      💡 <strong>Số lượng SP</strong> = số sản phẩm khác nhau trong đơn. <strong>Mốc tiền</strong> = tổng giá trị đơn hàng.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-store-id">
                      Kho áp dụng
                    </label>
                    <select
                      id="v-store-id"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.storeId}
                      onChange={e => update('storeId', e.target.value)}
                    >
                      <option value="">Toàn hệ thống</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-valid-from">
                      Áp dụng từ
                    </label>
                    <input
                      id="v-valid-from"
                      type="datetime-local"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={toDateTimeLocalValue(form.validFrom)}
                      onChange={e => update('validFrom', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-valid-to">
                      Áp dụng đến
                    </label>
                    <input
                      id="v-valid-to"
                      type="datetime-local"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={toDateTimeLocalValue(form.validTo)}
                      onChange={e => update('validTo', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-required-category">
                      Danh mục áp dụng
                    </label>
                    <select
                      id="v-required-category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.requiredCategoryId}
                      onChange={e => update('requiredCategoryId', e.target.value)}
                    >
                      <option value="">Tất cả danh mục</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-min-product-count">
                      Số lượng SP tối thiểu
                    </label>
                    <input
                      id="v-min-product-count"
                      type="number"
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.minProductCount}
                      onChange={e => update('minProductCount', e.target.value)}
                      placeholder="Không giới hạn"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nguồn đơn áp dụng</label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {ORDER_SOURCE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={form.orderSources.includes(option.value)}
                          onChange={() => toggleOrderSource(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Để trống nếu voucher áp dụng cho mọi nguồn đơn.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kênh áp dụng</label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {SALES_CHANNEL_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={form.salesChannels.includes(option.value)}
                          onChange={() => toggleSalesChannel(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Để trống nếu voucher áp dụng cho cả online và tại quầy.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nhóm khách hàng áp dụng</label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {CUSTOMER_SEGMENT_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={form.customerSegments.includes(option.value)}
                          onChange={() => toggleCustomerSegment(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Để trống nếu voucher áp dụng cho mọi nhóm khách hàng.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hạng khách hàng áp dụng</label>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {CUSTOMER_RANK_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={form.customerRanks.includes(option.value)}
                          onChange={() => toggleCustomerRank(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Để trống nếu voucher áp dụng cho mọi hạng khách hàng.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dịp khách hàng áp dụng</label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {CUSTOMER_OCCASION_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={form.customerOccasions.includes(option.value)}
                          onChange={() => toggleCustomerOccasion(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Để trống nếu voucher không giới hạn theo sinh nhật.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tỉnh/thành giao hàng áp dụng</label>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 p-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {provinces.map((option) => (
                        <label
                          key={option.code}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={form.shippingProvinces.includes(option.name)}
                            onChange={() => toggleShippingProvince(option.name)}
                          />
                          <span>{option.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Để trống nếu voucher áp dụng cho mọi tỉnh/thành giao hàng.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức thanh toán áp dụng</label>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={form.paymentMethods.includes(option.value)}
                          onChange={() => togglePaymentMethod(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Để trống nếu voucher áp dụng cho mọi phương thức thanh toán.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="v-total-limit">
                      Giới hạn tổng
                    </label>
                    <input 
                      id="v-total-limit" 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.totalUsageLimit} 
                      onChange={e => update('totalUsageLimit', e.target.value)}
                      placeholder="Không giới hạn" 
                    />
                  </div>
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

              <div className="flex items-center justify-end gap-3 border-t border-[#eceef2] p-6">
                <button
                  type="button"
                  className="rounded-[10px] border border-gray-300 px-4 py-[9px] text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-[10px] bg-[#2563eb] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  id="save-voucher-btn"
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

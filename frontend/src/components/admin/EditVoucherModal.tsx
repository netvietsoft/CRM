'use client';

import { useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

type StackConditionType = 'products' | 'amount';
type StackDiscountType = 'FIXED_AMOUNT' | 'PERCENT';

interface StackTier {
  conditionType: StackConditionType;
  minProducts: number;
  minAmount: number;
  discount: number;
  type: StackDiscountType;
  maxDiscount: number;
}

interface VoucherStackTierLike {
  conditionType?: string | null;
  minProducts?: number | null;
  minAmount?: number | null;
  discount?: number | null;
  type?: string | null;
  maxDiscount?: number | null;
}

interface VoucherData {
  id: string;
  code: string;
  name: string;
  description: string;
  campaignCategory: string;
  type: string;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  totalUsageLimit: number | null;
  perCustomerLimit: number;
  validFrom: string | null;
  validTo: string | null;
  durationDays: number | null;
  storeId?: string | null;
  requiredCategoryId?: string | null;
  minProductCount?: number | null;
  orderSources?: string[] | null;
  salesChannels?: string[] | null;
  customerSegments?: string[] | null;
  customerRanks?: string[] | null;
  customerOccasions?: string[] | null;
  shippingProvinces?: string[] | null;
  paymentMethods?: string[] | null;
  isStackable: boolean;
  isActive: boolean;
  usedCount: number;
  stackTiers: VoucherStackTierLike[] | null;
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

interface Props {
  voucher: VoucherData;
  onSaved: () => void;
  onClose: () => void;
}

interface UpdateVoucherResponse {
  success?: boolean;
}

function createDefaultStackTier(index = 0): StackTier {
  return {
    conditionType: 'products',
    minProducts: Math.max(1, index + 1),
    minAmount: 0,
    discount: index === 0 ? 200000 : 0,
    type: 'FIXED_AMOUNT',
    maxDiscount: 0,
  };
}

function normalizeConditionType(value?: string | null): StackConditionType {
  return value === 'amount' ? 'amount' : 'products';
}

function normalizeDiscountType(value?: string | null): StackDiscountType {
  return value === 'PERCENT' ? 'PERCENT' : 'FIXED_AMOUNT';
}

function normalizeStackTier(tier: VoucherStackTierLike, index = 0): StackTier {
  return {
    conditionType: normalizeConditionType(tier.conditionType),
    minProducts: tier.minProducts ?? Math.max(1, index + 1),
    minAmount: tier.minAmount ?? 0,
    discount: tier.discount ?? 0,
    type: normalizeDiscountType(tier.type),
    maxDiscount: tier.maxDiscount ?? 0,
  };
}

export default function EditVoucherModal({ voucher, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [provinces, setProvinces] = useState<AddressOption[]>([]);

  const [form, setForm] = useState({
    name: voucher.name || '',
    description: voucher.description || '',
    campaignCategory: voucher.campaignCategory || 'WELCOME',
    type: voucher.type || 'PERCENT',
    value: String(voucher.value || ''),
    minOrderValue: String(voucher.minOrderValue || '0'),
    maxDiscount: voucher.maxDiscount ? String(voucher.maxDiscount) : '',
    totalUsageLimit: voucher.totalUsageLimit ? String(voucher.totalUsageLimit) : '',
    perCustomerLimit: String(voucher.perCustomerLimit || 1),
    validFrom: toDateTimeLocalValue(voucher.validFrom),
    validTo: toDateTimeLocalValue(voucher.validTo),
    durationDays: voucher.durationDays ? String(voucher.durationDays) : '',
    storeId: voucher.storeId || '',
    requiredCategoryId: voucher.requiredCategoryId || '',
    minProductCount: voucher.minProductCount ? String(voucher.minProductCount) : '',
    orderSources: voucher.orderSources || [],
    salesChannels: voucher.salesChannels || [],
    customerSegments: voucher.customerSegments || [],
    customerRanks: voucher.customerRanks || [],
    customerOccasions: voucher.customerOccasions || [],
    shippingProvinces: voucher.shippingProvinces || [],
    paymentMethods: voucher.paymentMethods || [],
    isStackable: voucher.isStackable || false,
    isActive: voucher.isActive,
  });

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

  const [stackTiers, setStackTiers] = useState<StackTier[]>(
    voucher.stackTiers && Array.isArray(voucher.stackTiers)
      ? voucher.stackTiers.map((tier, index) => normalizeStackTier(tier, index))
      : [createDefaultStackTier()]
  );

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.patch<UpdateVoucherResponse>(`/vouchers/${voucher.id}`, {
        name: form.name,
        description: form.description,
        campaignCategory: form.campaignCategory,
        type: form.type,
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
        isStackable: form.isStackable,
        isActive: form.isActive,
        stackTiers: form.type === 'STACK' ? stackTiers : undefined,
      });

      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Lỗi cập nhật voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#eceef2] p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Sửa Voucher</h2>
            <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 font-mono text-sm font-bold text-[#2140da]">{voucher.code}</span>
          </div>
          <button
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
            onClick={onClose}
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

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị *</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent invalid:border-[#dc2626]"
                required
                value={form.name}
                onChange={e => update('name', e.target.value)}
              />
            </div>

            {/* Campaign + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chiến dịch</label>
                <Select
                  value={form.campaignCategory}
                  onChange={(val) => update('campaignCategory', val)}
                  className="w-full"
                  options={[
                    { value: 'WELCOME', label: '🎉 Welcome' },
                    { value: 'VIP', label: '👑 VIP' },
                    { value: 'BUNDLE', label: '📦 Bundle' },
                    { value: 'FREESHIP', label: '🚚 Freeship' },
                    { value: 'GAMIFICATION', label: '🎰 Vòng quay' },
                    { value: 'REFERRAL', label: '🔗 Referral' },
                    { value: 'BIRTHDAY', label: '🎂 Sinh nhật' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giảm giá</label>
                <Select
                  value={form.type}
                  onChange={(val) => update('type', val)}
                  className="w-full"
                  options={[
                    { value: 'PERCENT', label: 'Giảm %' },
                    { value: 'FIXED_AMOUNT', label: 'Giảm tiền mặt' },
                    { value: 'FREESHIP', label: 'Free ship' },
                    { value: 'STACK', label: '📊 Stack (theo SP)' }
                  ]}
                />
              </div>
            </div>

            {/* Value + Min + Max */}
            <div className="grid grid-cols-3 gap-4">
              {form.type !== 'STACK' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá trị {form.type === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent invalid:border-[#dc2626]"
                    required={form.type !== 'STACK'}
                    value={form.value}
                    onChange={e => update('value', e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.minOrderValue}
                  onChange={e => update('minOrderValue', e.target.value)}
                />
              </div>
              {form.type !== 'STACK' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giảm tối đa (VNĐ)</label>
                  <input
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
                  <h4 className="text-sm font-bold text-gray-800">📊 Bảng mốc giảm giá</h4>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                    onClick={() => setStackTiers(prev => [...prev, createDefaultStackTier(prev.length)])}
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
                      <Select
                        size="xs"
                        className="w-full"
                        value={tier.conditionType || 'products'}
                        onChange={(val) => {
                          const updated = [...stackTiers];
                          updated[idx] = {
                            ...updated[idx],
                            conditionType: normalizeConditionType(val),
                          };
                          setStackTiers(updated);
                        }}
                        options={[
                          { value: 'products', label: 'Số lượng SP' },
                          { value: 'amount', label: 'Mốc tiền' }
                        ]}
                      />
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
                      <Select
                        size="xs"
                        className="w-full"
                        value={tier.type}
                        onChange={(val) => {
                          const updated = [...stackTiers];
                          updated[idx] = {
                            ...updated[idx],
                            type: normalizeDiscountType(val),
                          };
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Kho áp dụng</label>
                <select
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Áp dụng từ</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.validFrom}
                  onChange={e => update('validFrom', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Áp dụng đến</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.validTo}
                  onChange={e => update('validTo', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục áp dụng</label>
                <select
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng SP tối thiểu</label>
                <input
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

            {/* Limits */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn tổng</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.totalUsageLimit}
                  onChange={e => update('totalUsageLimit', e.target.value)}
                  placeholder="Không giới hạn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mỗi KH dùng</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.perCustomerLimit}
                  onChange={e => update('perCustomerLimit', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn dùng (ngày)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.durationDays}
                  onChange={e => update('durationDays', e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                value={form.description}
                onChange={e => update('description', e.target.value)}
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={form.isStackable}
                  onChange={e => update('isStackable', e.target.checked)}
                />
                <span className="text-gray-700">Cho phép cộng dồn</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive as boolean}
                  onClick={() => update('isActive', !form.isActive)}
                  className={`inline-flex h-5 w-[34px] items-center rounded-full p-[2px] transition-colors ${form.isActive ? 'bg-[#2563eb]' : 'bg-[#cbd5e1]'}`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-[14px]' : 'translate-x-0'}`}
                  />
                </button>
                <span className="text-gray-700">Đang hoạt động</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#eceef2] p-6">
            <button
              type="button"
              className="rounded-[10px] border border-gray-300 px-4 py-[9px] text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-[10px] bg-[#2563eb] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

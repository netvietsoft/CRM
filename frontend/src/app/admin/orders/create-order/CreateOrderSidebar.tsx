'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, MapPin, Search, X } from 'lucide-react';
import Select from '@/components/ui/Select';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  CARRIER_OPTIONS,
  DELAY_OPTIONS,
  GENDER_OPTIONS,
  ORDER_STATUS_OPTIONS,
  REASON_GROUPS,
} from './createOrder.constants';
import { CalendarIcon, fmtDate, NumberInput } from './createOrder.helpers';
import type {
  AddressOption,
  Customer,
  ReasonGroup,
} from './createOrder.types';

// Blacklist khách hủy (ID = SĐT): nhập SĐT → cảnh báo "đã hủy đơn x lần" (đếm đơn hoàn/huỷ VTP toàn hệ thống).
function BlacklistWarning({ phone }: { phone: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const p = (phone || '').replace(/\D/g, '');
    if (p.length < 9) { setCount(0); return; }
    const t = setTimeout(() => {
      apiClientClient.get<{ cancelCount: number }>('/viettelpost/blacklist', { params: { phone: p } })
        .then((r) => setCount(r?.cancelCount || 0))
        .catch(() => setCount(0));
    }, 400);
    return () => clearTimeout(t);
  }, [phone]);
  if (!count) return null;
  return (
    <div className="text-[12px] font-semibold text-[#dc2626]">
      ⚠ Khách này đã hủy/hoàn đơn {count} lần — cân nhắc trước khi lên đơn.
    </div>
  );
}

interface CreateOrderSidebarProps {
  status: string;
  onStatusChange: (value: string) => void;
  assigningSellerId: string;
  onAssigningSellerChange: (value: string) => void;
  assigningCareId: string;
  onAssigningCareChange: (value: string) => void;
  staffOptions: Array<{ value: string; label: string }>;
  delayValue: string;
  onDelayChange: (value: string) => void;
  reasonValue: string;
  isReasonOpen: boolean;
  onReasonOpenChange: (value: boolean) => void;
  hoveredReasonGroup: string | null;
  onHoveredReasonGroupChange: (value: string | null) => void;
  onReasonValueChange: (value: string) => void;
  showCustomerSearch: boolean;
  onShowCustomerSearchChange: (value: boolean) => void;
  gender: string;
  onGenderChange: (value: string) => void;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  selectedCustomer: Customer | null;
  onClearSelectedCustomer: () => void;
  customers: Customer[];
  searchingCustomers: boolean;
  onSelectCustomer: (customer: Customer) => void;
  shippingName: string;
  shippingPhone: string;
  customerEmail: string;
  customerDob: string;
  onCustomerDobChange: (value: string) => void;
  onCustomerIdentityChange: (
    field: 'name' | 'phone' | 'email',
    value: string,
  ) => void;
  activeCustomerField: 'name' | 'phone' | 'email' | null;
  onActiveCustomerFieldChange: (value: 'name' | 'phone' | 'email' | null) => void;
  inlineCustomerQuery: string;
  onInlineCustomerQueryChange: (value: string) => void;
  searchingInlineCustomers: boolean;
  inlineCustomerResults: Customer[];
  shippingProvince: string;
  onSelectShippingProvince: (value: string) => void | Promise<void>;
  shippingWard: string;
  onShippingWardChange: (value: string) => void;
  provinces: AddressOption[];
  wards: AddressOption[];
  shippingStreet: string;
  onShippingStreetChange: (value: string) => void;
  carrier: string;
  onCarrierChange: (value: string) => void;
  trackingCode: string;
  onTrackingCodeChange: (value: string) => void;
  shippingFee: number;
  onShippingFeeChange: (value: number) => void;
}

function ReasonDropdown({
  reasonValue,
  isReasonOpen,
  onReasonOpenChange,
  hoveredReasonGroup,
  onHoveredReasonGroupChange,
  onReasonValueChange,
}: {
  reasonValue: string;
  isReasonOpen: boolean;
  onReasonOpenChange: (value: boolean) => void;
  hoveredReasonGroup: string | null;
  onHoveredReasonGroupChange: (value: string | null) => void;
  onReasonValueChange: (value: string) => void;
}) {
  const applyReasonGroup = (group: ReasonGroup) => {
    if (group.options) {
      return;
    }

    onReasonValueChange(group.label);
    onReasonOpenChange(false);
  };

  return (
    <div className="flex-1 w-full relative">
      <button
        onClick={() => onReasonOpenChange(!isReasonOpen)}
        className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 hover:bg-white transition-all rounded px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className="truncate">{reasonValue || 'Chọn lý do'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
            isReasonOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isReasonOpen && (
        <div className="absolute right-0 bottom-full mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[60] py-1">
          <div
            className="px-4 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer transition-colors border-b border-gray-100 font-medium"
            onClick={() => {
              onReasonValueChange('');
              onReasonOpenChange(false);
            }}
          >
            Bỏ chọn lý do
          </div>
          {REASON_GROUPS.map((group) => (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => onHoveredReasonGroupChange(group.label)}
              onMouseLeave={() => onHoveredReasonGroupChange(null)}
              onClick={() => applyReasonGroup(group)}
            >
              <div
                className={`flex items-center justify-between px-4 py-2 text-xs cursor-pointer transition-colors ${
                  hoveredReasonGroup === group.label
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{group.label}</span>
                {group.options && <X className="w-3 h-3 opacity-30 rotate-45" />}
              </div>

              {group.options && hoveredReasonGroup === group.label && (
                <div className="absolute right-full top-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-[70] mr-1">
                  {group.options.map((option) => (
                    <div
                      key={option}
                      className="px-4 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                      onClick={(event) => {
                        event.stopPropagation();
                        onReasonValueChange(option);
                        onReasonOpenChange(false);
                        onHoveredReasonGroupChange(null);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateOrderSidebar({
  status,
  onStatusChange,
  assigningSellerId,
  onAssigningSellerChange,
  assigningCareId,
  onAssigningCareChange,
  staffOptions,
  delayValue,
  onDelayChange,
  reasonValue,
  isReasonOpen,
  onReasonOpenChange,
  hoveredReasonGroup,
  onHoveredReasonGroupChange,
  onReasonValueChange,
  showCustomerSearch,
  onShowCustomerSearchChange,
  gender,
  onGenderChange,
  customerSearch,
  onCustomerSearchChange,
  selectedCustomer,
  onClearSelectedCustomer,
  customers,
  searchingCustomers,
  onSelectCustomer,
  shippingName,
  shippingPhone,
  customerEmail,
  customerDob,
  onCustomerDobChange,
  onCustomerIdentityChange,
  activeCustomerField,
  onActiveCustomerFieldChange,
  inlineCustomerQuery,
  onInlineCustomerQueryChange,
  searchingInlineCustomers,
  inlineCustomerResults,
  shippingProvince,
  onSelectShippingProvince,
  shippingWard,
  onShippingWardChange,
  provinces,
  wards,
  shippingStreet,
  onShippingStreetChange,
  carrier,
  onCarrierChange,
  trackingCode,
  onTrackingCodeChange,
  shippingFee,
  onShippingFeeChange,
}: CreateOrderSidebarProps) {
  return (
    <div className="w-full lg:w-[420px] xl:w-[500px] 2xl:w-[580px] flex flex-col gap-4">
      <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 space-y-4">
        <div className="flex justify-between items-center text-gray-700">
          <span className="font-medium text-xs">Tạo lúc</span>
          <span className="font-bold text-gray-900 text-xs">{fmtDate(new Date())}</span>
        </div>
        <div className="flex items-center text-gray-700 gap-4">
          <span className="font-medium text-xs whitespace-nowrap w-20">Trạng thái</span>
          <div className="flex-1 w-full">
            <Select value={status} onChange={onStatusChange} options={ORDER_STATUS_OPTIONS} className="w-full" />
          </div>
        </div>
        <div className="flex items-center text-gray-700 gap-4">
          <span className="font-medium text-xs whitespace-nowrap w-20">NV xử lý</span>
          <div className="flex-1 w-full">
            <Select
              value={assigningSellerId}
              onChange={onAssigningSellerChange}
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
              onChange={onAssigningCareChange}
              options={staffOptions}
              className="bg-gray-50 border-gray-200 py-1.5"
            />
          </div>
        </div>
        <div className="flex items-center text-gray-700 gap-4">
          <span className="font-medium text-xs whitespace-nowrap w-20">Trễ giao</span>
          <div className="flex-1 w-full">
            <Select value={delayValue} onChange={onDelayChange} options={DELAY_OPTIONS} className="w-full" />
          </div>
        </div>
        <div className="flex items-center text-gray-700 gap-4">
          <span className="font-medium text-xs whitespace-nowrap w-20">Lý do hoàn</span>
          <ReasonDropdown
            reasonValue={reasonValue}
            isReasonOpen={isReasonOpen}
            onReasonOpenChange={onReasonOpenChange}
            hoveredReasonGroup={hoveredReasonGroup}
            onHoveredReasonGroupChange={onHoveredReasonGroupChange}
            onReasonValueChange={onReasonValueChange}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-sm">Khách hàng</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onShowCustomerSearchChange(!showCustomerSearch)}
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
                onChange={onGenderChange}
                options={GENDER_OPTIONS}
                className="bg-gray-50 border-gray-200 py-1 text-xs"
              />
            </div>
          </div>
        </div>

        {showCustomerSearch && (
          <div className="relative">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={customerSearch}
                onChange={(event) => onCustomerSearchChange(event.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 pl-9 pr-3 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
                placeholder="Tìm theo tên, SĐT, email..."
                autoFocus
              />
            </div>
            {selectedCustomer && (
              <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <div className="flex-1">
                  <p className="font-bold text-blue-800 text-sm">
                    {selectedCustomer.name || 'Khách vãng lai'}
                  </p>
                  <p className="text-xs text-blue-600">
                    {selectedCustomer.phone}
                    {selectedCustomer.email ? ` • ${selectedCustomer.email}` : ''}
                  </p>
                </div>
                <button
                  onClick={onClearSelectedCustomer}
                  className="text-blue-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {customers.length > 0 && customerSearch && !selectedCustomer && (
              <div className="mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                {searchingCustomers && (
                  <div className="p-3 text-center text-gray-500 text-xs">Đang tìm...</div>
                )}
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => onSelectCustomer(customer)}
                    className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <p className="font-bold text-gray-900 text-sm">
                      {customer.name || 'Khách vãng lai'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {customer.phone}
                      {customer.email ? ` • ${customer.email}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 relative">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={shippingName}
              onChange={(event) => onCustomerIdentityChange('name', event.target.value)}
              onFocus={() => {
                onActiveCustomerFieldChange('name');
                onInlineCustomerQueryChange(shippingName);
              }}
              onBlur={() => setTimeout(() => onActiveCustomerFieldChange(null), 150)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
              placeholder="Tên khách hàng"
            />
            <input
              value={shippingPhone}
              onChange={(event) => onCustomerIdentityChange('phone', event.target.value)}
              onFocus={() => {
                onActiveCustomerFieldChange('phone');
                onInlineCustomerQueryChange(shippingPhone);
              }}
              onBlur={() => setTimeout(() => onActiveCustomerFieldChange(null), 150)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
              placeholder="SĐT"
            />
          </div>
          <BlacklistWarning phone={shippingPhone} />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={customerEmail}
              onChange={(event) => onCustomerIdentityChange('email', event.target.value)}
              onFocus={() => {
                onActiveCustomerFieldChange('email');
                onInlineCustomerQueryChange(customerEmail);
              }}
              onBlur={() => setTimeout(() => onActiveCustomerFieldChange(null), 150)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
              placeholder="Địa chỉ email"
            />
            <div className="relative">
              <input
                type="date"
                value={customerDob}
                onChange={(event) => onCustomerDobChange(event.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-3 pr-8 py-2 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
              />
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          {activeCustomerField && inlineCustomerQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
              {searchingInlineCustomers && (
                <div className="p-3 text-center text-gray-500 text-xs">Đang tìm...</div>
              )}
              {!searchingInlineCustomers && inlineCustomerResults.length === 0 && (
                <div className="p-3 text-center text-gray-500 text-xs">
                  Không tìm thấy khách hàng phù hợp
                </div>
              )}
              {!searchingInlineCustomers &&
                inlineCustomerResults.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onMouseDown={() => onSelectCustomer(customer)}
                    className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <p className="font-bold text-gray-900 text-sm">
                      {customer.name || 'Khách vãng lai'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[customer.phone, customer.email].filter(Boolean).join(' • ')}
                    </p>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> Nhận hàng
          </h3>
        </div>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Tỉnh/Thành phố *
              </label>
              <Select
                value={shippingProvince}
                onChange={onSelectShippingProvince}
                options={[
                  { value: '', label: 'Chọn Tỉnh/Thành phố' },
                  ...provinces.map((province) => ({
                    value: province.name,
                    label: province.name,
                  })),
                ]}
                className="bg-gray-50 border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Phường/Xã *
              </label>
              <Select
                value={shippingWard}
                onChange={onShippingWardChange}
                disabled={!shippingProvince}
                options={[
                  { value: '', label: 'Chọn Phường/Xã' },
                  ...wards.map((ward) => ({ value: ward.name, label: ward.name })),
                ]}
                className="bg-gray-50 border-gray-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Số nhà, Tên đường *
            </label>
            <input
              value={shippingStreet}
              onChange={(event) => onShippingStreetChange(event.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
              placeholder="Số nhà, đường phố..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-sm">Vận chuyển</h3>
          <div className="w-32">
            <Select
              value={carrier}
              onChange={onCarrierChange}
              options={CARRIER_OPTIONS}
              className="bg-gray-50 border-gray-200 py-1.5 text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 items-center">
          <input
            value={trackingCode}
            onChange={(event) => onTrackingCodeChange(event.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 outline-none focus:bg-white focus:border-blue-500 transition-colors placeholder-gray-400"
            placeholder="Mã vận đơn"
          />
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-700 whitespace-nowrap">Phí</span>
            <div className="flex-1">
              <NumberInput value={shippingFee} onChange={onShippingFeeChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

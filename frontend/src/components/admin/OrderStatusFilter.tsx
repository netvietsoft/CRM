'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const mainStatuses = {
  PENDING: 'Chờ xác nhận',
  WAITING_FOR_GOODS: 'Chờ hàng',
  CONFIRMED: 'Đã xác nhận',
  PACKAGING: 'Đang đóng hàng',
  WAITING_FOR_SHIPPING: 'Chờ vận chuyển',
  SHIPPED: 'Đã gửi hàng',
  DELIVERED: 'Đã nhận',
  PAYMENT_COLLECTED: 'Đã thu tiền',
  COMPLETED: 'Hoàn thành',
  RETURNING: 'Đang hoàn',
  CANCELLED: 'Đã hủy',
};

const extraStatuses = {
  EXCHANGING: 'Đang đổi',
  REFUNDED: 'Hoàn trả',
};

export default function OrderStatusFilter({ counts = {} }: { counts?: Record<string, number> }) {
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || null;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalOrders = Object.values(counts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildUrl = (statusVal: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusVal) {
      params.set('status', statusVal);
    } else {
      params.delete('status');
    }
    params.delete('page');
    return `/admin/orders?${params.toString()}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 flex items-center p-2 gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Link
        href={buildUrl(null)}
        className={`px-3 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all ${
          !currentStatus 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
            : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        Tất cả ({totalOrders})
      </Link>
      {Object.entries(mainStatuses).map(([val, label]) => (
        <Link
          key={val}
          href={buildUrl(val)}
          className={`px-3 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all ${
            currentStatus === val
              ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {label} ({counts[val] || 0})
        </Link>
      ))}
      
      <div className="relative ml-auto" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
            Object.keys(extraStatuses).includes(currentStatus || '')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {Object.keys(extraStatuses).includes(currentStatus || '') 
            ? `${extraStatuses[currentStatus as keyof typeof extraStatuses]} (${counts[currentStatus!] || 0})` 
            : 'Khác'}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {Object.entries(extraStatuses).map(([val, label]) => (
              <Link
                key={val}
                href={buildUrl(val)}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  currentStatus === val
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                  {counts[val] || 0}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

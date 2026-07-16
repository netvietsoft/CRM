'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
  const pathname = usePathname(); // dùng chung cho /admin/orders và /admin/ccm-orders
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
    return `${pathname}?${params.toString()}`;
  };

  const chipClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-all ${
      active
        ? 'bg-[#2563eb] text-white border-transparent shadow-sm shadow-blue-100'
        : 'bg-white text-[#4b5563] border-[#eceef2] hover:bg-[#f9fafb]'
    }`;

  return (
    <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Link href={buildUrl(null)} className={chipClass(!currentStatus)}>
        Tất cả <span className="font-bold opacity-65">{totalOrders}</span>
      </Link>
      {Object.entries(mainStatuses).map(([val, label]) => (
        <Link key={val} href={buildUrl(val)} className={chipClass(currentStatus === val)}>
          {label} <span className="font-bold opacity-65">{counts[val] || 0}</span>
        </Link>
      ))}

      <div className="relative ml-auto shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${chipClass(Object.keys(extraStatuses).includes(currentStatus || ''))} cursor-pointer`}
        >
          {Object.keys(extraStatuses).includes(currentStatus || '')
            ? <>{extraStatuses[currentStatus as keyof typeof extraStatuses]} <span className="font-bold opacity-65">{counts[currentStatus!] || 0}</span></>
            : 'Khác'}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-[#eceef2] rounded-xl p-1.5 z-50 shadow-[0_16px_40px_rgba(15,23,42,0.16)] animate-in fade-in slide-in-from-top-2 duration-200">
            {Object.entries(extraStatuses).map(([val, label]) => (
              <Link
                key={val}
                href={buildUrl(val)}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentStatus === val
                    ? 'bg-[#eff6ff] text-[#2563eb] font-bold'
                    : 'text-[#374151] hover:bg-[#f3f4f6]'
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] bg-[#f3f4f6] text-[#6b7280] px-1.5 py-0.5 rounded-full font-bold">
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

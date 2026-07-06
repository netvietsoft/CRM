'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { customerCareTabs } from '@/lib/adminMessaging';

export default function CustomerCareNav() {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-gray-900">
          Chăm sóc khách hàng
        </h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">
          Chiến dịch, automation và mẫu tin Zalo ZNS / SMS
        </p>
      </div>
      <div className="flex w-fit max-w-full flex-wrap gap-1 overflow-x-auto rounded-xl bg-[#eef0f4] p-1">
        {customerCareTabs.map((tab) => {
          const isActive =
            tab.href === '/admin/customer-care'
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              scroll={false}
              className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-colors ${
                isActive
                  ? 'bg-white text-[#2563eb] shadow-sm'
                  : 'text-[#6b7280] hover:text-gray-900'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { customerCareTabs } from '@/lib/adminMessaging';

export default function CustomerCareNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
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
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

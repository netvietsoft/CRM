'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * UI helpers dùng chung cho các màn "Khách hàng Viettel" — chỉ trình bày (CRM design tokens),
 * không chứa wiring dữ liệu.
 */

const TABS = [
  { label: 'Báo cáo vận hành', href: '/admin/viettel-customers/operations-report' },
  { label: 'Thống kê tiền hàng', href: '/admin/viettel-customers/revenue' },
  { label: 'Đơn cần xử lý', href: '/admin/viettel-customers/pending' },
  { label: 'Danh sách KH', href: '/admin/viettel-customers/customers' },
  { label: 'Danh sách đơn', href: '/admin/viettel-customers' },
];

export function VtTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 bg-[#eef0f4] rounded-xl p-1 w-fit max-w-full overflow-x-auto mb-5">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
              active ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6b7280] hover:text-[#374151]'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Class dùng chung cho input/select trong design system CRM. */
export const vtInput =
  'w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb] transition-colors bg-white';

/** Card trắng, viền #eceef2, bo 14px. */
export const vtCard = 'bg-white border border-[#eceef2] rounded-[14px]';

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Menu ngang trên cùng — các mục chính + Chat/Pancake nổi bật.
const LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/orders', label: 'Đơn hàng' },
  { href: '/admin/customers', label: 'Khách hàng' },
  { href: '/admin/products', label: 'Sản phẩm' },
  { href: '/admin/messenger', label: 'Tin nhắn' },
  { href: '/admin/adsmeta/accall', label: 'Quảng cáo', match: '/admin/adsmeta' },
];

export default function AdminTopNav() {
  const pathname = usePathname();
  const isActive = (l: { href: string; exact?: boolean; match?: string }) => {
    if (l.exact) return pathname === l.href;
    const base = l.match || l.href;
    return pathname === base || pathname.startsWith(base + '/');
  };

  return (
    <nav className="flex items-center gap-1 overflow-x-auto min-w-0">
      {/* Chat/Pancake — nổi bật */}
      <Link
        href="/ccm/conversations"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3b5bdb] text-white text-sm font-semibold hover:bg-[#2f49b0] shrink-0 shadow-sm"
      >
        💬 CCM (Chat)
      </Link>
      <span className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            isActive(l) ? 'bg-blue-50 text-[#2140da]' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

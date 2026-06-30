'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/pancake/conversations', label: 'Hội thoại' },
  { href: '/pancake/orders', label: 'Đơn hàng' },
  { href: '/pancake/posts', label: 'Bài viết' },
  { href: '/pancake/stats', label: 'Thống kê' },
  { href: '/pancake/settings', label: 'Cài đặt' },
];

export default function PancakeTopNav({ userName = 'CHY' }: { userName?: string }) {
  const pathname = usePathname();
  return (
    <header className="h-14 bg-[#3b5bdb] text-white flex items-center px-4 gap-6 shrink-0">
      <Link href="/pancake/conversations" className="flex items-center gap-2 font-semibold text-lg">
        <span className="w-7 h-7 rounded-full bg-white/20 grid place-items-center">◐</span> Pancake
      </Link>
      <nav className="flex items-center gap-1">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link key={t.href} href={t.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#2f49b0]' : 'hover:bg-white/10'}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/admin" className="text-xs text-white/70 hover:text-white" title="Về CRM">← CRM</Link>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-white/20 grid place-items-center text-xs font-bold">{userName.slice(0, 3)}</span>
          <span className="text-sm">{userName}</span>
        </div>
        <span className="w-9 h-9 rounded-full bg-white/15 grid place-items-center">🔔</span>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SubNavItem { href: string; label: string; icon?: string }

export default function SubNav({ title, items }: { title: string; items: SubNavItem[] }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto p-3">
      <h2 className="text-xl font-bold text-gray-800 px-2 py-3">{title}</h2>
      <nav className="space-y-1">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link key={it.href} href={it.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-blue-50 text-[#3b5bdb] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              {it.icon && <span className="w-5 text-center">{it.icon}</span>}{it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

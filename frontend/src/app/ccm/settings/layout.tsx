'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/ccm/settings', label: 'Cài đặt chung', icon: '⚙️' },
  { href: '/ccm/settings/tags', label: 'Thẻ hội thoại', icon: '🏷️' },
  { href: '/ccm/settings/ai', label: 'Trợ lý AI', icon: '✨' },
  { href: '/ccm/settings/quick-reply', label: 'Hỗ trợ trả lời', icon: '💬' },
  { href: '/ccm/settings/shipping', label: 'Vận chuyển (ĐVVC)', icon: '🚚' },
  { href: '/ccm/settings/interface', label: 'Giao diện', icon: '🖥️' },
  { href: '/ccm/settings/calls', label: 'Cuộc gọi', icon: '📞' },
  { href: '/ccm/settings/rotation', label: 'Chế độ xoay vòng', icon: '🔄' },
  { href: '/ccm/settings/sync', label: 'Đồng bộ', icon: '☁️' },
  { href: '/ccm/settings/tools', label: 'Công cụ', icon: '🔧' },
  { href: '/ccm/settings/permissions', label: 'Phân quyền', icon: '🧑‍💼' },
  { href: '/ccm/settings/history', label: 'Lịch sử', icon: '🕐' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="h-full flex">
      <aside className="w-[252px] shrink-0 bg-white border-r border-[#e6e9f2] h-full overflow-y-auto py-[18px] px-3">
        <h2 className="text-[21px] font-extrabold tracking-[-0.4px] px-2.5 mb-3">Cài đặt</h2>
        <nav className="space-y-1">
          {ITEMS.map((it) => {
            const active = pathname === it.href;
            return (
              <Link key={it.href} href={it.href}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-[9px] text-sm transition-colors ${active ? 'bg-[#e9efff] text-[#3c55e6] font-semibold' : 'text-gray-600 hover:bg-[#f3f4f6]'}`}>
                <span className="text-[15px]">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 overflow-y-auto px-[30px] py-[26px]">{children}</div>
    </div>
  );
}

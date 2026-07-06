'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import AdminNotifications from './AdminNotifications';
import AdminTopNav from './AdminTopNav';

interface AdminHeaderProps {
  user: {
    name: string;
    role: string;
  };
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function AdminHeader({ user, onToggleSidebar }: AdminHeaderProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial = (user.name || 'A').trim().charAt(0).toUpperCase();

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiClientClient.post('/auth/logout', {});
    } catch { }
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-[58px] flex-shrink-0 bg-white border-b border-[#e8eaef] flex items-center gap-3.5 px-4 md:px-5">
      <button
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-[#374151] hover:bg-[#f3f4f6] transition-colors"
        onClick={onToggleSidebar}
        title="Toggle Sidebar"
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      {/* ⌘K search (visual only — no command palette wired) */}
      <div className="hidden md:flex items-center gap-2 bg-[#f3f4f6] hover:bg-[#eef0f4] rounded-[10px] px-3 py-2 w-[320px] text-[#9ca3af] cursor-pointer transition-colors">
        <Search size={15} strokeWidth={2} className="flex-shrink-0" />
        <span className="text-[13px] truncate">Tìm khách hàng, đơn hàng…</span>
        <span className="ml-auto text-[10px] bg-white border border-[#e5e7eb] rounded-[5px] px-[5px] py-px text-[#9ca3af] font-mono">⌘K</span>
      </div>

      {/* Quick nav (existing wiring) */}
      <div className="flex-1 min-w-0 hidden lg:block">
        <AdminTopNav />
      </div>
      <div className="flex-1 lg:hidden" />

      <div className="flex items-center gap-2 shrink-0">
        <AdminNotifications />

        {/* Avatar menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-[#e8eaef] hover:bg-[#f9fafb] transition-colors"
          >
            <span className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center font-bold text-[12px]">{initial}</span>
            <span className="hidden md:inline text-[13px] font-semibold text-[#111827] max-w-[120px] truncate">{user.name}</span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] w-[214px] bg-white border border-[#eceef2] rounded-[14px] shadow-[0_16px_48px_rgba(15,23,42,0.18)] z-[110] p-1.5">
              <div className="px-3 py-2.5 border-b border-[#f0f1f5] mb-1">
                <div className="text-[13px] font-bold text-[#111827] truncate">{user.name}</div>
                <div className="text-[11px] text-[#9ca3af] uppercase">{user.role}</div>
              </div>
              <Link
                href="/admin/my-store"
                onClick={() => setUserMenuOpen(false)}
                className="block px-3 py-2 rounded-[9px] text-[13px] font-semibold text-[#374151] hover:bg-[#f3f4f6]"
              >
                Cửa hàng của tôi
              </Link>
              <Link
                href="/admin/qr-config"
                onClick={() => setUserMenuOpen(false)}
                className="block px-3 py-2 rounded-[9px] text-[13px] font-semibold text-[#374151] hover:bg-[#f3f4f6]"
              >
                Cấu hình QR
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="block w-full text-left px-3 py-2 rounded-[9px] text-[13px] font-semibold text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-50"
              >
                {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

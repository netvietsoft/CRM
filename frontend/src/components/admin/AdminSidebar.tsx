'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { LogOut } from 'lucide-react';

interface AdminSidebarProps {
  user: {
    name: string;
    role: string;
    avatarUrl?: string | null;
  };
  isOpen?: boolean;
  unreadCount?: number;
  pendingStoresCount?: number;
  onClose?: () => void;
}

const ALL_ROLES = ['ADMIN', 'STAFF', 'MODERATOR'];
const ADMIN_MODERATOR = ['ADMIN', 'MODERATOR'];
const ADMIN_STAFF = ['ADMIN', 'STAFF'];
const ADMIN_ONLY = ['ADMIN'];

const navItems = [
  {
    label: 'Tổng quan',
    items: [
      { name: 'Dashboard', href: '/admin', roles: ALL_ROLES },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { name: 'Khách hàng', href: '/admin/customers', roles: ADMIN_STAFF },
      { name: 'Nhân viên', href: '/admin/staff', roles: ADMIN_MODERATOR },
      { name: 'Cửa hàng', href: '/admin/stores', roles: ADMIN_ONLY },
      { name: 'Đơn hàng', href: '/admin/orders', roles: ALL_ROLES },
      { name: 'Sản phẩm', href: '/admin/products', roles: ALL_ROLES },
      { name: 'Danh mục', href: '/admin/categories', roles: ALL_ROLES },
    ],
  },
  {
    label: 'Chiến dịch',
    items: [
      { name: 'Voucher', href: '/admin/vouchers', roles: ADMIN_MODERATOR },
      { name: 'Voucher Đơn Hàng', href: '/admin/order-vouchers', roles: ADMIN_MODERATOR },
      { name: 'Referral', href: '/admin/referrals', roles: ADMIN_MODERATOR },
      { name: 'Vòng quay', href: '/admin/spin', roles: ADMIN_MODERATOR },
      { name: 'Voucher Mã Mời', href: '/admin/referral-vouchers', roles: ADMIN_MODERATOR },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { name: 'Kết nối', href: '/admin/integrations', roles: ADMIN_MODERATOR },
      { name: 'Hoa hồng', href: '/admin/commissions', roles: ADMIN_ONLY },
      { name: 'Cấu hình QR', href: '/admin/qr-config', roles: ADMIN_ONLY },
    ],
  },
  {
    label: 'Thông tin',
    items: [
      { name: 'Cửa hàng', href: '/admin/my-store', roles: ['ADMIN', 'MODERATOR'] },
    ],
  },
];

export default function AdminSidebar({ user, isOpen = true, unreadCount = 0, pendingStoresCount = 0, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiClientClient.post('/auth/logout', {});
    } catch { }
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 md:relative bg-white pt-6 text-black w-48 flex-shrink-0 overflow-y-auto transition-transform duration-300 border-r border-gray-200 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-none'}`}>
      
      <div className="md:hidden flex justify-end px-4 mb-2">
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="px-3 pb-6">
        {navItems.map((group) => {
          // Filter items by role
          const visibleItems = group.items.filter(item => item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-6">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </div>
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${isActive(item.href)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : ' hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{item.name}</span>
                  </div>
                  {item.name === 'Đơn hàng' && unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.name === 'Cửa hàng' && pendingStoresCount > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {pendingStoresCount > 99 ? '99+' : pendingStoresCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          );
        })}

        <div className="mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <><span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> Đang đăng xuất...</>
            ) : (
              <><LogOut size={18} /><span>Đăng xuất</span></>
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
}

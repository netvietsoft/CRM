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
      {
        name: 'Kho', roles: ALL_ROLES, children: [
          { name: 'Sản phẩm', href: '/admin/products', roles: ALL_ROLES },
          { name: 'Danh mục', href: '/admin/categories', roles: ALL_ROLES },
          { name: 'Nhà cung cấp', href: '/admin/suppliers', roles: ALL_ROLES },
          { name: 'Chất liệu', href: '/admin/materials', roles: ALL_ROLES },
          { name: 'Đơn vị tính', href: '/admin/units', roles: ALL_ROLES },
          { name: 'Tag sản phẩm', href: '/admin/product-tags', roles: ALL_ROLES },
        ],
      },
      { name: 'Nguồn đơn', href: '/admin/order-sources', roles: ADMIN_STAFF },
      { name: 'Khách hàng Viettel', href: '/admin/viettel-customers', roles: ADMIN_STAFF },
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
    label: 'Chăm sóc KH',
    items: [
      { name: 'Chăm sóc khách hàng', href: '/admin/customer-care', roles: ADMIN_STAFF },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { name: 'Kết nối', href: '/admin/integrations', roles: ADMIN_MODERATOR },
      { name: 'Phân hạng', href: '/admin/ranks', roles: ADMIN_ONLY },
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
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

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
              {visibleItems.map((item) => {
                const children = (item as { children?: { name: string; href: string; roles: string[] }[] }).children;
                // Menu cha có submenu (vd "Kho") — click để sổ ra
                if (children) {
                  const kids = children.filter(c => c.roles.includes(user.role));
                  if (kids.length === 0) return null;
                  const childActive = kids.some(c => isActive(c.href));
                  const open = openMenus[item.name] ?? childActive;
                  return (
                    <div key={item.name} className="mb-1">
                      <button
                        type="button"
                        onClick={() => setOpenMenus(m => ({ ...m, [item.name]: !open }))}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${childActive ? 'text-blue-600' : 'hover:bg-gray-100'}`}
                      >
                        <span>{item.name}</span>
                        <span className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                      </button>
                      {open && (
                        <div className="ml-3 mt-1 mb-1 pl-2 border-l border-gray-200 space-y-1">
                          {kids.map(c => (
                            <Link
                              key={c.href}
                              href={c.href}
                              className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${isActive(c.href) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-100'}`}
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                // Menu thường (có href)
                const href = (item as { href: string }).href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${isActive(href)
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
                );
              })}
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

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  LogOut,
  LayoutDashboard,
  BarChart3,
  Link2,
  Users,
  ShoppingBag,
  MessageSquare,
  MessagesSquare,
  Package,
  GitBranch,
  Truck,
  Ticket,
  Share2,
  Disc3,
  HeartHandshake,
  Plug,
  Trophy,
  Percent,
  QrCode,
  Store,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import AdsSidebarMenu from './AdsSidebarMenu';

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

type NavLeaf = { name: string; href: string; roles: string[]; icon?: LucideIcon };
type NavParent = { name: string; roles: string[]; icon?: LucideIcon; children: NavLeaf[] };
type NavItem = NavLeaf | NavParent;
type NavGroup = { label: string; items: NavItem[] };

const navItems: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { name: 'Dashboard', href: '/admin', roles: ALL_ROLES, icon: LayoutDashboard },
    ],
  },
  {
    label: 'Phân tích',
    items: [
      { name: 'Lãi/Lỗ sản phẩm', href: '/admin/analytics', roles: ADMIN_MODERATOR, icon: BarChart3 },
      { name: 'Gán quảng cáo ↔ SP', href: '/admin/analytics/ad-mapping', roles: ADMIN_MODERATOR, icon: Link2 },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { name: 'Khách hàng Pancake', href: '/admin/pancake-customers', roles: ADMIN_STAFF, icon: Users },
      { name: 'Nhân viên', href: '/admin/staff', roles: ADMIN_MODERATOR, icon: Users },
      { name: 'Cửa hàng', href: '/admin/stores', roles: ADMIN_ONLY, icon: Store },
      { name: 'Đơn hàng', href: '/admin/orders', roles: ALL_ROLES, icon: ShoppingBag },
      { name: 'Đơn hàng CCM', href: '/admin/ccm-orders', roles: ALL_ROLES, icon: MessagesSquare },
      { name: 'Tin nhắn', href: '/admin/messenger', roles: ALL_ROLES, icon: MessageSquare },
      { name: 'CCM', href: '/ccm/conversations', roles: ALL_ROLES, icon: MessagesSquare },
      {
        name: 'Kho', roles: ALL_ROLES, icon: Package, children: [
          { name: 'Danh sách Kho', href: '/admin/warehouses', roles: ALL_ROLES },
          { name: 'Sản phẩm', href: '/admin/products', roles: ALL_ROLES },
          { name: 'Danh mục', href: '/admin/categories', roles: ALL_ROLES },
          { name: 'Nhà cung cấp', href: '/admin/suppliers', roles: ALL_ROLES },
          { name: 'Chất liệu', href: '/admin/materials', roles: ALL_ROLES },
          { name: 'Đơn vị tính', href: '/admin/units', roles: ALL_ROLES },
          { name: 'Tag sản phẩm', href: '/admin/product-tags', roles: ALL_ROLES },
        ],
      },
      { name: 'Nguồn đơn', href: '/admin/order-sources', roles: ADMIN_STAFF, icon: GitBranch },
      {
        name: 'Khách hàng Viettel', roles: ADMIN_STAFF, icon: Truck, children: [
          { name: 'Báo cáo vận hành', href: '/admin/viettel-customers/operations-report', roles: ADMIN_STAFF },
          { name: 'Thống kê tiền hàng', href: '/admin/viettel-customers/revenue', roles: ADMIN_STAFF },
          { name: 'Đơn cần xử lý', href: '/admin/viettel-customers/pending', roles: ADMIN_STAFF },
          { name: 'Đơn hàng đã huỷ', href: '/admin/viettel-customers/ordercancel', roles: ADMIN_STAFF },
          { name: 'Danh sách khách hàng', href: '/admin/viettel-customers/customers', roles: ADMIN_STAFF },
          { name: 'Danh sách đơn', href: '/admin/viettel-customers', roles: ADMIN_STAFF },
        ],
      },
    ],
  },
  {
    label: 'Chiến dịch',
    items: [
      { name: 'Voucher', href: '/admin/vouchers', roles: ADMIN_MODERATOR, icon: Ticket },
      { name: 'Voucher Đơn Hàng', href: '/admin/order-vouchers', roles: ADMIN_MODERATOR, icon: Ticket },
      { name: 'Referral', href: '/admin/referrals', roles: ADMIN_MODERATOR, icon: Share2 },
      { name: 'Vòng quay', href: '/admin/spin', roles: ADMIN_MODERATOR, icon: Disc3 },
      { name: 'Voucher Mã Mời', href: '/admin/referral-vouchers', roles: ADMIN_MODERATOR, icon: Ticket },
    ],
  },
  {
    label: 'Chăm sóc KH',
    items: [
      { name: 'Chăm sóc khách hàng', href: '/admin/customer-care', roles: ADMIN_STAFF, icon: HeartHandshake },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { name: 'Kết nối', href: '/admin/integrations', roles: ADMIN_MODERATOR, icon: Plug },
      { name: 'Phân hạng', href: '/admin/ranks', roles: ADMIN_ONLY, icon: Trophy },
      { name: 'Hoa hồng', href: '/admin/commissions', roles: ADMIN_ONLY, icon: Percent },
      { name: 'Cấu hình QR', href: '/admin/qr-config', roles: ADMIN_ONLY, icon: QrCode },
    ],
  },
  {
    label: 'Thông tin',
    items: [
      { name: 'Cửa hàng', href: '/admin/my-store', roles: ['ADMIN', 'MODERATOR'], icon: Store },
    ],
  },
];

// Tất cả href dạng phẳng — dùng để chọn "khớp dài nhất thắng" khi route cha là tiền tố của route con
const ALL_HREFS: string[] = navItems.flatMap((g) =>
  g.items.flatMap((it) => {
    const ch = (it as NavParent).children;
    return ch ? ch.map((c) => c.href) : [(it as NavLeaf).href];
  }),
);

export default function AdminSidebar({ user, isOpen = true, unreadCount = 0, pendingStoresCount = 0, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
    const matches = (h: string) => pathname === h || pathname.startsWith(h + '/');
    if (!matches(href)) return false;
    // Khớp dài nhất thắng: tránh route cha (tiền tố) sáng cùng route con
    const best = ALL_HREFS
      .filter((h) => h !== '/admin' && matches(h))
      .reduce((a, b) => (b.length > a.length ? b : a), '');
    return href === best;
  };

  const initial = (user.name || 'A').trim().charAt(0).toUpperCase();

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 md:relative bg-white text-[#111827] w-[248px] flex-shrink-0 flex flex-col overflow-y-auto transition-transform duration-300 border-r border-[#e8eaef] ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-none'}`}>

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-[18px] pb-3.5">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-[#2140da] flex items-center justify-center text-white font-extrabold text-[15px] tracking-[-0.5px]">NV</div>
        <div className="min-w-0">
          <div className="font-extrabold text-[14px] tracking-[-0.2px] text-[#111827]">NetViet CRM</div>
          <div className="text-[11px] text-[#9ca3af] font-medium">Quản trị hệ thống</div>
        </div>
        <button onClick={onClose} className="md:hidden ml-auto p-1.5 text-gray-400 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="px-3 pt-1.5 pb-5 flex-1">
        {navItems.map((group) => {
          // Filter items by role
          const visibleItems = group.items.filter(item => item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;
          const groupActive = visibleItems.some((it) => {
            const ch = (it as NavParent).children;
            return ch ? ch.some(c => isActive(c.href)) : isActive((it as NavLeaf).href);
          });
          const gOpen = openGroups[group.label] ?? true;

          return (
            <div key={group.label} className="mb-3.5">
              <button
                type="button"
                onClick={() => setOpenGroups(g => ({ ...g, [group.label]: !gOpen }))}
                className="flex items-center justify-between w-full px-2.5 mb-1.5 text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#8a91a3] hover:text-[#6b7280]"
              >
                <span>{group.label}</span>
                <ChevronRight size={12} className={`transition-transform ${gOpen ? 'rotate-90' : ''} ${groupActive ? 'text-[#2563eb]' : 'text-[#c4c9d4]'}`} />
              </button>
              {gOpen && (<div className="space-y-0.5">
              {visibleItems.map((item) => {
                const children = (item as NavParent).children;
                const ItemIcon = item.icon;
                // Menu cha có submenu (vd "Kho") — click để sổ ra
                if (children) {
                  const kids = children.filter(c => c.roles.includes(user.role));
                  if (kids.length === 0) return null;
                  const childActive = kids.some(c => isActive(c.href));
                  const open = openMenus[item.name] ?? childActive;
                  return (
                    <div key={item.name}>
                      <button
                        type="button"
                        onClick={() => setOpenMenus(m => ({ ...m, [item.name]: !open }))}
                        className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium transition-colors ${childActive ? 'text-[#2563eb]' : 'text-[#374151] hover:bg-[#f3f4f6]'}`}
                      >
                        {ItemIcon && <ItemIcon size={17} strokeWidth={1.8} className="flex-shrink-0" />}
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronRight size={14} className={`text-[#9ca3af] transition-transform ${open ? 'rotate-90' : ''}`} />
                      </button>
                      {open && (
                        <div className="ml-[26px] mt-0.5 mb-1 pl-2.5 border-l border-[#eceef2] space-y-0.5">
                          {kids.map(c => (
                            <Link
                              key={c.href}
                              href={c.href}
                              className={`block px-2.5 py-1.5 rounded-[8px] text-[13px] transition-colors ${isActive(c.href) ? 'bg-[#2563eb] text-white font-semibold' : 'text-[#4b5563] hover:bg-[#f3f4f6]'}`}
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
                const href = (item as NavLeaf).href;
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13px] font-medium transition-colors ${active
                      ? 'bg-[#2563eb] text-white font-semibold'
                      : 'text-[#374151] hover:bg-[#f3f4f6]'
                      }`}
                  >
                    {ItemIcon && <ItemIcon size={17} strokeWidth={1.8} className="flex-shrink-0" />}
                    <span className="flex-1">{item.name}</span>
                    {item.name === 'Đơn hàng' && unreadCount > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-px rounded-full min-w-[18px] text-center ${active ? 'bg-white text-[#2563eb]' : 'bg-[#ef4444] text-white'}`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {item.name === 'Cửa hàng' && pendingStoresCount > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-px rounded-full min-w-[18px] text-center ${active ? 'bg-white text-[#b45309]' : 'bg-amber-500 text-white'}`}>
                        {pendingStoresCount > 99 ? '99+' : pendingStoresCount}
                      </span>
                    )}
                  </Link>
                );
              })}
              </div>)}
            </div>
          );
        })}

        <AdsSidebarMenu role={user.role} />
      </nav>

      {/* Footer: user + logout */}
      <div className="px-4 py-3 border-t border-[#f0f1f5] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0">{initial}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate">{user.name}</div>
          <div className="text-[11px] text-[#9ca3af] uppercase">{user.role}</div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Đăng xuất"
          className="p-1.5 rounded-lg text-[#ef4444] hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {loggingOut ? (
            <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin block" />
          ) : (
            <LogOut size={16} strokeWidth={2} />
          )}
        </button>
      </div>
    </aside>
  );
}

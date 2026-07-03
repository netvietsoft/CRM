'use client';

import { Menu } from 'lucide-react';
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

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  return (
    <header className="bg-[#f0f2f5] border-b border-gray-200 px-2 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          <Menu size={24} className="text-gray-600" />
        </button>
        <AdminTopNav />
      </div>

      <div className="flex items-center gap-4 shrink-0 pl-3">
        <AdminNotifications />
      </div>
    </header>
  );
}

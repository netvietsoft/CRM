'use client';

import { Menu } from 'lucide-react';
import AdminNotifications from './AdminNotifications';

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
    <header className="bg-white border-b border-gray-200 px-2 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          <Menu size={24} className="text-gray-600" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <AdminNotifications />
      </div>
    </header>
  );
}

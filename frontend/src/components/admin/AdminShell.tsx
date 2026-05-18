'use client';

import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import PageTransition from '@/components/ui/PageTransition';

interface AdminShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: string;
    avatarUrl?: string | null;
  };
  unreadCount?: number;
  pendingStoresCount?: number;
}

export default function AdminShell({ children, user, unreadCount = 0, pendingStoresCount = 0 }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <AdminSidebar 
        user={user} 
        isOpen={isSidebarOpen} 
        unreadCount={unreadCount} 
        pendingStoresCount={pendingStoresCount}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="w-full">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}


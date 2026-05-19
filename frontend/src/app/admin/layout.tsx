import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';
import { apiClient } from '@/lib/apiClient';

interface AdminDashboardMeta {
  unreadCount?: number;
  pendingStoresCount?: number;
  isStoreActive?: boolean;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!['ADMIN', 'STAFF', 'MODERATOR'].includes(session.role)) {
    redirect('/portal');
  }

  // Fetch meta data from backend
  let unreadCount = 0;
  let pendingStoresCount = 0;
  let isStoreActive = true;

  try {
    const meta = await apiClient.get<AdminDashboardMeta>('/admin/dashboard-meta');
    unreadCount = meta.unreadCount ?? 0;
    pendingStoresCount = meta.pendingStoresCount ?? 0;
    isStoreActive = meta.isStoreActive ?? true;
  } catch (error) {
    console.error('Error fetching admin dashboard meta:', error);
  }

  // Block Moderator if their store is not yet approved
  if (session.role === 'MODERATOR' && !isStoreActive) {
    redirect('/portal/seller-register');
  }

  const adminUser = {
    ...session,
    name: session.name || 'Quản trị viên',
  };

  return (
    <AdminShell
      user={adminUser}
      unreadCount={unreadCount}
      pendingStoresCount={pendingStoresCount}
    >
      {children}
    </AdminShell>
  );
}

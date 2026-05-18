import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import { getSession } from '@/lib/auth';
import StaffAssignForm from '@/components/admin/StaffAssignForm';

export default async function StaffAssignPage() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MODERATOR')) {
    redirect('/admin');
  }

  let stores: any[] = [];
  try {
    // Only ADMIN needs to see all stores
    if (session.role === 'ADMIN') {
      stores = await apiClient.get<any[]>('/stores/admin');
    } else {
      // Moderators only manage their own store
      const moderatorStores = await apiClient.get<any[]>('/stores/admin');
      stores = moderatorStores; // Scoped by backend usually, but we check role in form
    }
  } catch (error) {
    console.error('Error fetching stores for staff assignment:', error);
  }

  return (
    <div className="py-8">
      <StaffAssignForm stores={stores} currentUser={session} />
    </div>
  );
}

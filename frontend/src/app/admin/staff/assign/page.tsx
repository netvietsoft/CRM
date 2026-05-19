import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import { getSession } from '@/lib/auth';
import StaffAssignForm from '@/components/admin/StaffAssignForm';

interface StoreSummary {
  id: string;
  name: string | null;
}

export default async function StaffAssignPage() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MODERATOR')) {
    redirect('/admin');
  }

  let stores: StoreSummary[] = [];
  try {
    stores = await apiClient.get<StoreSummary[]>('/stores/admin');
  } catch (error) {
    console.error('Error fetching stores for staff assignment:', error);
  }

  return (
    <div className="py-8">
      <StaffAssignForm stores={stores} currentUser={session} />
    </div>
  );
}

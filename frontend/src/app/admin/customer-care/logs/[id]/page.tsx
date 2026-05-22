import { apiClient } from '@/lib/apiClient';
import CustomerCareLogDetailClient from '@/components/admin/customer-care/CustomerCareLogDetailClient';
import { MessageLogRecord } from '@/lib/adminMessaging';

export const dynamic = 'force-dynamic';

export default async function CustomerCareLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let initialLog: MessageLogRecord | null = null;

  try {
    initialLog = await apiClient.get<MessageLogRecord>(`/admin/messaging/logs/${id}`);
  } catch (error) {
    console.error('Error fetching log detail:', error);
  }

  return <CustomerCareLogDetailClient logId={id} initialLog={initialLog} />;
}

import { apiClient } from '@/lib/apiClient';
import CustomerCareLogsClient from '@/components/admin/customer-care/CustomerCareLogsClient';
import { MessageLogRecord, PaginatedResponse } from '@/lib/adminMessaging';

export const dynamic = 'force-dynamic';

export default async function CustomerCareLogsPage() {
  let initialData: PaginatedResponse<MessageLogRecord> = {
    items: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };

  try {
    initialData = await apiClient.get<PaginatedResponse<MessageLogRecord>>(
      '/admin/messaging/logs',
      {
        params: {
          page: 1,
          limit: 20,
          channelCode: 'SMS',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching initial logs:', error);
  }

  return <CustomerCareLogsClient initialData={initialData} />;
}

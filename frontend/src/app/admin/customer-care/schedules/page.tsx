import { apiClient } from '@/lib/apiClient';
import CustomerCareSchedulesClient from '@/components/admin/customer-care/CustomerCareSchedulesClient';
import { MessageScheduleRecord, PaginatedResponse } from '@/lib/adminMessaging';

export const dynamic = 'force-dynamic';

export default async function CustomerCareSchedulesPage() {
  let initialData: PaginatedResponse<MessageScheduleRecord> = {
    items: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };

  try {
    initialData = await apiClient.get<PaginatedResponse<MessageScheduleRecord>>(
      '/admin/messaging/schedules',
      {
        params: {
          page: 1,
          limit: 20,
          channelCode: 'SMS',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching initial schedules:', error);
  }

  return <CustomerCareSchedulesClient initialData={initialData} />;
}

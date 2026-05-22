import { apiClient } from '@/lib/apiClient';
import CustomerCareTemplatesClient from '@/components/admin/customer-care/CustomerCareTemplatesClient';
import { MessageTemplateRecord, PaginatedResponse } from '@/lib/adminMessaging';

export const dynamic = 'force-dynamic';

export default async function CustomerCareTemplatesPage() {
  let initialTemplates: MessageTemplateRecord[] = [];

  try {
    const data = await apiClient.get<PaginatedResponse<MessageTemplateRecord>>(
      '/admin/messaging/templates',
      {
        params: {
          page: 1,
          limit: 100,
        },
      },
    );
    initialTemplates = data.items || [];
  } catch (error) {
    console.error('Error fetching initial templates:', error);
  }

  return <CustomerCareTemplatesClient initialTemplates={initialTemplates} />;
}

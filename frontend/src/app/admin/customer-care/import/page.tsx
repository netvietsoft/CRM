import { apiClient } from '@/lib/apiClient';
import CustomerCareImportClient from '@/components/admin/customer-care/CustomerCareImportClient';
import {
  MessageCampaignRecord,
  MessageTemplateRecord,
  PaginatedResponse,
} from '@/lib/adminMessaging';

export const dynamic = 'force-dynamic';

export default async function CustomerCareImportPage() {
  let initialTemplates: MessageTemplateRecord[] = [];
  let initialImportCampaigns: MessageCampaignRecord[] = [];

  try {
    const [templateData, campaignData] = await Promise.all([
      apiClient.get<PaginatedResponse<MessageTemplateRecord>>('/admin/messaging/templates', {
        params: {
          page: 1,
          limit: 100,
          channelCode: 'SMS',
          isActive: true,
        },
      }),
      apiClient.get<PaginatedResponse<MessageCampaignRecord>>('/admin/messaging/campaigns', {
        params: {
          page: 1,
          limit: 100,
          channelCode: 'SMS',
        },
      }),
    ]);

    initialTemplates = templateData.items || [];
    initialImportCampaigns = (campaignData.items || [])
      .filter((campaign) => campaign.audienceSource === 'IMPORT')
      .slice(0, 10);
  } catch (error) {
    console.error('Error fetching initial import page data:', error);
  }

  return (
    <CustomerCareImportClient
      initialTemplates={initialTemplates}
      initialImportCampaigns={initialImportCampaigns}
    />
  );
}

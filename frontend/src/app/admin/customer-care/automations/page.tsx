import { apiClient } from '@/lib/apiClient';
import CustomerCareAutomationsClient from '@/components/admin/customer-care/CustomerCareAutomationsClient';
import { MessageAutomationRuleRecord } from '@/lib/adminMessaging';

export const dynamic = 'force-dynamic';

export default async function CustomerCareAutomationsPage() {
  let initialRules: MessageAutomationRuleRecord[] = [];

  try {
    initialRules = await apiClient.get<MessageAutomationRuleRecord[]>(
      '/admin/messaging/automation-rules',
    );
  } catch (error) {
    console.error('Error fetching initial automations:', error);
  }

  return <CustomerCareAutomationsClient initialRules={initialRules} />;
}

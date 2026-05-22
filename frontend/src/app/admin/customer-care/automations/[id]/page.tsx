import { apiClient } from '@/lib/apiClient';
import CustomerCareAutomationDetailClient from '@/components/admin/customer-care/CustomerCareAutomationDetailClient';
import {
  MessageAutomationExecutionRecord,
  MessageAutomationRuleDetailRecord,
  PaginatedResponse,
} from '@/lib/adminMessaging';

export const dynamic = 'force-dynamic';

export default async function CustomerCareAutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let initialRule: MessageAutomationRuleDetailRecord | null = null;
  let initialExecutions: PaginatedResponse<MessageAutomationExecutionRecord> = {
    items: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };

  try {
    const [ruleData, executionData] = await Promise.all([
      apiClient.get<MessageAutomationRuleDetailRecord>(`/admin/messaging/automation-rules/${id}`),
      apiClient.get<PaginatedResponse<MessageAutomationExecutionRecord>>(
        `/admin/messaging/automation-rules/${id}/executions`,
        {
          params: {
            page: 1,
            limit: 20,
          },
        },
      ),
    ]);

    initialRule = ruleData;
    initialExecutions = executionData;
  } catch (error) {
    console.error('Error fetching automation detail:', error);
  }

  return (
    <CustomerCareAutomationDetailClient
      ruleId={id}
      initialRule={initialRule}
      initialExecutions={initialExecutions}
    />
  );
}

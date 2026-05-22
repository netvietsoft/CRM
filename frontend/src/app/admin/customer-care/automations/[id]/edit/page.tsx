import CustomerCareAutomationFormClient from '@/components/admin/customer-care/CustomerCareAutomationFormClient';

export const dynamic = 'force-dynamic';

export default async function CustomerCareAutomationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CustomerCareAutomationFormClient ruleId={id} />;
}

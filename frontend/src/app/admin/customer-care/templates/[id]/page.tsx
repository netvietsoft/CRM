import CustomerCareTemplateFormClient from '@/components/admin/customer-care/CustomerCareTemplateFormClient';

export const dynamic = 'force-dynamic';

interface CustomerCareTemplateEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerCareTemplateEditPage({
  params,
}: CustomerCareTemplateEditPageProps) {
  const { id } = await params;

  return <CustomerCareTemplateFormClient templateId={id} />;
}

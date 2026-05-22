import CustomerCareCampaignDetailClient from '@/components/admin/customer-care/CustomerCareCampaignDetailClient';

export const dynamic = 'force-dynamic';

export default async function CustomerCareCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CustomerCareCampaignDetailClient campaignId={id} />;
}

'use client';
export const dynamic = 'force-dynamic';

import { useParams } from 'next/navigation';
import AdsDashboard from '@/components/admin/AdsDashboard';

// Một tài khoản quảng cáo Meta theo path /admin/adsmeta/<accountId>.
export default function AdsAccountPage() {
  const params = useParams<{ accountId: string }>();
  const accountId = Array.isArray(params.accountId) ? params.accountId[0] : params.accountId || '';
  return <AdsDashboard accountId={accountId} />;
}

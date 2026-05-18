import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@/lib/auth';
import PortalNavbar from '@/components/customer/PortalNavbar';
import FloatingCartButton from '@/components/customer/FloatingCartButton';
import Footer from '@/components/customer/Footer';
import QrClaimModal from '@/components/customer/QrClaimModal';
import PortalContent from '@/components/customer/PortalContent';
import { apiClient } from '@/lib/apiClient';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    // Preserve the current URL (with query params like campaign=qr_claim) as returnTo
    const headersList = await headers();
    const fullUrl = headersList.get('x-invoke-path') || headersList.get('x-url') || '';
    const queryString = headersList.get('x-invoke-query') || '';
    let returnTo = '/portal';
    if (fullUrl) {
      returnTo = fullUrl;
    }
    if (queryString) {
      try {
        const params = JSON.parse(queryString);
        const qs = new URLSearchParams(params).toString();
        if (qs) returnTo += (returnTo.includes('?') ? '&' : '?') + qs;
      } catch {}
    }
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  if (session.role === 'ADMIN' || session.role === 'STAFF') redirect('/admin');

  let meta: any = {
    onboardingComplete: true,
    rank: 'MEMBER',
    cartItemCount: 0,
    spentInLast30Days: 0,
  };

  try {
    meta = await apiClient.get<any>('/users/portal-layout-meta');
  } catch (error) {
    console.error('Error fetching portal layout meta:', error);
  }

  // Redirect to onboarding if not completed (only for first-time users)
  if (!meta.onboardingComplete) {
    const headersList = await headers();
    const fullUrl = headersList.get('x-invoke-path') || headersList.get('x-url') || '/portal';
    const queryString = headersList.get('x-invoke-query') || '';
    let returnTo = fullUrl;
    if (queryString) {
      try {
        const params = JSON.parse(queryString);
        const qs = new URLSearchParams(params).toString();
        if (qs) returnTo += (returnTo.includes('?') ? '&' : '?') + qs;
      } catch {}
    }
    redirect(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const rankProgress: Record<string, { next: string | 'MAX', target: number }> = {
    MEMBER: { next: 'SILVER', target: 2000000 },
    SILVER: { next: 'GOLD', target: 5000000 },
    GOLD: { next: 'DIAMOND', target: 7000000 },
    DIAMOND: { next: 'PLATINUM', target: 10000000 },
    PLATINUM: { next: 'MAX', target: 0 },
  };

  const spentInLast30Days = meta.spentInLast30Days || 0;
  let effectiveRank = meta.rank || 'MEMBER';
  let progress = rankProgress[effectiveRank];
  
  while (progress && progress.target > 0 && spentInLast30Days >= progress.target) {
    if (progress.next !== 'MAX') {
      effectiveRank = progress.next;
      progress = rankProgress[effectiveRank];
    } else {
      break;
    }
  }

  const enrichedSession = { ...session, rank: effectiveRank };
  const cartItemCount = meta.cartItemCount || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PortalNavbar user={enrichedSession} />
      <main className="flex-1 py-4 md:py-8">
        <div className="w-full px-4 md:w-[80%] md:px-0 mx-auto">
          <PortalContent>
            {children}
          </PortalContent>
        </div>
      </main>
      <FloatingCartButton itemCount={cartItemCount} />
      <Footer />
      <QrClaimModal />
    </div>
  );
}

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@/lib/auth';
import PortalNavbar from '@/components/customer/PortalNavbar';
import FloatingCartButton from '@/components/customer/FloatingCartButton';
import Footer from '@/components/customer/Footer';
import QrClaimModal from '@/components/customer/QrClaimModal';
import PortalContent from '@/components/customer/PortalContent';
import { apiClient } from '@/lib/apiClient';

interface PortalSessionUser {
  role?: string | null;
  name?: string | null;
  referralCode?: string | null;
  totalSpent?: number | null;
  commissionBalance?: number | null;
  avatarUrl?: string | null;
}

interface PortalLayoutMeta {
  onboardingComplete: boolean;
  rank: string;
  cartItemCount: number;
  hasStore?: boolean;
  store?: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession() as PortalSessionUser | null;

  if (!session) {
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

  let meta: PortalLayoutMeta = {
    onboardingComplete: true,
    rank: 'MEMBER',
    cartItemCount: 0,
  };

  try {
    meta = await apiClient.get<PortalLayoutMeta>('/users/portal-layout-meta');
  } catch (error) {
    console.error('Error fetching portal layout meta:', error);
  }

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

  const navbarUser = {
    name: session.name || 'Người dùng',
    rank: meta.rank || 'MEMBER',
    referralCode: session.referralCode || '',
    totalSpent: session.totalSpent || 0,
    commissionBalance: session.commissionBalance || 0,
    avatarUrl: session.avatarUrl || null,
  };
  const cartItemCount = meta.cartItemCount || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PortalNavbar user={navbarUser} />
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

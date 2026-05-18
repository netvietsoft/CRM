'use client';

import PageTransition from '@/components/ui/PageTransition';

export default function PortalContent({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      {children}
    </PageTransition>
  );
}

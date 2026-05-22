import type { ReactNode } from 'react';
import CustomerCareNav from '@/components/admin/customer-care/CustomerCareNav';

export default function CustomerCareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <CustomerCareNav />
      {children}
    </div>
  );
}

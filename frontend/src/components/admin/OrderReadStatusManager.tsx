'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { markOrderAsRead } from '@/app/admin/orders/actions';

export default function OrderReadStatusManager({ orderId, isRead }: { orderId: string, isRead: boolean }) {
  const router = useRouter();
  
  useEffect(() => {
    if (!isRead) {
      markOrderAsRead(orderId).then(() => {
        router.refresh();
      });
    }
  }, [orderId, isRead, router]);

  return null;
}

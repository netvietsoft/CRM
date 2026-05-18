import React from 'react';
import { getSession } from '@/lib/auth';
import CreateOrderClient from './CreateOrderClient';

export default async function CreateOrderPage() {
  const session = await getSession();

  if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF' && session.role !== 'MODERATOR')) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  return <CreateOrderClient currentUser={session} />;
}

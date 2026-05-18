import React from 'react';
import { getSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import CreateProductClient from './CreateProductClient';

export default async function CreateProductPage() {
  const session = await getSession();
  
  if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF' && session.role !== 'MODERATOR')) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const categoriesRes = await apiClient.get<any[]>('/categories');
  const categories = categoriesRes || [];

  return <CreateProductClient categories={categories} />;
}

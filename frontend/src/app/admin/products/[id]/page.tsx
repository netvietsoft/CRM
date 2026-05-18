import React from 'react';
import { getSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import EditProductClient from './EditProductClient';
import { notFound } from 'next/navigation';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF' && session.role !== 'MODERATOR')) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const { id } = await params;

  let product;
  try {
    product = await apiClient.get<any>(`/products/${id}`);
  } catch {
    notFound();
  }

  const categoriesRes = await apiClient.get<any[]>('/categories');
  const categories = categoriesRes || [];

  return <EditProductClient product={product} categories={categories} />;
}

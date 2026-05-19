import React from 'react';
import { getSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import EditProductClient, { type ProductCategory, type ProductFormProduct } from './EditProductClient';
import { notFound } from 'next/navigation';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF' && session.role !== 'MODERATOR')) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const { id } = await params;

  let product: ProductFormProduct;
  try {
    product = await apiClient.get<ProductFormProduct>(`/products/${id}`);
  } catch {
    notFound();
  }

  const categoriesRes = await apiClient.get<ProductCategory[]>('/categories');
  const categories = categoriesRes || [];

  return <EditProductClient product={product} categories={categories} />;
}

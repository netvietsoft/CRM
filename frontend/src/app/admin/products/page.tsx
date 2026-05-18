import React from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import ProductsClient from '@/components/admin/ProductsClient';
import { getSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';

export default async function ProductsPage() {
  const session = await getSession();
  
  if (!session) {
    return null;
  }

  // Fetch products and categories in parallel
  const [productsRes, categoriesRes] = await Promise.all([
    apiClient.get<any>('/products/admin?limit=1000'),
    apiClient.get<any[]>('/categories'),
  ]);

  const products = productsRes.data;
  const categories = categoriesRes;

  return (
    <ProductsClient 
      products={products} 
      categories={categories} 
      userRole={session.role}
    />
  );
}

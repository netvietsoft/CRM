'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { apiClientClient } from '@/lib/apiClientClient';

interface CreateProductClientProps {
  categories: any[];
}

export default function CreateProductClient({ categories }: CreateProductClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post<any>('/products', data);
      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi tạo sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductForm
      categories={categories}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      title="Tạo Sản phẩm mới"
      submitButtonText={loading ? 'Đang tạo...' : 'Tạo Sản phẩm'}
    />
  );
}

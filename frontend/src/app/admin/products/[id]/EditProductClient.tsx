'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { apiClientClient } from '@/lib/apiClientClient';

interface EditProductClientProps {
  product: any;
  categories: any[];
}

export default function EditProductClient({ product, categories }: EditProductClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError('');

    try {
      await apiClientClient.patch<any>(`/products/${product.id}`, data);
      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi cập nhật sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductForm
      categories={categories}
      initialData={product}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      title="Sửa Sản phẩm"
      submitButtonText={loading ? 'Đang cập nhật...' : 'Cập nhật Sản phẩm'}
    />
  );
}

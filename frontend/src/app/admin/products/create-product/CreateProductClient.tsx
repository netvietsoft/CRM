'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { apiClientClient } from '@/lib/apiClientClient';

export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string | null;
}

interface ProductSubmitVariant {
  id: string;
  sizeId?: string;
  colorId?: string;
  price?: number;
  stock: number;
}

interface ProductSubmitComboItem {
  childProductId: string;
  quantity: number;
}

interface ProductSubmitPayload {
  name: string;
  slug: string;
  sku?: string;
  description?: string;
  imageUrl: string | null;
  originalPrice: number;
  productionPrice?: number;
  salePrice?: number;
  stockQuantity: number;
  weight: number;
  isComboSet: boolean;
  isGiftItem: boolean;
  isActive: boolean;
  supplierId?: string;
  materialId?: string;
  unitId?: string;
  categoryIds: string[];
  tagIds?: string[];
  variants?: ProductSubmitVariant[];
  comboItems?: ProductSubmitComboItem[];
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface CreateProductClientProps {
  categories: ProductCategory[];
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function CreateProductClient({ categories }: CreateProductClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (data: ProductSubmitPayload) => {
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post('/products', data);
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, 'Lỗi tạo sản phẩm'));
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

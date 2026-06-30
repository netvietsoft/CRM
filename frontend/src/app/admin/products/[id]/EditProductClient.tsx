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

interface ProductVariantInput {
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
  variants?: ProductVariantInput[];
  comboItems?: ProductSubmitComboItem[];
}

export interface ProductFormProduct {
  id: string;
  name?: string | null;
  slug?: string | null;
  sku?: string | null;
  description?: string | null;
  originalPrice?: number | null;
  productionPrice?: number | null;
  salePrice?: number | null;
  stockQuantity?: number | null;
  weight?: number | null;
  imageUrl?: string | null;
  isComboSet?: boolean;
  isGiftItem?: boolean;
  isActive?: boolean;
  supplier?: { id: string } | null;
  material?: { id: string } | null;
  unit?: { id: string } | null;
  categories?: Array<{ id: string }> | null;
  tagMaps?: Array<{
    tagId?: string | null;
    tag?: { id: string } | null;
  }> | null;
  comboItems?: Array<{
    id?: string | null;
    childProductId?: string | null;
    quantity?: number | null;
    childProduct?: {
      id: string;
      name: string;
      sku?: string | null;
    } | null;
  }> | null;
  variants?: Array<{
    id?: string | null;
    sizeId?: string | null;
    colorId?: string | null;
    price?: number | null;
    stock?: number | null;
  }> | null;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface EditProductClientProps {
  product: ProductFormProduct;
  categories: ProductCategory[];
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function EditProductClient({ product, categories }: EditProductClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (data: ProductSubmitPayload) => {
    setLoading(true);
    setError('');

    try {
      await apiClientClient.patch(`/products/${product.id}`, data);
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, 'Lỗi cập nhật sản phẩm'));
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

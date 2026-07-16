export const dynamic = 'force-dynamic';
import React from 'react';
import CategoryActions from '@/components/admin/CategoryActions';
import CategoryTree from '@/components/admin/CategoryTree';
import { apiClient } from '@/lib/apiClient';

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  parent?: { name: string } | null;
  _count: {
    products: number;
    children: number;
  };
}

export default async function CategoriesPage() {
  const categories = await apiClient.get<CategoryRecord[]>('/categories?admin=true');

  // Organize categories by hierarchy
  const rootCategories = categories.filter(category => !category.parentId);
  const childCategories = categories.filter(category => Boolean(category.parentId));

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Danh mục sản phẩm</h1>
          <p className="text-gray-600 text-sm">
            Quản lý danh mục và phân loại sản phẩm
          </p>
        </div>
        <CategoryActions categories={categories.map(category => ({ id: category.id, name: category.name, parentId: category.parentId }))} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng danh mục</div>
          <div className="text-3xl font-bold text-gray-800">{categories.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Danh mục gốc</div>
          <div className="text-3xl font-bold text-gray-800">{rootCategories.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Danh mục con</div>
          <div className="text-3xl font-bold text-gray-800">{childCategories.length}</div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-800">Tất cả danh mục</span>
        </div>
        <div className="overflow-x-auto">
          {/* CategoryTree tự render cả bảng (header sort được + zebra + click hàng để sửa). */}
          <CategoryTree categories={categories} />
        </div>
      </div>
    </>
  );
}

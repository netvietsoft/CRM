'use client';

import Image from '@/components/ui/AppImage';
import React, { useCallback, useEffect, useState } from 'react';
import ProductActions from '@/components/admin/ProductActions';
import ProductRowActions from '@/components/admin/ProductRowActions';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, SearchIcon } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { passthroughImageLoader } from '@/lib/imageLoader';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  originalPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  weight: number;
  isComboSet: boolean;
  isGiftItem: boolean;
  isActive: boolean;
  supplier?: { id: string; name: string; code?: string | null } | null;
  material?: { id: string; name: string; code?: string | null } | null;
  unit?: { id: string; name: string; code: string } | null;
  categories: { id: string; name: string }[];
  tagMaps: Array<{ id?: string; tag: { id: string; name: string; slug: string } }>;
  comboItems: Array<{
    id: string;
    quantity: number;
    childProduct: { id: string; name: string; sku?: string | null };
  }>;
  variants: Array<Record<string, unknown>>;
  store?: { id: string; name: string } | null;
  _count: { orderItems: number };
};

type Category = {
  id: string;
  name: string;
  parentId: string | null;
};

type Supplier = {
  id: string;
  name: string;
  code?: string | null;
};

type Material = {
  id: string;
  name: string;
  code?: string | null;
};

type Unit = {
  id: string;
  name: string;
  code: string;
};

type ProductTag = {
  id: string;
  name: string;
  slug: string;
};

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ProductSummary = {
  total: number;
  activeCount: number;
  totalStock: number;
  lowStockCount: number;
};

type ProductFilters = {
  page?: string;
  limit?: string;
  search?: string;
  categoryId?: string;
  supplierId?: string;
  materialId?: string;
  unitId?: string;
  tagId?: string;
  sortBy?: string;
  sortOrder?: string;
  isActive?: string;
};

type Props = {
  products: Product[];
  pagination: PaginationMeta;
  summary: ProductSummary;
  initialFilters: ProductFilters;
  categories: Category[];
  suppliers: Supplier[];
  materials: Material[];
  units: Unit[];
  productTags: ProductTag[];
  userRole: string | null;
};

type SortKey = 'name' | 'category' | 'price' | 'stock' | 'sold' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getCategoryLabel(product: Product) {
  if (product.categories.length === 0) return '';
  return product.categories.map(category => category.name).join(' • ');
}

function getProductDisplayPrice(product: Product) {
  return product.salePrice ?? product.originalPrice;
}

function getProductMeta(product: Product) {
  const parts = [
    product.supplier?.name,
    product.material?.name,
    product.unit ? `${product.unit.name} (${product.unit.code})` : null,
  ].filter(Boolean);

  return parts.join(' • ');
}

function toStatusFilter(value?: string): StatusFilter {
  if (value === 'true') return 'active';
  if (value === 'false') return 'inactive';
  return 'all';
}

function toActiveParam(value: StatusFilter): string | undefined {
  if (value === 'active') return 'true';
  if (value === 'inactive') return 'false';
  return undefined;
}

function isSortKey(value?: string): value is SortKey {
  return value === 'name' || value === 'category' || value === 'price' || value === 'stock' || value === 'sold' || value === 'status';
}

function isServerSortKey(value: SortKey | null): value is Exclude<SortKey, 'category'> {
  return value === 'name' || value === 'price' || value === 'stock' || value === 'sold' || value === 'status';
}

export default function ProductsClient({
  products,
  pagination,
  summary,
  initialFilters,
  categories,
  suppliers,
  materials,
  units,
  productTags,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialFilters.categoryId || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialFilters.supplierId || '');
  const [selectedMaterialId, setSelectedMaterialId] = useState(initialFilters.materialId || '');
  const [selectedUnitId, setSelectedUnitId] = useState(initialFilters.unitId || '');
  const [selectedTagId, setSelectedTagId] = useState(initialFilters.tagId || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(toStatusFilter(initialFilters.isActive));
  const [navigatingProductId, setNavigatingProductId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(isSortKey(initialFilters.sortBy) ? initialFilters.sortBy : null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialFilters.sortOrder === 'desc' ? 'desc' : 'asc');
  const debouncedSearch = useDebounce(searchTerm, 400);

  const updateUrl = useCallback((updates: Record<string, string | undefined>, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    if (resetPage) {
      params.delete('page');
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      updateUrl({ search: debouncedSearch || undefined });
    }
  }, [debouncedSearch, searchParams, updateUrl]);

  useEffect(() => {
    products.forEach((product) => {
      router.prefetch(`/admin/products/${product.id}`);
    });
  }, [products, router]);

  const sortedProducts = sortKey === 'category'
    ? [...products].sort((left, right) => {
      const leftValue = getCategoryLabel(left).toLowerCase();
      const rightValue = getCategoryLabel(right).toLowerCase();
      return sortDirection === 'asc'
        ? leftValue.localeCompare(rightValue, 'vi')
        : rightValue.localeCompare(leftValue, 'vi');
    })
    : products;

  const appliedFilterCount = [
    selectedCategoryId,
    selectedSupplierId,
    selectedMaterialId,
    selectedUnitId,
    selectedTagId,
    statusFilter !== 'all' ? statusFilter : '',
    debouncedSearch,
  ].filter(Boolean).length;

  const handleOpenProduct = (product: Product) => {
    if (navigatingProductId) return;
    setNavigatingProductId(product.id);
    window.requestAnimationFrame(() => {
      router.push(`/admin/products/${product.id}`);
    });
  };

  const handleSort = (key: SortKey) => {
    const nextDirection: SortDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';

    setSortKey(key);
    setSortDirection(nextDirection);

    if (isServerSortKey(key)) {
      updateUrl({ sortBy: key, sortOrder: nextDirection });
      return;
    }

    updateUrl({ sortBy: key, sortOrder: nextDirection });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setSelectedSupplierId('');
    setSelectedMaterialId('');
    setSelectedUnitId('');
    setSelectedTagId('');
    setStatusFilter('all');
    setSortKey(null);
    setSortDirection('asc');
    router.push(pathname);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(page));
      router.push(`${pathname}?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />;
    return <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />;
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (pagination.totalPages <= maxVisible) {
      for (let i = 1; i <= pagination.totalPages; i++) {
        pages.push(i);
      }
    } else if (pagination.page <= 3) {
      pages.push(1, 2, 3, 4, '...', pagination.totalPages);
    } else if (pagination.page >= pagination.totalPages - 2) {
      pages.push(1, '...', pagination.totalPages - 3, pagination.totalPages - 2, pagination.totalPages - 1, pagination.totalPages);
    } else {
      pages.push(1, '...', pagination.page - 1, pagination.page, pagination.page + 1, '...', pagination.totalPages);
    }

    return pages;
  };

  return (
    <>
      {navigatingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/65 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        </div>
      )}

      <div className="mb-8 flex items-center justify-right">
        <ProductActions />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-gray-600">Tổng sản phẩm</div>
          <div className="text-3xl text-gray-800">{summary.total}</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-gray-600">Đang hoạt động</div>
          <div className="text-3xl text-green-600">{summary.activeCount}</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-gray-600">Tổng tồn kho</div>
          <div className="text-3xl text-gray-800">{summary.totalStock}</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-gray-600">Sắp hết hàng</div>
          <div className="text-3xl text-orange-600">{summary.lowStockCount}</div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tên sản phẩm, SKU, supplier, material, tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-10 text-sm shadow-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select
            value={selectedCategoryId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedCategoryId(value);
              updateUrl({ categoryId: value || undefined });
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSupplierId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedSupplierId(value);
              updateUrl({ supplierId: value || undefined });
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả NCC</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}{supplier.code ? ` (${supplier.code})` : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedMaterialId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedMaterialId(value);
              updateUrl({ materialId: value || undefined });
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả chất liệu</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}{material.code ? ` (${material.code})` : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedUnitId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedUnitId(value);
              updateUrl({ unitId: value || undefined });
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả đơn vị</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </option>
            ))}
          </select>

          <select
            value={selectedTagId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedTagId(value);
              updateUrl({ tagId: value || undefined });
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả tag</option>
            {productTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value as StatusFilter;
              setStatusFilter(value);
              updateUrl({ isActive: toActiveParam(value) });
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Đã tắt</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <span>
            {appliedFilterCount > 0 ? `Đang áp dụng ${appliedFilterCount} bộ lọc` : 'Chưa áp dụng bộ lọc nào'}
          </span>
          {appliedFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Xóa toàn bộ bộ lọc
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <span className="text-lg font-bold text-gray-800">
            {appliedFilterCount > 0 ? `Kết quả lọc (${summary.total})` : `Tất cả sản phẩm (${summary.total})`}
          </span>
          {pagination.totalPages > 1 && (
            <span className="text-sm text-gray-600">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1.5 transition-colors hover:text-indigo-600">
                    <span>Sản phẩm</span>
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button type="button" onClick={() => handleSort('category')} className="flex items-center gap-1.5 transition-colors hover:text-indigo-600">
                    <span>Danh mục</span>
                    {renderSortIcon('category')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button type="button" onClick={() => handleSort('price')} className="flex items-center gap-1.5 transition-colors hover:text-indigo-600">
                    <span>Giá bán</span>
                    {renderSortIcon('price')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button type="button" onClick={() => handleSort('stock')} className="flex items-center gap-1.5 transition-colors hover:text-indigo-600">
                    <span>Tồn kho</span>
                    {renderSortIcon('stock')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button type="button" onClick={() => handleSort('sold')} className="flex items-center gap-1.5 transition-colors hover:text-indigo-600">
                    <span>Đã bán</span>
                    {renderSortIcon('sold')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-1.5 transition-colors hover:text-indigo-600">
                    <span>Trạng thái</span>
                    {renderSortIcon('status')}
                  </button>
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="py-12 text-center">
                      <div className="mb-3 text-6xl">{appliedFilterCount > 0 ? '🔍' : '📦'}</div>
                      <div className="mb-2 text-xl font-semibold text-gray-800">
                        {appliedFilterCount > 0 ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}
                      </div>
                      <div className="text-gray-600">
                        {appliedFilterCount > 0 ? 'Thử đổi điều kiện lọc hoặc từ khóa tìm kiếm' : 'Tạo sản phẩm đầu tiên để bắt đầu bán hàng'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`cursor-pointer transition-colors ${navigatingProductId === product.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    onClick={() => handleOpenProduct(product)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <Image
                            loader={passthroughImageLoader}
                            unoptimized
                            src={product.imageUrl}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                            📦
                          </div>
                        )}
                        <div>
                          <div className="text-gray-800">{product.name}</div>
                          <div className="font-mono text-xs text-gray-500">{product.slug}</div>
                          {getProductMeta(product) && (
                            <div className="mt-1 text-xs text-gray-500">{getProductMeta(product)}</div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {product.isComboSet && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                Combo {product.comboItems.length > 0 ? `(${product.comboItems.length} món)` : ''}
                              </span>
                            )}
                            {product.isGiftItem && (
                              <span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-medium text-pink-700">
                                Quà tặng
                              </span>
                            )}
                            {product.tagMaps.slice(0, 2).map(({ tag }) => (
                              <span
                                key={tag.id}
                                className="rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700"
                              >
                                #{tag.name}
                              </span>
                            ))}
                            {product.tagMaps.length > 2 && (
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                +{product.tagMaps.length - 2} tag
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {product.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.categories.map(cat => (
                              <span
                                key={cat.id}
                                className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700"
                              >
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}

                        {product.comboItems.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {product.comboItems.slice(0, 2).map((item) => (
                              <div key={item.id}>
                                {item.childProduct.name} x{item.quantity}
                              </div>
                            ))}
                            {product.comboItems.length > 2 && <div>+{product.comboItems.length - 2} sản phẩm con</div>}
                          </div>
                        )}

                        {product.variants.length > 0 && (
                          <div className="text-xs text-gray-500">{product.variants.length} biến thể</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-800">
                        {formatCurrency(getProductDisplayPrice(product))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${product.stockQuantity === 0
                          ? 'text-red-700'
                          : product.stockQuantity < 10
                            ? 'text-orange-700'
                            : 'text-green-700'
                          }`}
                      >
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {product._count.orderItems}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${product.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {product.isActive ? 'Hoạt động' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ProductRowActions
                        product={product}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 px-4 py-4 md:flex-row">
            <div className="w-full text-center text-sm text-gray-600 md:w-auto">
              Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, summary.total)} trong tổng số {summary.total} sản phẩm
            </div>
            <div className="flex w-full max-w-full flex-wrap items-center justify-center gap-1.5 md:w-auto md:gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>

              <div className="flex items-center gap-1">
                {renderPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page as number)}
                      className={`rounded-lg px-3 py-2 font-medium transition-colors ${pagination.page === page
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

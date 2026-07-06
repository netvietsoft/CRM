'use client';

import Image from '@/components/ui/AppImage';
import React, { useCallback, useEffect, useState } from 'react';
import ProductActions from '@/components/admin/ProductActions';
import ProductRowActions from '@/components/admin/ProductRowActions';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, SearchIcon } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { passthroughImageLoader } from '@/lib/imageLoader';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { formatVndSymbol } from '@/lib/format';

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
  return formatVndSymbol(amount);
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
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-[#9ca3af]" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3.5 w-3.5 text-[#2563eb]" />;
    return <ArrowDown className="h-3.5 w-3.5 text-[#2563eb]" />;
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
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#bfdbfe] border-t-[#2563eb]" />
        </div>
      )}

      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-[#111827]">Sản phẩm</h1>
          <p className="m-0 mt-1 text-[13px] text-[#6b7280]">Kho hàng · danh mục · nhà cung cấp</p>
        </div>
        <div className="flex gap-2.5">
          <ProductActions />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Tổng sản phẩm</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">{summary.total}</div>
          <div className="mt-[3px] text-[11.5px] font-semibold text-[#6b7280]">Trong kho</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Đang hoạt động</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">{summary.activeCount}</div>
          <div className="mt-[3px] text-[11.5px] font-semibold text-[#047857]">Đang bán</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Tổng tồn kho</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">{summary.totalStock}</div>
          <div className="mt-[3px] text-[11.5px] font-semibold text-[#6b7280]">Đơn vị</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-4 py-[15px]">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Sắp hết hàng</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">{summary.lowStockCount}</div>
          <div className="mt-[3px] text-[11.5px] font-semibold text-[#c2410c]">Cần nhập thêm</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] max-w-[300px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Tìm theo tên, SKU…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white py-[9px] pl-10 pr-9 text-[13px] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]"
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={selectedSupplierId}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedSupplierId(value);
            updateUrl({ supplierId: value || undefined });
          }}
          className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-[9px] text-[13px] text-[#374151] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
        >
          <option value="">Tất cả NCC</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}{supplier.code ? ` (${supplier.code})` : ''}
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
          className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-[9px] text-[13px] text-[#374151] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Ngừng bán</option>
        </select>

        <select
          value={selectedTagId}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedTagId(value);
            updateUrl({ tagId: value || undefined });
          }}
          className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-[9px] text-[13px] text-[#374151] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
        >
          <option value="">Tất cả tag</option>
          {productTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
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
          className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-[9px] text-[13px] text-[#374151] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
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
          className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-[9px] text-[13px] text-[#374151] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
        >
          <option value="">Tất cả đơn vị</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name} ({unit.code})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1.5">
        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId('');
            updateUrl({ categoryId: undefined });
          }}
          className={`whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-semibold transition-colors ${
            selectedCategoryId === ''
              ? 'border-[#2563eb] bg-[#2563eb] text-white'
              : 'border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#f9fafb]'
          }`}
        >
          Tất cả danh mục
        </button>
        {categories.map((category) => {
          const active = selectedCategoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setSelectedCategoryId(category.id);
                updateUrl({ categoryId: category.id || undefined });
              }}
              className={`whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-semibold transition-colors ${
                active
                  ? 'border-[#2563eb] bg-[#2563eb] text-white'
                  : 'border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#f9fafb]'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {appliedFilterCount > 0 && (
        <div className="mb-3 flex items-center justify-between text-[12.5px] text-[#6b7280]">
          <span>Đang áp dụng {appliedFilterCount} bộ lọc</span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
          >
            Xóa toàn bộ bộ lọc
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1.5 transition-colors hover:text-[#2563eb]">
                    <span>Sản phẩm</span>
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  <button type="button" onClick={() => handleSort('category')} className="flex items-center gap-1.5 transition-colors hover:text-[#2563eb]">
                    <span>Danh mục</span>
                    {renderSortIcon('category')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  <button type="button" onClick={() => handleSort('price')} className="ml-auto flex items-center gap-1.5 transition-colors hover:text-[#2563eb]">
                    <span>Giá bán</span>
                    {renderSortIcon('price')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  <button type="button" onClick={() => handleSort('stock')} className="ml-auto flex items-center gap-1.5 transition-colors hover:text-[#2563eb]">
                    <span>Tồn kho</span>
                    {renderSortIcon('stock')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  <button type="button" onClick={() => handleSort('sold')} className="ml-auto flex items-center gap-1.5 transition-colors hover:text-[#2563eb]">
                    <span>Đã bán</span>
                    {renderSortIcon('sold')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  Nhà cung cấp
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">
                  <button type="button" onClick={() => handleSort('status')} className="flex items-center gap-1.5 transition-colors hover:text-[#2563eb]">
                    <span>Đang bán</span>
                    {renderSortIcon('status')}
                  </button>
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="px-5 py-11 text-center">
                      <div className="mb-2.5 text-[40px]">{appliedFilterCount > 0 ? '🔍' : '📦'}</div>
                      <div className="mb-1 text-[15px] font-bold text-[#111827]">
                        {appliedFilterCount > 0 ? 'Không có sản phẩm khớp bộ lọc' : 'Chưa có sản phẩm nào'}
                      </div>
                      <div className="text-[13px] text-[#6b7280]">
                        {appliedFilterCount > 0 ? 'Thử từ khóa khác hoặc xoá bộ lọc NCC / trạng thái' : 'Tạo sản phẩm đầu tiên để bắt đầu bán hàng'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product, idx) => (
                  <tr
                    key={product.id}
                    className={`cursor-pointer border-t border-[#f3f4f6] transition-colors hover:bg-[#eff6ff] ${idx % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'} ${navigatingProductId === product.id ? 'bg-[#eff6ff]' : ''}`}
                    onClick={() => handleOpenProduct(product)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-[11px]">
                        {product.imageUrl ? (
                          <Image
                            loader={passthroughImageLoader}
                            unoptimized
                            src={product.imageUrl}
                            alt={product.name}
                            width={38}
                            height={38}
                            className="h-[38px] w-[38px] flex-shrink-0 rounded-[10px] object-cover"
                          />
                        ) : (
                          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[15px] font-extrabold text-[#2563eb]">
                            {product.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="whitespace-nowrap font-semibold text-[#111827]">
                            {product.name}
                            {product.isComboSet && (
                              <span className="ml-1.5 rounded-md bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-bold text-[#92400e]">
                                Combo{product.comboItems.length > 0 ? ` (${product.comboItems.length} món)` : ''}
                              </span>
                            )}
                            {product.isGiftItem && (
                              <span className="ml-1.5 rounded-md bg-[#fce7f3] px-1.5 py-0.5 text-[10px] font-bold text-[#be185d]">
                                Quà tặng
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-[#9ca3af]">
                            {product.sku || product.slug} · {product.weight}g
                          </div>
                          {(product.tagMaps.length > 0 || product.variants.length > 0) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {product.tagMaps.slice(0, 2).map(({ tag }) => (
                                <span
                                  key={tag.id}
                                  className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-medium text-[#2563eb]"
                                >
                                  #{tag.name}
                                </span>
                              ))}
                              {product.tagMaps.length > 2 && (
                                <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-medium text-[#6b7280]">
                                  +{product.tagMaps.length - 2} tag
                                </span>
                              )}
                              {product.variants.length > 0 && (
                                <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-medium text-[#6b7280]">
                                  {product.variants.length} biến thể
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {product.categories.length > 0 ? (
                        <span className="rounded-lg bg-[#f3f4f6] px-[9px] py-[3px] text-[11px] font-semibold text-[#4b5563]">
                          {getCategoryLabel(product)}
                        </span>
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <div className="font-bold text-[#111827]">{formatCurrency(getProductDisplayPrice(product))}</div>
                      {product.salePrice != null && product.salePrice < product.originalPrice && (
                        <div className="text-[11px] text-[#9ca3af] line-through">{formatCurrency(product.originalPrice)}</div>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-3 text-right font-bold ${
                        product.stockQuantity === 0
                          ? 'text-[#dc2626]'
                          : product.stockQuantity < 10
                            ? 'text-[#c2410c]'
                            : 'text-[#111827]'
                      }`}
                    >
                      {product.stockQuantity}
                      {product.stockQuantity < 10 && (
                        <span className="ml-1.5 rounded-full bg-[#fef3c7] px-[7px] py-0.5 text-[10px] font-bold text-[#92400e]">
                          Sắp hết
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-[#4b5563]">
                      {product._count.orderItems}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#4b5563]">
                      {product.supplier?.name || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          product.isActive ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#fee2e2] text-[#dc2626]'
                        }`}
                      >
                        {product.isActive ? 'Đang bán' : 'Ngừng bán'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f1f5f9] px-[18px] py-[11px]">
          <span className="text-[12.5px] text-[#6b7280]">
            Hiển thị <b className="text-[#111827]">{summary.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, summary.total)}</b> / <b className="text-[#111827]">{summary.total}</b> sản phẩm · {pagination.limit} mỗi trang
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="flex h-[30px] min-w-[30px] items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-2 text-[12.5px] font-bold text-[#374151] transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {renderPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-[12.5px] text-[#9ca3af]">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page as number)}
                  className={`h-[30px] min-w-[30px] rounded-lg px-2 text-[12.5px] font-bold transition-colors ${
                    pagination.page === page
                      ? 'bg-[#2563eb] text-white'
                      : 'border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex h-[30px] min-w-[30px] items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-2 text-[12.5px] font-bold text-[#374151] transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

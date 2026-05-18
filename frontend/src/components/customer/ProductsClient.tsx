'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Heart, ShoppingCart, Eye, Star, Search, Share2, ChevronLeft, ChevronRight, Filter, X, Minus, Plus, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import CategoryFilter from './CategoryFilter';
import Select from '@/components/ui/Select';
import tinhData from '@/data/tinh_tp.json';

const provinces = Object.values(tinhData as Record<string, { code: string; name: string; type: string }>).map(p => ({
  id: p.code,
  name: p.name,
  isMajor: ['01', '79', '48', '31', '92'].includes(p.code)
})).sort((a, b) => {
  if (a.isMajor && !b.isMajor) return -1;
  if (!a.isMajor && b.isMajor) return 1;
  return a.name.localeCompare(b.name, 'vi');
});

const ITEMS_PER_PAGE = 25;

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  originalPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  soldCount: number;
  isComboSet: boolean;
  categories: { name: string }[];
  variants?: { price: number | null; stock?: number }[];
  store?: { name: string; slug: string; logoUrl: string | null; addressProvince?: string | null } | null;
}

interface ProductsClientProps {
  products: Product[];
  categories: Category[];
  initialWishlistIds: string[];
  userReferralCode: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ── Price Filter Accordion ─────────────────────────────── */
function PriceFilterAccordion({
  priceRange,
  setPriceRange,
  minPrice,
  maxPrice,
}: {
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  minPrice: number;
  maxPrice: number;
  formatCurrency: (n: number) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const fmtShort = (n: number) =>
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);

  const range = maxPrice - minPrice || 1;
  const minPct = ((priceRange[0] - minPrice) / range) * 100;
  const maxPct = ((priceRange[1] - minPrice) / range) * 100;

  return (
    <div className="border-b border-gray-200 pb-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Khoảng giá</h3>
        <span className="text-gray-400 hover:text-gray-600 transition-colors">
          {isExpanded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[200px] opacity-100 pb-4' : 'max-h-0 opacity-0'
          }`}
      >
        {/* Dual Range Slider */}
        <div className="relative mt-2 mb-1 h-10 flex items-center">
          <div className="absolute left-0 right-0 h-[2px] bg-gray-200 rounded-full" />
          <div
            className="absolute h-[2px] bg-sky-500 rounded-full"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step={10000}
            value={priceRange[0]}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (v <= priceRange[1]) setPriceRange([v, priceRange[1]]);
            }}
            className="price-range-slider absolute w-full"
            style={{ zIndex: priceRange[0] > maxPrice - 10000 ? 5 : 3 }}
          />
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step={10000}
            value={priceRange[1]}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (v >= priceRange[0]) setPriceRange([priceRange[0], v]);
            }}
            className="price-range-slider absolute w-full"
            style={{ zIndex: 4 }}
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-black font-medium">{fmtShort(priceRange[0])}</span>
          <span className="text-xs text-black font-medium">{fmtShort(priceRange[1])}</span>
        </div>

        <style jsx>{`
          .price-range-slider {
            -webkit-appearance: none;
            appearance: none;
            height: 2px;
            background: transparent;
            pointer-events: none;
            outline: none;
          }
          .price-range-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 2px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            cursor: pointer;
            pointer-events: auto;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .price-range-slider::-webkit-slider-thumb:hover {
            border-color: #ef4444;
            box-shadow: 0 0 0 4px rgba(239,68,68,0.1);
          }
          .price-range-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 2px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            cursor: pointer;
            pointer-events: auto;
          }
          .price-range-slider::-moz-range-thumb:hover {
            border-color: #ef4444;
          }
        `}</style>
      </div>
    </div>
  );
}

/* ── Region Filter Accordion ────────────────────────────── */
function RegionFilterAccordion({
  selectedProvinceId,
  setSelectedProvinceId,
  provinces,
}: {
  selectedProvinceId: string | null;
  setSelectedProvinceId: (id: string | null) => void;
  provinces: { id: string; name: string; isMajor: boolean }[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="pb-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Khu vực</h3>
        <span className="text-gray-400 hover:text-gray-600 transition-colors">
          {isExpanded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[350px] opacity-100 pb-3' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="max-h-[280px] overflow-y-auto pr-1 space-y-0 custom-scrollbar">
          {/* All regions */}
          <button
            onClick={() => setSelectedProvinceId(null)}
            className="group flex w-full items-center gap-3 py-2.5 text-left text-sm transition-colors hover:text-gray-900"
          >
            <div
              className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${!selectedProvinceId
                ? 'bg-gray-900 border-gray-900'
                : 'border-gray-300 group-hover:border-gray-400'
                }`}
            >
              {!selectedProvinceId && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
            <span className={!selectedProvinceId ? 'font-semibold text-gray-900' : 'text-gray-600'}>
              Tất cả khu vực
            </span>
          </button>

          {provinces.map((prov) => {
            const active = selectedProvinceId === prov.id;
            return (
              <button
                key={prov.id}
                onClick={() => setSelectedProvinceId(active ? null : prov.id)}
                className="group flex w-full items-center gap-3 py-2.5 text-left text-sm transition-colors hover:text-gray-900"
              >
                <div
                  className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${active
                    ? 'bg-gray-900 border-gray-900'
                    : 'border-gray-300 group-hover:border-gray-400'
                    }`}
                >
                  {active && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>
                <span className={active ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                  {prov.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProductsClient({
  products,
  categories,
  initialWishlistIds,
  userReferralCode,
}: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    searchParams.get('category') ? [searchParams.get('category') as string] : []
  );

  // Sync searchQuery and category with URL changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== searchQuery) {
      setSearchQuery(q);
    }
    const cat = searchParams.get('category');
    if (cat && !selectedCategoryIds.includes(cat)) {
      setSelectedCategoryIds([cat]);
    } else if (!cat && searchParams.has('q') === false && selectedCategoryIds.length === 1 && searchParams.toString() !== '') {
      // Just let it be unless specifically cleared by other means
    }
  }, [searchParams]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Get min and max prices dynamically
  const prices = products.flatMap(p => {
    const finalPrices = [p.salePrice || p.originalPrice];
    if (p.variants?.length) {
      p.variants.forEach(v => {
        if (v.price) finalPrices.push(v.price);
      });
    }
    return finalPrices;
  });

  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices, 10000000) : 10000000;

  // Initialize priceRange using actual max price from products
  const [priceRange, setPriceRange] = useState<[number, number]>([0, Math.max(10000000, maxPrice)]);

  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set(initialWishlistIds));
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);
  const [navigatingSlug, setNavigatingSlug] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCategoryIds, priceRange, selectedProvinceId]);

  // Filter products by selected category (including all child categories)
  const getChildCategoryIds = (categoryId: string): string[] => {
    const children = categories.filter(c => c.parentId === categoryId);
    const childIds = children.map(c => c.id);
    const grandChildIds = children.flatMap(c => getChildCategoryIds(c.id));
    return [categoryId, ...childIds, ...grandChildIds];
  };

  const filteredProducts = products.filter(p => {
    // Search query
    if (debouncedSearchQuery) {
      if (!p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
        return false;
      }
    }

    // Filter by categories
    if (selectedCategoryIds.length > 0) {
      const allowedCategoryIds = selectedCategoryIds.flatMap(id => getChildCategoryIds(id));
      const hasCategory = p.categories.some(cat => {
        const category = categories.find(c => c.name === cat.name);
        return category && allowedCategoryIds.includes(category.id);
      });
      if (!hasCategory) return false;
    }

    // Filter by price
    const finalPrices = [p.salePrice || p.originalPrice];
    if (p.variants?.length) {
      p.variants.forEach(v => {
        if (v.price) finalPrices.push(v.price);
      });
    }
    const pMin = Math.min(...finalPrices);
    const pMax = Math.max(...finalPrices);

    // Show if product's price range overlaps with the selected price range
    if (pMax < priceRange[0] || pMin > priceRange[1]) return false;

    // Filter by location (province)
    if (selectedProvinceId) {
      const provinceObj = provinces.find(pr => pr.id === selectedProvinceId);
      if (provinceObj) {
        if (!p.store?.addressProvince || !p.store.addressProvince.includes(provinceObj.name)) {
          return false;
        }
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const toggleWishlist = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingIds.has(productId)) return;

    setTogglingIds(prev => new Set(prev).add(productId));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();

      if (res.ok) {
        setWishlistIds(prev => {
          const next = new Set(prev);
          if (data.action === 'added') {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });
        showToast(
          data.action === 'added' ? '💖 Đã thêm vào yêu thích!' : '💔 Đã bỏ yêu thích',
          'success',
        );
      }
    } catch {
      showToast('Có lỗi xảy ra', 'error');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleAddToCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (addingToCart.has(productId)) return;

    setAddingToCart(prev => new Set(prev).add(productId));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      if (res.ok) {
        showToast('🛒 Đã thêm vào giỏ hàng!', 'success');
      }
    } catch {
      showToast('Có lỗi xảy ra', 'error');
    } finally {
      setAddingToCart(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleShareProduct = async (productSlug: string, productId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Tạo URL với referral code nếu có
    let productUrl = `${window.location.origin}/portal/products/${productSlug}`;
    if (userReferralCode) {
      productUrl += `?ref=${userReferralCode}`;
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      setCopiedProductId(productId);
      showToast('📋 Đã copy link giới thiệu!', 'success');

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedProductId(null);
      }, 2000);
    } catch {
      showToast('Không thể copy link', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 animate-slide-in ${toast.type === 'success'
            ? 'bg-white text-gray-800 border border-green-200'
            : 'bg-white text-red-600 border border-red-200'
            }`}
          style={{
            animation: 'slideIn 0.3s ease-out, fadeOut 0.3s ease-in 2.2s forwards',
          }}
        >
          {toast.message}
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes heartPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .heart-pop {
          animation: heartPop 0.3s ease-out;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeScaleIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-scale {
          animation: fadeScaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div className="mx-auto px-4">

        <div className="hidden sm:flex flex-wrap items-center justify-end gap-2">
          {totalPages > 1 && (
            <div className="inline-flex h-9 items-center rounded-full border border-gray-200 bg-white px-3 text-sm text-gray-500 shadow-sm">
              Trang <span className="ml-1 font-semibold text-gray-900">{currentPage}</span>
              <span className="mx-1 text-gray-300">/</span>
              <span>{totalPages}</span>
            </div>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="flex sm:hidden flex-col gap-3 mt-4">

          {/* Mobile Category Buttons */}
          <div className="w-full overflow-x-auto pb-1 custom-scrollbar">
            <div className={`grid gap-2 auto-cols-max grid-flow-col ${categories.length > 15 ? 'grid-rows-3' : categories.length > 10 ? 'grid-rows-2' : 'grid-rows-1'}`}>
              {categories.filter(c => !c.parentId).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (selectedCategoryIds.includes(cat.id)) {
                      setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                    } else {
                      setSelectedCategoryIds(prev => [...prev, cat.id]);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${selectedCategoryIds.includes(cat.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center justify-center gap-1.5 h-11 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium active:scale-95 transition-transform"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm text-gray-700 font-semibold">Lọc</span>
            </button>
            <div className="flex flex-col items-center justify-center h-11 bg-white border border-gray-200 rounded-xl px-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none mb-0.5">Kết quả</span>
              <span className="text-sm font-bold text-gray-900 leading-none">{filteredProducts.length} SP</span>
            </div>
            <button
              className="flex items-center justify-center gap-1.5 h-11 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 font-medium"
            >
              <Heart className="w-4 h-4 fill-rose-500" />
              <span className="text-sm font-bold">{wishlistIds.size}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start mt-6">
        {/* Left Sidebar - Filters (Desktop Only) */}
        <div className="hidden md:block w-full md:w-64 flex-shrink-0">
          <div className="px-5 py-1 sticky top-24">
            {/* Category Filter */}
            <CategoryFilter
              categories={categories}
              selectedCategoryIds={selectedCategoryIds}
              onFilterChange={setSelectedCategoryIds}
            />

            {/* Price Filter - Accordion */}
            <PriceFilterAccordion
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              minPrice={minPrice}
              maxPrice={maxPrice}
              formatCurrency={formatCurrency}
            />

            {/* Location Filter - Accordion */}
            <RegionFilterAccordion
              selectedProvinceId={selectedProvinceId}
              setSelectedProvinceId={setSelectedProvinceId}
              provinces={provinces}
            />
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {isFilterModalOpen && (
          <div className="fixed inset-0 z-[100] flex md:hidden flex-col bg-white animate-fade-scale">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Lọc sản phẩm</h2>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-2 text-gray-500 bg-gray-50 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
              {/* Price Filter */}
              <div className="pt-2">
                <h3 className="font-bold text-gray-800 mb-3">Khoảng giá</h3>
                <div className="mb-4 text-sm text-gray-600 font-medium bg-gray-50 p-3 rounded-lg text-center">
                  {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Từ</label>
                    <input
                      type="range"
                      min={minPrice} max={maxPrice} step={100000}
                      value={priceRange[0]}
                      onChange={(e) => {
                        const newMin = parseInt(e.target.value);
                        if (newMin <= priceRange[1]) setPriceRange([newMin, priceRange[1]]);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Đến</label>
                    <input
                      type="range"
                      min={minPrice} max={maxPrice} step={100000}
                      value={priceRange[1]}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value);
                        if (newMax >= priceRange[0]) setPriceRange([priceRange[0], newMax]);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Location Filter */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-bold text-gray-800 mb-3">Khu vực</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedProvinceId(null)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors border ${!selectedProvinceId ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                  >
                    Tất cả
                  </button>
                  {provinces.filter(p => p.isMajor).map(prov => (
                    <button
                      key={prov.id}
                      onClick={() => setSelectedProvinceId(prov.id)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors border ${selectedProvinceId === prov.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                    >
                      {prov.name}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Select
                    value={selectedProvinceId || ''}
                    onChange={(val) => setSelectedProvinceId(val || null)}
                    className="w-full"
                    placeholder="Chọn tỉnh thành khác..."
                    options={provinces.filter(p => !p.isMajor).map(prov => ({
                      value: prov.id,
                      label: prov.name
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedCategoryIds([]);
                    setPriceRange([minPrice, maxPrice]);
                    setSelectedProvinceId(null);
                  }}
                  className="w-1/3 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold"
                >
                  Đặt lại
                </button>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="w-2/3 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-200"
                >
                  Áp dụng ({filteredProducts.length} SP)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Content - Products */}
        <div className="flex-1">

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Eye className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Không tìm thấy sản phẩm
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Thử thay đổi bộ lọc hoặc danh mục để tìm sản phẩm phù hợp
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-5 gap-3 sm:gap-4">
                {currentProducts.map((product, index) => {
                  const finalPrices = [product.salePrice || product.originalPrice];
                  const originalPrices = [product.originalPrice];

                  if (product.variants?.length) {
                    product.variants.forEach(v => {
                      if (v.price) {
                        finalPrices.push(v.price);
                        // We assume variant price replaces both sale and original price since admin only inputs 1 price for variant
                        originalPrices.push(v.price);
                      }
                    });
                  }

                  const minPrice = Math.min(...finalPrices);
                  const maxPrice = Math.max(...finalPrices);
                  const minOriginalPrice = Math.min(...originalPrices);
                  const maxOriginalPrice = Math.max(...originalPrices);

                  const displayPriceString = formatCurrency(minPrice);

                  // Has discount if at least one price was discounted
                  const hasDiscount = minPrice < minOriginalPrice || maxPrice < maxOriginalPrice;

                  // For the discount tag, maybe just find max discount percent. Or keep it simple.
                  const maxDiscountPercent = hasDiscount
                    ? Math.round(((product.originalPrice - product.salePrice!) / product.originalPrice) * 100)
                    : 0;

                  const isWishlisted = wishlistIds.has(product.id);
                  const isToggling = togglingIds.has(product.id);


                  return (
                    <div
                      key={`${product.id}-${currentPage}-${debouncedSearchQuery}-${selectedCategoryIds.join(',')}-${priceRange[0]}-${priceRange[1]}`}
                      className="group animate-fade-scale bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 relative cursor-pointer border border-gray-100"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => {
                        setNavigatingSlug(product.slug);
                        router.push(`/portal/products/${product.slug}`);
                      }}
                    >
                      {/* Product Image */}
                      <div className="relative bg-gray-50 overflow-hidden" style={{ paddingBottom: '125%' }}>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50">
                            <ShoppingCart className="w-10 h-10 text-gray-300" />
                          </div>
                        )}

                        {/* Action Buttons - top right */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => toggleWishlist(product.id, e)}
                            disabled={isToggling}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${isWishlisted
                              ? 'bg-rose-500 text-white shadow-md'
                              : 'bg-white/90 text-gray-500 hover:text-rose-500 shadow-sm'
                              } ${isToggling ? 'opacity-50 cursor-wait' : 'hover:scale-110 active:scale-95'}`}
                            title={isWishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                          >
                            <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-current heart-pop' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => handleShareProduct(product.slug, product.id, e)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${copiedProductId === product.id
                              ? 'bg-green-500 text-white shadow-md'
                              : 'bg-white/90 text-gray-500 hover:text-gray-800 shadow-sm hover:scale-110 active:scale-95'
                              }`}
                            title="Chia sẻ sản phẩm"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Wishlist indicator always visible if wishlisted */}
                        {isWishlisted && (
                          <div className="absolute top-2 right-2 z-10 group-hover:opacity-0 transition-opacity duration-200">
                            <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
                              <Heart className="w-3 h-3 fill-current" />
                            </div>
                          </div>
                        )}

                        {/* Combo Badge */}
                        {product.isComboSet && (
                          <div className="absolute top-2 left-2 z-10">
                            <div className="bg-gray-900 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              Combo
                            </div>
                          </div>
                        )}

                        {/* Discount Badge - top left */}
                        {hasDiscount && !product.isComboSet && (
                          <div className="absolute top-2 left-2 z-10">
                            <div className="bg-sky-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                              -{maxDiscountPercent}%
                            </div>
                          </div>
                        )}


                        {/* Navigation Loading Overlay */}
                        {navigatingSlug === product.slug && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-20">
                            <div className="flex flex-col items-center gap-2">
                              <svg className="animate-spin h-7 w-7 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-2 flex flex-col flex-1">
                        {/* Store Info */}
                        {product.store && !product.store.slug.startsWith('main-store') && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {product.store.logoUrl ? (
                                <img src={product.store.logoUrl} alt={product.store.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[7px] font-bold text-gray-500">{(product.store.name || 'S').charAt(0)}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 truncate">{product.store.name}</span>
                          </div>
                        )}

                        {/* Product Name */}
                        <h3 className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2rem] leading-[1.3] mb-1.5">
                          {product.name}
                        </h3>

                        {/* Price */}
                        <div className="mt-auto">
                          <div className="text-[13px] sm:text-sm font-bold text-gray-900 tracking-tight">
                            {displayPriceString}
                          </div>

                          {hasDiscount && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                                {formatCurrency(maxOriginalPrice)}
                              </span>
                              <span className="text-[10px] sm:text-xs font-semibold text-gray-500">
                                -{maxDiscountPercent}%
                              </span>
                            </div>
                          )}

                          {hasDiscount && (
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              Giá cũ: {formatCurrency(maxOriginalPrice)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} trong tổng số {filteredProducts.length} sản phẩm
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
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
                              className={`px-3 py-2 rounded-lg font-medium transition-colors ${currentPage === page
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
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        Sau
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

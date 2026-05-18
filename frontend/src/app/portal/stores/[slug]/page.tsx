import React from 'react';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

function formatVnDate(date: string | Date | null) {
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(date));
}

// Ensure star icon component is available, or use emojis
const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex text-yellow-400 text-sm">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star}>{star <= rating ? '★' : '☆'}</span>
      ))}
    </div>
  );
};

export default async function StoreProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ categoryId?: string; tab?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sParams = await searchParams;
  const currentTab = sParams.tab || 'products';
  const currentCategory = sParams.categoryId || null;
  const pageParam = parseInt(sParams.page || '1', 10);

  let store: any = null;
  let productsData: any = { data: [], meta: {} };
  let categories: any[] = [];
  let reviews: any[] = [];

  try {
    // 1. Fetch store info
    store = await apiClient.get(`/stores/public/${slug}`, { cache: 'no-store' });
  } catch (error: any) {
    console.error('Error fetching store:', error?.message, 'status:', error?.status || error?.response?.status);
    if (error?.status === 404 || error?.response?.status === 404) {
      notFound();
    }
    // store remains null → will show "Cửa hàng không tồn tại"
  }

  if (store) {
    try {
      // 2. Fetch store categories (public endpoint with storeId filter)
      // This now returns categories that have products in this store, with correct counts
      categories = await apiClient.get<any[]>(`/categories?storeId=${store.id}`, { cache: 'no-store' });

      // 3. Fetch products based on tab
      if (currentTab === 'products') {
        const qs = new URLSearchParams();
        qs.append('storeSlug', slug);
        qs.append('limit', '1000');
        if (currentCategory) qs.append('categoryId', currentCategory);
        productsData = await apiClient.get(`/products?${qs.toString()}`, { cache: 'no-store' });
      }

      // 4. Fetch store reviews (always fetch for header rating)
      reviews = await apiClient.get(`/stores/public/${slug}/reviews`, { cache: 'no-store' });
    } catch (error: any) {
      console.error('Error fetching store data:', error?.message);
    }
  }

  // Calculate average rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const pageSize = 24;
  let paginatedProducts: any[] = [];
  let totalPages = 1;
  let totalProducts = 0;

  if (currentTab === 'products' && productsData.data) {
    totalProducts = productsData.data.length;
    totalPages = Math.ceil(totalProducts / pageSize);
    paginatedProducts = productsData.data.slice((pageParam - 1) * pageSize, pageParam * pageSize);
  }

  if (!store) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold mb-2">Cửa hàng không tồn tại</h2>
        <p>Cửa hàng bạn tìm kiếm không tồn tại hoặc đã bị khóa.</p>
        <Link href="/portal/products" className="mt-6 inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Quay lại trang sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Store Banner */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="h-18 bg-gradient-to-r from-sky-300 to-green-200 relative">
          {/* We can put a cover image here in the future if store has one */}
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12 gap-6 mb-6">
            <div className="w-32 h-32 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">🏪</span>
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{store.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  {store._count?.products || 0} Sản phẩm
                </span>
                <span className="flex items-center gap-1">
                  - Ngày tham gia {formatVnDate(store.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="">
            <div className="mx-auto justify-center grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-sm">
                    <div>
                      <span className="block text-gray-500 mb-0.5">Email</span>
                      <span className="font-medium text-gray-800">{store.email || 'Chưa cập nhật'}</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div>
                      <span className="block text-gray-500 mb-0.5">Địa chỉ</span>
                      <span className="font-medium text-gray-800">
                        {store.addressStreet ? `${store.addressStreet}, ${store.addressWard}, ${store.addressProvince}` : 'Chưa cập nhật'}
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
              <div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-sm">
                    <div>
                      <span className="block text-gray-500 mb-0.5">Số điện thoại</span>
                      <span className="font-medium text-gray-800">{store.phone || 'Chưa cập nhật'}</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <div>
                      <span className="block text-gray-500 mb-0.5">Đánh giá</span>
                      <span className="font-medium text-gray-800 flex items-center gap-1">
                        <span className="text-yellow-400 text-xl flex items-center mb-0.5">★</span> {avgRating}/5.0 {reviews.length === 0 ? "" : reviews.length + " lượt đánh giá"}
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {store.description && (
            <div>
              <p className="text-gray-500 text-sm mt-4 mb-2">Giới thiệu cửa hàng</p>
              <span className="text-gray-800 text-sm">{store.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-[400px]">
        {categories.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              Danh mục
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/portal/stores/${slug}?tab=products`}
                scroll={false}
                className={`px-5 py-2.5 rounded-xl text-sm transition-all border ${!currentCategory
                  ? 'text-indigo-500 font-semibold shadow-sm bg-indigo-50 border-indigo-200'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/30'
                  }`}
              >
                Tất cả
              </Link>
              {categories.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/portal/stores/${slug}?tab=products&categoryId=${c.id}`}
                  scroll={false}
                  className={`px-5 py-2.5 rounded-xl text-sm transition-all border flex items-center gap-2 ${currentCategory === c.id
                    ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                >
                  <span>{c.name}</span>
                  {c._count?.products > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${currentCategory === c.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {c._count.products}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {currentCategory ? categories.find(c => c.id === currentCategory)?.name : 'Tất cả sản phẩm'}
              </h2>
              <span className="text-gray-500 text-sm">{productsData.meta.total || 0} sản phẩm</span>
            </div>

            {productsData.data && productsData.data.length > 0 ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedProducts.map((product: any) => (
                    <Link
                      key={product.id}
                      href={`/portal/products/${product.slug}`}
                      className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all group block"
                    >
                      <div className="aspect-square bg-gray-50 relative overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            No Image
                          </div>
                        )}
                        {product.salePrice && product.originalPrice && product.salePrice < product.originalPrice && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                            -{Math.round((1 - product.salePrice / product.originalPrice) * 100)}%
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-end gap-2">
                          <span className="font-bold text-indigo-600">
                            {fmt(product.salePrice || product.originalPrice)}
                          </span>
                          {product.salePrice && product.originalPrice && product.salePrice < product.originalPrice && (
                            <span className="text-xs text-gray-400 line-through mb-0.5">
                              {fmt(product.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Link
                      href={`/portal/stores/${slug}?tab=products${currentCategory ? `&categoryId=${currentCategory}` : ''}&page=${Math.max(1, pageParam - 1)}`}
                      scroll={false}
                      className={`px-4 py-2 rounded-lg border ${pageParam === 1 ? 'border-gray-200 text-gray-400 pointer-events-none' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Trước
                    </Link>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <Link
                          key={p}
                          href={`/portal/stores/${slug}?tab=products${currentCategory ? `&categoryId=${currentCategory}` : ''}&page=${p}`}
                          scroll={false}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-colors ${pageParam === p ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          {p}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={`/portal/stores/${slug}?tab=products${currentCategory ? `&categoryId=${currentCategory}` : ''}&page=${Math.min(totalPages, pageParam + 1)}`}
                      scroll={false}
                      className={`px-4 py-2 rounded-lg border ${pageParam === totalPages ? 'border-gray-200 text-gray-400 pointer-events-none' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Sau
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white p-12 rounded-xl text-center shadow-sm border border-gray-100">
                <div className="text-5xl mb-4 opacity-50">🛍️</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Không có sản phẩm nào</h3>
                <p className="text-gray-500 text-sm">Cửa hàng hiện chưa có sản phẩm trong danh mục này.</p>
              </div>
            )}
          </div>
        </div>

        {/* REVIEWS TAB */}
        <div className='mt-8'>
          <h2 className="text-xl font-bold text-gray-800 mb-6">Đánh giá từ khách hàng</h2>
          {reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((r: any) => (
                <div key={r.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                        {r.user?.avatarUrl ? (
                          <img src={r.user.avatarUrl} alt={r.user.name} className="w-full h-full object-cover" />
                        ) : (
                          r.user?.name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{r.user?.name || 'Khách hàng'}</div>
                        <div className="text-xs text-gray-500">{formatVnDate(r.createdAt)}</div>
                      </div>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.comment && (
                    <p className="text-gray-700 text-sm mb-3 mt-3">{r.comment}</p>
                  )}
                  <Link href={`/portal/products/${r.product.slug}`} className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded inline-flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                    <span className="opacity-70">Sản phẩm:</span> <span className="font-medium">{r.product.name}</span>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-50">⭐</div>
              <p className="text-gray-500">Cửa hàng chưa có đánh giá nào.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Heart, ShoppingBag, Truck, ShieldCheck, Undo2, Sparkles, Share2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { persistReferralCode } from '@/lib/referral-client';
import ProductReviews from './ProductReviews';

interface Size {
  id: string;
  name: string;
}

interface Color {
  id: string;
  name: string;
  hexCode?: string | null;
}

interface ProductSize {
  id: string;
  sizeId: string;
  stock: number;
  size: Size;
}

interface ProductColor {
  id: string;
  colorId: string;
  stock: number;
  color: Color;
}

interface ProductVariant {
  id: string;
  sizeId: string | null;
  colorId: string | null;
  price: number | null;
  stock: number;
  size?: Size | null;
  color?: Color | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  originalPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  soldCount: number;
  imageUrl: string | null;
  isComboSet: boolean;
  categories: { id: string; name: string }[];
  variants: ProductVariant[];
  store?: { id: string; name: string; slug: string; logoUrl: string | null } | null;
}

interface ProductDetailClientProps {
  product: Product;
  relatedProducts?: Product[];
  initialWishlistIds: string[];
  userReferralCode: string;
  userCompletedOrders: Array<{
    orderId: string;
    size: string | null;
    color: string | null;
  }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductDetailClient({ product, relatedProducts = [], initialWishlistIds, userReferralCode, userCompletedOrders }: ProductDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlist, setIsWishlist] = useState(initialWishlistIds.includes(product.id));
  const [loadingCart, setLoadingCart] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [navigatingSlug, setNavigatingSlug] = useState<string | null>(null);
  const relatedScrollRef = useRef<HTMLDivElement>(null);

  const scrollRelated = (direction: 'left' | 'right') => {
    if (relatedScrollRef.current) {
      const { current } = relatedScrollRef;
      const scrollAmount = current.clientWidth;
      current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  // Save referral code from URL for signup flows.
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      persistReferralCode(refCode);
    }
  }, [searchParams]);

  // Derived states
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const variants = product.variants || [];

  const availableSizes = Array.from(
    new Map(
      variants.filter(v => v.sizeId && v.size).map(v => [v.size!.id, v.size!])
    ).values()
  ).sort((a, b) => {
    const indexA = sizeOrder.indexOf(a.name.toUpperCase());
    const indexB = sizeOrder.indexOf(b.name.toUpperCase());

    // If both sizes are in the order array, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one is in the order array, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // If neither is in the order array, sort alphabetically
    return a.name.localeCompare(b.name);
  });

  const availableColors = Array.from(
    new Map(
      variants
        .filter(v => v.colorId && v.color && (!selectedSizeId || v.sizeId === selectedSizeId))
        .map(v => [v.color!.id, v.color!])
    ).values()
  );

  // Calculate current price and stock
  let currentPrice = product.salePrice || product.originalPrice;

  const matchingVariants = variants.filter(v =>
    (!selectedSizeId || v.sizeId === selectedSizeId) &&
    (!selectedColorId || v.colorId === selectedColorId)
  );

  let currentStock = variants.length > 0
    ? matchingVariants.reduce((sum, v) => sum + v.stock, 0)
    : product.stockQuantity;

  // Use variant price based on selected size + color combination
  let currentVariant = null;
  if (selectedSizeId && selectedColorId) {
    // Both selected: find exact match
    currentVariant = variants.find(v => v.sizeId === selectedSizeId && v.colorId === selectedColorId);
  } else if (selectedSizeId) {
    // Only size selected: find first variant for this size
    currentVariant = variants.find(v => v.sizeId === selectedSizeId);
  } else if (selectedColorId) {
    // Only color selected: find first variant for this color
    currentVariant = variants.find(v => v.colorId === selectedColorId);
  }

  if (currentVariant && currentVariant.price) {
    currentPrice = currentVariant.price;
  }

  // Effect to clear invalid color when size changes
  useEffect(() => {
    if (selectedSizeId && selectedColorId) {
      const isValid = variants.some(v => v.sizeId === selectedSizeId && v.colorId === selectedColorId);
      if (!isValid) {
        setSelectedColorId(null);
      }
    }
  }, [selectedSizeId]);

  const hasDiscount = currentPrice < product.originalPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - (currentPrice / product.originalPrice)) * 100)
    : 0;

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const toggleWishlist = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsWishlist(data.action === 'added');
        showToast(
          data.action === 'added' ? '💖 Đã thêm vào yêu thích!' : '💔 Đã bỏ yêu thích',
          'success'
        );
      }
    } catch {
      showToast('Có lỗi xảy ra', 'error');
    }
  };

  const handleShareProduct = async () => {
    // Tạo URL với referral code nếu có
    let productUrl = `${window.location.origin}/portal/products/${product.slug}`;
    if (userReferralCode) {
      productUrl += `?ref=${userReferralCode}`;
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      showToast('📋 Đã copy link giới thiệu!', 'success');

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      showToast('Không thể copy link', 'error');
    }
  };

  const validateStock = () => {
    if (availableSizes.length > 0 && !selectedSizeId) {
      showToast('Vui lòng chọn Kích thước', 'error');
      return false;
    }
    if (availableColors.length > 0 && !selectedColorId) {
      showToast('Vui lòng chọn Màu sắc', 'error');
      return false;
    }

    return true;
  };

  const handleAddToCart = async () => {
    if (!validateStock()) return;

    setLoadingCart(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: product.id,
          quantity,
          size: availableSizes.find(s => s.id === selectedSizeId)?.name || null,
          color: availableColors.find(c => c.id === selectedColorId)?.name || null,
        }),
      });

      if (res.ok) {
        showToast('🛒 Đã thêm vào giỏ hàng!', 'success');
      } else {
        const d = await res.json();
        showToast(d.error || 'Có lỗi xảy ra', 'error');
      }
    } catch {
      showToast('Không thể kết nối', 'error');
    } finally {
      setLoadingCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!validateStock()) return;

    const params = new URLSearchParams({
      productId: product.id,
      quantity: quantity.toString(),
    });

    const sizeName = availableSizes.find(s => s.id === selectedSizeId)?.name;
    const colorName = availableColors.find(c => c.id === selectedColorId)?.name;

    if (sizeName) params.set('size', sizeName);
    if (colorName) params.set('color', colorName);

    router.push(`/portal/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-500 max-w-sm border-l-4 ${toast.type === 'success' ? 'bg-white border-green-500' : 'bg-white border-red-500'} animate-fade-in-down`}>
          <div className="font-medium text-gray-800">{toast.message}</div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-500 flex gap-2">
          <button onClick={() => router.push('/portal/products')} className="hover:text-indigo-600 transition-colors">Sản phẩm</button>
          <span>/</span>
          {product.categories.length > 0 && (
            <>
              <button
                onClick={() => router.push(`/portal/products?category=${product.categories[0].id}`)}
                className="hover:text-indigo-600 transition-colors text-gray-700"
              >
                {product.categories[0].name}
              </button>
              <span>/</span>
            </>
          )}
          <span className="text-indigo-900 font-medium truncate max-w-xs">{product.name}</span>
        </div>

        <div className="mb-12">
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-14">
            {/* Left: Image Box */}
            <div className="flex-shrink-0 relative w-full md:w-auto flex justify-center md:justify-start pt-2 md:pt-8 md:pl-10">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  onClick={() => setIsImageModalOpen(true)}
                  className="w-[85%] sm:w-full max-w-[280px] aspect-[3/4] object-cover rounded-2xl shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-full max-w-[280px] aspect-[3/4] bg-gray-200 rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-6xl">📦</span>
                </div>
              )}

              {hasDiscount && (
                <div className="absolute top-6 left-6 bg-red-500 text-white font-bold px-4 py-2 rounded-full shadow-lg">
                  -{discountPercent}%
                </div>
              )}
            </div>

            {/* Right: Info Box */}
            <div className="flex-1 lg:pt-8 py-4 md:pl-0 w-full">
              <div className="flex justify-between items-start mb-3">
                <div>
                  {/* Category & Store Track */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {product.categories.length > 0 && (
                      <div className="flex items-center gap-2">
                        {product.categories.map((c, idx) => (
                          <div key={c.name} className="flex items-center">
                            <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                              {c.name}
                            </span>
                            {idx < product.categories.length - 1 && (
                              <span className="text-gray-300 mx-2">•</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {product.store && (
                      <>
                        {product.categories.length > 0 && <span className="text-gray-300 mx-1">|</span>}
                        <div
                          onClick={() => router.push(`/portal/stores/${product.store?.slug}`)}
                          className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm border border-gray-200">
                            {product.store.logoUrl ? (
                              <img src={product.store.logoUrl} alt={product.store.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[11px] font-bold text-gray-500">{(product.store.name || 'S').charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-semibold">{product.store.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                    {product.name}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShareProduct}
                    className={`p-2 rounded-full transition-all duration-300 ${copied
                        ? 'bg-green-50 text-green-500'
                        : 'hover:bg-blue-50 text-gray-400 hover:text-blue-500'
                      }`}
                    title="Chia sẻ sản phẩm"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleWishlist}
                    className="p-2 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Heart
                      className={`w-6 h-6 transition-colors ${isWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                    />
                  </button>
                </div>
              </div>

              {product.sku && (
                <p className="text-xs text-gray-500 font-mono mb-3">SKU: {product.sku}</p>
              )}

              {/* Price */}
              <div className="mb-5 flex items-end gap-3">
                <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                  {formatCurrency(currentPrice)}
                </span>
                {hasDiscount && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm text-gray-400">Giá gốc:</span>
                    <span className="text-base text-gray-400 line-through">
                      {formatCurrency(product.originalPrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* Sizes */}
              {availableSizes.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 text-sm">Kích thước</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map(size => {
                      return (
                        <button
                          key={size.id}
                          onClick={() => setSelectedSizeId(size.id)}
                          className={`min-w-[3.5rem] px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${selectedSizeId === size.id
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border-2 border-indigo-600'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-600 hover:text-indigo-600'
                            }`}
                        >
                          {size.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Colors */}
              {availableColors.length > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 text-sm">Màu sắc</span>
                    {selectedSizeId && (
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                        Còn {currentStock} sản phẩm
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(color => {
                      return (
                        <button
                          key={color.id}
                          onClick={() => setSelectedColorId(color.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 border ${selectedColorId === color.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-gray-200 hover:border-indigo-600 text-gray-700'
                            }`}
                        >
                          {color.hexCode && (
                            <span
                              className="w-3.5 h-3.5 rounded-full border shadow-sm border-gray-300"
                              style={{ backgroundColor: color.hexCode }}
                            />
                          )}
                          {color.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="flex gap-3 mb-6">
                <div className="flex items-center w-28 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    className="flex-1 w-full text-center bg-transparent border-none focus:outline-none font-medium h-9 select-none pointer-events-none text-gray-800 text-sm"
                    value={quantity}
                    readOnly
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={loadingCart}
                  className="flex-1 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold py-2.5 px-2 sm:px-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="hidden sm:inline">THÊM VÀO GIỎ</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={loadingCart}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-2.5 px-3 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  MUA NGAY
                </button>
              </div>

              {/* Meta Features */}
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 pb-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-500" />
                  <span>Miễn phí giao hàng</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>Bảo hành chính hãng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Undo2 className="w-4 h-4 text-purple-500" />
                  <span>Đổi trả trong 7 ngày</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span>Sản phẩm chất lượng</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Description Section */}
        {product.description && (
          <div className="p-2 mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Mô tả sản phẩm</h3>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </div>
          </div>
        )}

        {/* Product Reviews Section */}
        <ProductReviews
          productId={product.id}
          productName={product.name}
          userCompletedOrders={userCompletedOrders}
        />

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mt-16 mb-12 relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                Sản phẩm liên quan
              </h3>
              {relatedProducts.length > 5 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollRelated('left')}
                    className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollRelated('right')}
                    className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            <div
              ref={relatedScrollRef}
              className="flex overflow-x-auto gap-3 sm:gap-5 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {relatedProducts.map(rp => {
                const finalPrices = [rp.salePrice || rp.originalPrice];
                const originalPrices = [rp.originalPrice];

                if (rp.variants?.length) {
                  rp.variants.forEach(v => {
                    if (v.price) {
                      finalPrices.push(v.price);
                      originalPrices.push(v.price);
                    }
                  });
                }

                const minPrice = Math.min(...finalPrices);
                const maxPrice = Math.max(...finalPrices);
                const minOriginalPrice = Math.min(...originalPrices);
                const maxOriginalPrice = Math.max(...originalPrices);

                const hasDiscount = minPrice < minOriginalPrice || maxPrice < maxOriginalPrice;
                const discountPercent = hasDiscount
                  ? Math.round(((rp.originalPrice - rp.salePrice!) / rp.originalPrice) * 100)
                  : 0;

                const isWishlisted = initialWishlistIds.includes(rp.id);


                return (
                  <div
                    key={rp.id}
                    className="group bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 relative cursor-pointer border border-gray-100 flex-shrink-0 w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.833rem)] lg:w-[calc(25%-0.9375rem)] xl:w-[calc(20%-1rem)] snap-start"
                    onClick={() => {
                      setNavigatingSlug(rp.slug);
                      router.push(`/portal/products/${rp.slug}`);
                    }}
                  >
                    {/* Product Image */}
                    <div className="relative bg-gray-50 overflow-hidden" style={{ paddingBottom: '125%' }}>
                      {rp.imageUrl ? (
                        <img
                          src={rp.imageUrl}
                          alt={rp.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50">
                          <ShoppingBag className="w-10 h-10 text-gray-300" />
                        </div>
                      )}

                      {/* Action Buttons - top right */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/wishlist`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ productId: rp.id }),
                            }).then(() => {
                              showToast('💖 Đã cập nhật yêu thích!', 'success');
                            });
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${isWishlisted
                              ? 'bg-rose-500 text-white shadow-md'
                              : 'bg-white/90 text-gray-500 hover:text-rose-500 shadow-sm'
                            } hover:scale-110 active:scale-95`}
                          title={isWishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                        >
                          <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const productUrl = `${window.location.origin}/portal/products/${rp.slug}${userReferralCode ? `?ref=${userReferralCode}` : ''}`;
                            navigator.clipboard.writeText(productUrl).then(() => {
                              showToast('📋 Đã copy link!', 'success');
                            });
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm bg-white/90 text-gray-500 hover:text-gray-800 shadow-sm hover:scale-110 active:scale-95"
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
                      {rp.isComboSet && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className="bg-gray-900 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 fill-current" />
                            Combo
                          </div>
                        </div>
                      )}

                      {/* Discount Badge - top left */}
                      {hasDiscount && !rp.isComboSet && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className="bg-sky-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                            -{discountPercent}%
                          </div>
                        </div>
                      )}


                      {/* Navigation Loading Overlay */}
                      {navigatingSlug === rp.slug && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-20">
                          <svg className="animate-spin h-7 w-7 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-2 flex flex-col flex-1">
                      {/* Store Info */}
                      {rp.store && !rp.store.slug.startsWith('main-store') && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-3.5 h-3.5 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {rp.store.logoUrl ? (
                              <img src={rp.store.logoUrl} alt={rp.store.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[7px] font-bold text-gray-500">{(rp.store.name || 'S').charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 truncate">{rp.store.name}</span>
                        </div>
                      )}

                      {/* Product Name */}
                      <h3 className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2rem] leading-[1.3] mb-1.5">
                        {rp.name}
                      </h3>

                      {/* Price */}
                      <div className="mt-auto">
                        <div className="text-[13px] sm:text-sm font-bold text-gray-900 tracking-tight">
                          {formatCurrency(minPrice)}
                        </div>

                        {hasDiscount && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                              {formatCurrency(maxOriginalPrice)}
                            </span>
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-500">
                              -{discountPercent}%
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
          </div>
        )}
      </div>

      {/* Image Modal */}
      {isImageModalOpen && product.imageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors z-10"
            onClick={() => setIsImageModalOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-w-full max-h-full object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ProductDetailClient from '@/components/customer/ProductDetailClient';
import { apiClient } from '@/lib/apiClient';

interface ProductCategory {
  id: string;
  name: string;
}

interface ProductSize {
  id: string;
  name: string;
}

interface ProductColor {
  id: string;
  name: string;
  hexCode?: string | null;
}

interface ProductVariant {
  id: string;
  sizeId: string | null;
  colorId: string | null;
  price: number | null;
  stock: number;
  size?: ProductSize | null;
  color?: ProductColor | null;
}

interface ProductStore {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  isBanned: boolean;
}

interface ProductDetailPageProduct {
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
  isActive: boolean;
  isComboSet: boolean;
  categories: ProductCategory[];
  variants: ProductVariant[];
  store?: ProductStore | null;
}

interface WishlistResponse {
  productIds?: string[];
}

interface CompletedOrderReference {
  orderId: string;
  size: string | null;
  color: string | null;
}

export default async function ProductDetailPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  let product: ProductDetailPageProduct | null = null;
  try {
    product = await apiClient.get<ProductDetailPageProduct>(`/products/slug/${params.slug}`);
  } catch {
    notFound();
  }

  if (!product || !product.isActive) {
    notFound();
  }
  
  if (product.store && (!product.store.isActive || product.store.isBanned)) {
    notFound();
  }

  const session = await getSession();
  
  // Check if URL has referral code
  const refCode = searchParams.ref;
  
  // If user is logged in AND URL has ref parameter, redirect to clean URL
  if (session && refCode) {
    redirect(`/portal/products/${params.slug}`);
  }

  let wishlistIds: string[] = [];
  let userReferralCode = '';
  let userCompletedOrders: CompletedOrderReference[] = [];
  let relatedProducts: ProductDetailPageProduct[] = [];

  // Fetch non-session-dependent data
  try {
    relatedProducts = await apiClient.get<ProductDetailPageProduct[]>(`/products/${product.id}/related`);
  } catch (error) {
    console.error('Error fetching related products:', error);
  }

  if (session) {
    userReferralCode = session.referralCode || '';
    
    try {
      const [wishlistData, purchaseHistory] = await Promise.all([
        apiClient.get<WishlistResponse>('/wishlist'),
        apiClient.get<CompletedOrderReference[]>(`/orders/check-purchase/${product.id}`),
      ]);
      
      wishlistIds = wishlistData.productIds || [];
      userCompletedOrders = purchaseHistory || [];
    } catch (error) {
      console.error('Error fetching user dashboard data:', error);
    }
  }

  return (
    <ProductDetailClient 
      product={product} 
      relatedProducts={relatedProducts}
      initialWishlistIds={wishlistIds}
      userReferralCode={userReferralCode}
      userCompletedOrders={userCompletedOrders}
    />
  );
}

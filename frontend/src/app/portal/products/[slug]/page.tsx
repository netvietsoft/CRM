import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ProductDetailClient from '@/components/customer/ProductDetailClient';
import { apiClient } from '@/lib/apiClient';

export default async function ProductDetailPage(props: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  let product: any = null;
  try {
    product = await apiClient.get<any>(`/products/slug/${params.slug}`);
  } catch (error) {
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
  let userCompletedOrders: Array<{ orderId: string; size: string | null; color: string | null }> = [];
  let relatedProducts: any[] = [];

  // Fetch non-session-dependent data
  try {
    relatedProducts = await apiClient.get<any[]>(`/products/${product.id}/related`);
  } catch (error) {
    console.error('Error fetching related products:', error);
  }

  if (session) {
    userReferralCode = session.referralCode || '';
    
    try {
      const [wishlistData, purchaseHistory] = await Promise.all([
        apiClient.get<any>('/wishlist'),
        apiClient.get<any[]>(`/orders/check-purchase/${product.id}`),
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

import { getSession } from '@/lib/auth';
import ProductsClient from '@/components/customer/ProductsClient';
import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

async function getProducts() {
  try {
    const response = await apiClient.get<any>('/products?limit=1000');
    return response.data; // Backend returns { data: Product[], meta: ... }
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getCategories() {
  try {
    return await apiClient.get<any[]>('/categories');
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getWishlistIds() {
  try {
    const response = await apiClient.get<any>('/wishlist');
    return response.productIds || [];
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return [];
  }
}

export default async function ProductsPage() {
  const session = await getSession();
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  let wishlistIds: string[] = [];
  let userReferralCode = '';

  if (session) {
    const [wishlistData] = await Promise.all([
      getWishlistIds(),
    ]);
    wishlistIds = wishlistData;
    userReferralCode = session.referralCode || '';
  }

  return (
    <ProductsClient
      products={products}
      categories={categories}
      initialWishlistIds={wishlistIds}
      userReferralCode={userReferralCode}
    />
  );
}

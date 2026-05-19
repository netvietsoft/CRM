import { getSession } from '@/lib/auth';
import ProductsClient from '@/components/customer/ProductsClient';
import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

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

interface ProductsResponse {
  data: Product[];
}

interface WishlistResponse {
  productIds?: string[];
}

async function getProducts() {
  try {
    const response = await apiClient.get<ProductsResponse>('/products?limit=1000');
    return response.data; // Backend returns { data: Product[], meta: ... }
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getCategories() {
  try {
    return await apiClient.get<Category[]>('/categories');
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getWishlistIds() {
  try {
    const response = await apiClient.get<WishlistResponse>('/wishlist');
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

export const dynamic = 'force-dynamic';
import ProductsClient from '@/components/admin/ProductsClient';
import { getSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';

interface AdminProduct {
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
  categories: { id: string; name: string }[];
  variants: Array<Record<string, unknown>>;
  store?: { id: string; name: string } | null;
  _count: { orderItems: number };
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface AdminProductsResponse {
  data: AdminProduct[];
}

export default async function ProductsPage() {
  const session = await getSession();
  
  if (!session) {
    return null;
  }

  // Fetch products and categories in parallel
  const [productsRes, categoriesRes] = await Promise.all([
    apiClient.get<AdminProductsResponse>('/products/admin?limit=1000'),
    apiClient.get<Category[]>('/categories'),
  ]);

  const products = productsRes.data;
  const categories = categoriesRes;

  return (
    <ProductsClient 
      products={products} 
      categories={categories} 
      userRole={session.role}
    />
  );
}

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
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface Supplier {
  id: string;
  name: string;
  code?: string | null;
}

interface Material {
  id: string;
  name: string;
  code?: string | null;
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface ProductTag {
  id: string;
  name: string;
  slug: string;
}

interface AdminProductsResponse {
  data: AdminProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    total: number;
    activeCount: number;
    totalStock: number;
    lowStockCount: number;
  };
}

type ProductsSearchParams = {
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

export default async function ProductsPage(props: {
  searchParams: Promise<ProductsSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  if (!session) {
    return null;
  }

  const [productsRes, categoriesRes, suppliersRes, materialsRes, unitsRes, productTagsRes] = await Promise.all([
    apiClient.get<AdminProductsResponse>('/products/admin', {
      params: {
        page: searchParams.page || '1',
        limit: searchParams.limit || '12',
        search: searchParams.search,
        categoryId: searchParams.categoryId,
        supplierId: searchParams.supplierId,
        materialId: searchParams.materialId,
        unitId: searchParams.unitId,
        tagId: searchParams.tagId,
        sortBy: searchParams.sortBy,
        sortOrder: searchParams.sortOrder,
        isActive: searchParams.isActive,
      },
    }),
    apiClient.get<Category[]>('/categories'),
    apiClient.get<Supplier[]>('/suppliers'),
    apiClient.get<Material[]>('/materials'),
    apiClient.get<Unit[]>('/units'),
    apiClient.get<ProductTag[]>('/product-tags'),
  ]);

  const products = productsRes.data;
  const categories = categoriesRes;
  const suppliers = suppliersRes;
  const materials = materialsRes;
  const units = unitsRes;
  const productTags = productTagsRes;

  return (
    <ProductsClient 
      key={JSON.stringify(searchParams)}
      products={products} 
      pagination={productsRes.meta}
      summary={productsRes.summary}
      initialFilters={searchParams}
      categories={categories} 
      suppliers={suppliers}
      materials={materials}
      units={units}
      productTags={productTags}
      userRole={session.role}
    />
  );
}

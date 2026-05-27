export const dynamic = 'force-dynamic';

import MasterDataManager from '@/components/admin/MasterDataManager';
import { apiClient } from '@/lib/apiClient';

interface ProductTagRecord {
  id: string;
  name: string;
  slug: string;
}

export default async function ProductTagsPage() {
  const productTags = await apiClient.get<ProductTagRecord[]>('/product-tags');

  return (
    <MasterDataManager
      title="Tag sản phẩm"
      description="Quản lý tag để gắn nhãn và lọc sản phẩm"
      resource="product-tags"
      entityLabel="Tag sản phẩm"
      items={productTags}
      fields={[
        { key: 'name', label: 'Tên tag', required: true, placeholder: 'VD: Hàng mới' },
        { key: 'slug', label: 'Slug', placeholder: 'hang-moi' },
      ]}
      columns={[
        { key: 'name', label: 'Tên tag' },
        { key: 'slug', label: 'Slug' },
      ]}
    />
  );
}

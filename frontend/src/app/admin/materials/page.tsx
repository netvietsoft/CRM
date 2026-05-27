export const dynamic = 'force-dynamic';

import MasterDataManager from '@/components/admin/MasterDataManager';
import { apiClient } from '@/lib/apiClient';

interface MaterialRecord {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
}

export default async function MaterialsPage() {
  const materials = await apiClient.get<MaterialRecord[]>('/materials');

  return (
    <MasterDataManager
      title="Chất liệu"
      description="Quản lý master data chất liệu cho sản phẩm"
      resource="materials"
      entityLabel="Chất liệu"
      items={materials}
      fields={[
        { key: 'name', label: 'Tên chất liệu', required: true, placeholder: 'VD: Cotton' },
        { key: 'code', label: 'Mã chất liệu', placeholder: 'COTTON' },
        { key: 'isActive', label: 'Kích hoạt', type: 'checkbox', defaultValue: true },
      ]}
      columns={[
        { key: 'name', label: 'Tên chất liệu' },
        { key: 'code', label: 'Mã' },
        {
          key: 'isActive',
          label: 'Trạng thái',
          render: (item) => (item.isActive === false ? 'Tắt' : 'Hoạt động'),
        },
      ]}
    />
  );
}

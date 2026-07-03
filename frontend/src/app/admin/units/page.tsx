export const dynamic = 'force-dynamic';

import MasterDataManager from '@/components/admin/MasterDataManager';
import { apiClient } from '@/lib/apiClient';

interface UnitRecord {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
}

export default async function UnitsPage() {
  const units = await apiClient.get<UnitRecord[]>('/units');

  return (
    <MasterDataManager
      title="Đơn vị tính"
      description="Quản lý đơn vị tính dùng cho sản phẩm"
      resource="units"
      entityLabel="Đơn vị tính"
      items={units}
      fields={[
        { key: 'name', label: 'Tên đơn vị tính', required: true, placeholder: 'VD: Cái' },
        { key: 'code', label: 'Mã đơn vị tính', required: true, placeholder: 'CAI' },
        { key: 'isActive', label: 'Kích hoạt', type: 'checkbox', defaultValue: true },
      ]}
      columns={[
        { key: 'name', label: 'Tên đơn vị tính' },
        { key: 'code', label: 'Mã' },
        {
          key: 'isActive',
          label: 'Trạng thái',
          format: 'activeStatus',
        },
      ]}
    />
  );
}

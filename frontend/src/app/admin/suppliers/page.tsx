export const dynamic = 'force-dynamic';

import MasterDataManager from '@/components/admin/MasterDataManager';
import { apiClient } from '@/lib/apiClient';

interface SupplierRecord {
  id: string;
  name: string;
  code?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  isActive?: boolean;
}

export default async function SuppliersPage() {
  const suppliers = await apiClient.get<SupplierRecord[]>('/suppliers');

  return (
    <MasterDataManager
      title="Nhà cung cấp"
      description="Quản lý danh sách nhà cung cấp cho sản phẩm"
      resource="suppliers"
      entityLabel="Nhà cung cấp"
      items={suppliers}
      fields={[
        { key: 'name', label: 'Tên nhà cung cấp', required: true, placeholder: 'VD: Nhà cung cấp A' },
        { key: 'code', label: 'Mã nhà cung cấp', placeholder: 'NCC-A' },
        { key: 'phone', label: 'Số điện thoại', placeholder: '0901234567' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'supplier@example.com' },
        { key: 'address', label: 'Địa chỉ', type: 'textarea', placeholder: 'Địa chỉ nhà cung cấp' },
        { key: 'note', label: 'Ghi chú', type: 'textarea', placeholder: 'Ghi chú nội bộ' },
        { key: 'isActive', label: 'Kích hoạt', type: 'checkbox', defaultValue: true },
      ]}
      columns={[
        { key: 'name', label: 'Tên nhà cung cấp' },
        { key: 'code', label: 'Mã' },
        { key: 'phone', label: 'Điện thoại' },
        { key: 'email', label: 'Email' },
        {
          key: 'isActive',
          label: 'Trạng thái',
          format: 'activeStatus',
        },
      ]}
    />
  );
}

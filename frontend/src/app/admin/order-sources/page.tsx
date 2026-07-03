export const dynamic = 'force-dynamic';

import MasterDataManager from '@/components/admin/MasterDataManager';
import { apiClient } from '@/lib/apiClient';

interface OrderSourceRecord {
  id: string;
  code: string;
  name: string;
  type?: string;
  isActive?: boolean;
}

export default async function OrderSourcesPage() {
  let sources: OrderSourceRecord[] = [];
  try {
    sources = await apiClient.get<OrderSourceRecord[]>('/order-sources');
  } catch (error) {
    console.error('Error fetching order sources:', error);
  }

  return (
    <MasterDataManager
      title="Nguồn đơn hàng"
      description="Quản lý các nguồn đơn (Pancake, Website, Viettel, Shopee...). Đơn từ tích hợp sẽ tự đăng ký nguồn."
      resource="order-sources"
      entityLabel="Nguồn đơn"
      items={sources}
      fields={[
        { key: 'name', label: 'Tên nguồn', required: true, placeholder: 'VD: Viettel' },
        { key: 'code', label: 'Mã nguồn (CODE)', required: true, placeholder: 'VD: VIETTEL' },
        { key: 'isActive', label: 'Kích hoạt', type: 'checkbox', defaultValue: true },
      ]}
      columns={[
        { key: 'name', label: 'Tên nguồn' },
        { key: 'code', label: 'Mã' },
        { key: 'type', label: 'Loại' },
        { key: 'isActive', label: 'Trạng thái', format: 'activeStatus' },
      ]}
    />
  );
}

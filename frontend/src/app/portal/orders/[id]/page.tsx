import { apiClient } from '@/lib/apiClient';
import PortalOrderDetailClient from './OrderDetailClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PortalOrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  let order: any = null;
  try {
    order = await apiClient.get<any>(`/orders/${params.id}`);
  } catch (error) {
    console.error('Error fetching order:', error);
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy đơn hàng</h1>
        <Link href="/portal/orders" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return <PortalOrderDetailClient order={order} />;
}

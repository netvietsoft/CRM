import { getSession } from '@/lib/auth';
import OrderList from './OrderList';
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';

export default async function PortalOrdersPage() {
  const session = await getSession();
  if (!session) return null;

  let orders: any[] = [];
  try {
    orders = await apiClient.get<any[]>('/orders');
  } catch (error) {
    console.error('Error fetching orders:', error);
  }

  // API returns strings for dates, ensure it matches what OrderList expects
  const serializedOrders = orders.map(order => ({
    ...order,
    items: order.items || [],
  }));

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Đơn hàng của tôi</h1>
        <p className="text-gray-600 text-sm">Theo dõi lịch sử mua sắm và quà tặng</p>
      </div>

      <OrderList orders={serializedOrders as any} />
    </>
  );
}

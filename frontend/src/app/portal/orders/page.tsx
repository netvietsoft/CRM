import { getSession } from '@/lib/auth';
import OrderList from './OrderList';
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';

interface PortalOrderItem {
  id: string;
  product: { id: string; name: string; imageUrl: string | null } | null;
  quantity: number;
  price: number;
  isGift: boolean;
  size: string | null;
  color: string | null;
}

interface PancakeOrderItem {
  name: string;
  image: string | null;
  quantity: number;
  price: number;
}

interface PortalOrder {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  createdAt: string | Date;
  items: PortalOrderItem[];
  source?: string | null;
  metadata?: {
    items?: PancakeOrderItem[] | null;
  } | null;
}

interface OrderListOrder {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  items: PortalOrderItem[];
  source?: string | null;
  metadata?: {
    items?: PancakeOrderItem[] | null;
  } | null;
}

export default async function PortalOrdersPage() {
  const session = await getSession();
  if (!session) return null;

  let orders: PortalOrder[] = [];
  try {
    orders = await apiClient.get<PortalOrder[]>('/orders');
  } catch (error) {
    console.error('Error fetching orders:', error);
  }

  // API returns strings for dates, ensure it matches what OrderList expects
  const serializedOrders: OrderListOrder[] = orders.map((order) => ({
    ...order,
    createdAt: new Date(order.createdAt),
    items: order.items || [],
  }));

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Đơn hàng của tôi</h1>
        <p className="text-gray-600 text-sm">Theo dõi lịch sử mua sắm và quà tặng</p>
      </div>

      <OrderList orders={serializedOrders} />
    </>
  );
}

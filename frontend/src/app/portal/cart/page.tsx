import { getSession } from '@/lib/auth';
import CartClient from './CartClient';
import { apiClient } from '@/lib/apiClient';

export default async function CartPage() {
  const session = await getSession();
  if (!session) return null;

  let cartItems: any[] = [];
  try {
    const cart = await apiClient.get<any>('/cart');
    cartItems = cart.items || [];
  } catch (error) {
    console.error('Error fetching cart:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Giỏ hàng của bạn</h1>
          <p className="text-gray-600 text-sm">
            {cartItems.length} sản phẩm trong giỏ hàng
          </p>
        </div>

        <CartClient initialItems={cartItems} />
      </div>
    </div>
  );
}

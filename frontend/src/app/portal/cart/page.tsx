import { getSession } from '@/lib/auth';
import CartClient, { type CartItemData } from './CartClient';
import { apiClient } from '@/lib/apiClient';
import type { UserProfile } from '@/types/commerce';

interface CartResponse {
  items?: CartItemData[] | null;
}

export default async function CartPage() {
  const session = await getSession();
  if (!session) return null;

  let cartItems: CartItemData[] = [];
  let userProfile: UserProfile | null = null;
  try {
    const [cart, profile] = await Promise.all([
      apiClient.get<CartResponse>('/cart'),
      apiClient.get<UserProfile>('/users/profile', { cache: 'no-store' }),
    ]);
    cartItems = cart.items || [];
    userProfile = profile;
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

        <CartClient initialItems={cartItems} userProfile={userProfile} />
      </div>
    </div>
  );
}

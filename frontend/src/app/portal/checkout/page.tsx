import { getSession } from '@/lib/auth';
import CheckoutClient from './CheckoutClient';
import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { applyMembershipDiscount, getMembershipDiscountPercent } from '@/lib/membership';
import type {
  CartItem,
  CartResponse,
  ProductSummary,
  ProductVariant,
  UserProfile,
} from '@/types/commerce';
import type { CheckoutOrderItem } from './types';

function findVariant(
  variants: ProductVariant[] | undefined,
  size: string | null,
  color: string | null,
) {
  if (!variants?.length) return null;

  if (size && color) {
    return variants.find((variant) => variant.size?.name === size && variant.color?.name === color) || null;
  }

  if (size) {
    return variants.find((variant) => variant.size?.name === size) || null;
  }

  if (color) {
    return variants.find((variant) => variant.color?.name === color) || null;
  }

  return null;
}

export default async function CheckoutPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login?callbackUrl=/portal/checkout');
  }

  const searchParams = await props.searchParams;
  const cartMode = searchParams.cartMode === 'true';

  let detailedUser: UserProfile;
  try {
    detailedUser = await apiClient.get<UserProfile>('/users/profile', { cache: 'no-store' });
  } catch {
    redirect('/login');
  }

  if (cartMode) {
    const rankDiscountPercent = getMembershipDiscountPercent(
      detailedUser.rank,
      detailedUser.rankConfigs,
    );

    // Cart mode: checkout multiple items from cart
    const itemIds = (searchParams.items || '').split(',').filter(Boolean);
    if (itemIds.length === 0) redirect('/portal/cart');

    let cartItems: CartItem[] = [];
    try {
      const cart = await apiClient.get<CartResponse>('/cart');
      const allCartItems = cart.items || [];
      cartItems = allCartItems.filter((cartItem) => itemIds.includes(cartItem.id));
    } catch {
      redirect('/portal/cart');
    }

    if (cartItems.length === 0) redirect('/portal/cart');

    // Validate all items belong to the same store
    const storeIds = new Set(cartItems.map(ci => ci.product.storeId || '__system__'));
    if (storeIds.size > 1) {
      redirect('/portal/cart'); // Can't mix stores
    }

    const orderItems: CheckoutOrderItem[] = cartItems.map((ci) => {
      let price = ci.product.salePrice || ci.product.originalPrice;
      const variant = findVariant(ci.product.variants, ci.size, ci.color);
      if (variant?.price) {
        price = variant.price;
      }

      price = applyMembershipDiscount(price, rankDiscountPercent);

      return {
        cartItemId: ci.id,
        product: ci.product,
        quantity: ci.quantity,
        size: ci.size,
        color: ci.color,
        price,
      };
    });

    const store = cartItems[0]?.product.store || null;

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Thanh toán đơn hàng</h1>
          <CheckoutClient user={detailedUser} items={orderItems} store={store} cartMode={true} />
        </div>
      </div>
    );
  }

  const rankDiscountPercent = getMembershipDiscountPercent(detailedUser.rank, detailedUser.rankConfigs);

  // Single product mode (Buy Now)
  const productId = searchParams.productId;
  const quantity = parseInt(searchParams.quantity || '1', 10);
  const size = searchParams.size || null;
  const color = searchParams.color || null;

  if (!productId) {
    redirect('/portal/products');
  }

    let product: ProductSummary;
    try {
      product = await apiClient.get<ProductSummary>(`/products/${productId}`);
    } catch {
      redirect('/portal/products');
    }

  if (!product || !product.isActive) {
    redirect('/portal/products');
  }

  let price = product.salePrice || product.originalPrice;
  const variant = findVariant(product.variants, size, color);
  if (variant?.price) {
    price = variant.price;
  }

  price = applyMembershipDiscount(price, rankDiscountPercent);

  const orderItems: CheckoutOrderItem[] = [{
    product,
    quantity,
    size,
    color,
    price,
  }];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Thanh toán đơn hàng</h1>
        <CheckoutClient user={detailedUser} items={orderItems} store={product.store ?? null} cartMode={false} />
      </div>
    </div>
  );
}

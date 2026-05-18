import { getSession } from '@/lib/auth';
import CheckoutClient from './CheckoutClient';
import { notFound, redirect } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';

export default async function CheckoutPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login?callbackUrl=/portal/checkout');
  }

  const searchParams = await props.searchParams;
  const cartMode = searchParams.cartMode === 'true';

  let detailedUser: any;
  try {
    detailedUser = await apiClient.get<any>('/users/profile', { cache: 'no-store' });
  } catch (error) {
    redirect('/login');
  }

  if (cartMode) {
    // Cart mode: checkout multiple items from cart
    const itemIds = (searchParams.items || '').split(',').filter(Boolean);
    if (itemIds.length === 0) redirect('/portal/cart');

    let cartItems: any[] = [];
    try {
      const cart = await apiClient.get<any>('/cart');
      const allCartItems = cart.items || [];
      cartItems = allCartItems.filter((ci: any) => itemIds.includes(ci.id));
    } catch (error) {
      redirect('/portal/cart');
    }

    if (cartItems.length === 0) redirect('/portal/cart');

    // Validate all items belong to the same store
    const storeIds = new Set(cartItems.map(ci => ci.product.storeId || '__system__'));
    if (storeIds.size > 1) {
      redirect('/portal/cart'); // Can't mix stores
    }

    const orderItems = cartItems.map(ci => {
      let price = ci.product.salePrice || ci.product.originalPrice;
      if (ci.product.variants && ci.product.variants.length > 0) {
        let variant = null;
        if (ci.size && ci.color) {
          variant = ci.product.variants.find(
            (v: any) => v.size?.name === ci.size && v.color?.name === ci.color
          );
        } else if (ci.size) {
          variant = ci.product.variants.find(
            (v: any) => v.size?.name === ci.size
          );
        } else if (ci.color) {
          variant = ci.product.variants.find(
            (v: any) => v.color?.name === ci.color
          );
        }
        if (variant && variant.price) {
          price = variant.price;
        }
      }

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

  // Single product mode (Buy Now)
  const productId = searchParams.productId;
  const quantity = parseInt(searchParams.quantity || '1', 10);
  const size = searchParams.size || null;
  const color = searchParams.color || null;

  if (!productId) {
    redirect('/portal/products');
  }

  let product: any;
  try {
    product = await apiClient.get<any>(`/products/${productId}`);
  } catch (error) {
    redirect('/portal/products');
  }

  if (!product || !product.isActive) {
    redirect('/portal/products');
  }

  let price = product.salePrice || product.originalPrice;
  if (product.variants && product.variants.length > 0) {
    let variant = null;
    if (size && color) {
      variant = product.variants.find(
        (v: any) => v.size?.name === size && v.color?.name === color
      );
    } else if (size) {
      variant = product.variants.find(
        (v: any) => v.size?.name === size
      );
    } else if (color) {
      variant = product.variants.find(
        (v: any) => v.color?.name === color
      );
    }
    if (variant && variant.price) {
      price = variant.price;
    }
  }

  const orderItems = [{
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
        <CheckoutClient user={detailedUser} items={orderItems} store={product.store} cartMode={false} />
      </div>
    </div>
  );
}

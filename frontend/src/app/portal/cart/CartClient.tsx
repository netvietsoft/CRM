'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { apiClientClient } from '@/lib/apiClientClient';

interface CartItemData {
  id: string;
  quantity: number;
  size: string | null;
  color: string | null;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    originalPrice: number;
    salePrice: number | null;
    stockQuantity: number;
    isActive: boolean;
    storeId: string | null;
    store: { id: string; name: string } | null;
    variants?: any[];
  };
}

interface CartClientProps {
  initialItems: CartItemData[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

const getCartItemPrice = (item: CartItemData) => {
  let price = item.product.salePrice || item.product.originalPrice;
  if (item.product.variants && item.product.variants.length > 0) {
    let variant = null;
    if (item.size && item.color) {
      variant = item.product.variants.find(
        (v: any) => v.size?.name === item.size && v.color?.name === item.color
      );
    } else if (item.size) {
      variant = item.product.variants.find(
        (v: any) => v.size?.name === item.size
      );
    } else if (item.color) {
      variant = item.product.variants.find(
        (v: any) => v.color?.name === item.color
      );
    }
    if (variant && variant.price) {
      price = variant.price;
    }
  }
  return price;
};

export default function CartClient({ initialItems }: CartClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Group items by store
  const storeGroups = items.reduce<Record<string, { storeName: string; storeId: string | null; items: CartItemData[] }>>((acc, item) => {
    const key = item.product.storeId || '__system__';
    if (!acc[key]) {
      acc[key] = {
        storeName: item.product.store?.name || 'Hệ thống',
        storeId: item.product.storeId,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  // Determine which storeId is currently selected (if any)
  const selectedStoreId = (() => {
    for (const id of selectedIds) {
      const item = items.find(i => i.id === id);
      if (item) return item.product.storeId || '__system__';
    }
    return null;
  })();

  // Calculate subtotal for selected items only
  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const subtotal = selectedItems.reduce((sum, item) => {
    return sum + getCartItemPrice(item) * item.quantity;
  }, 0);

  const toggleSelect = (itemId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllInStore = (storeKey: string) => {
    const group = storeGroups[storeKey];
    if (!group) return;

    const groupIds = group.items.map(i => i.id);
    const allSelected = groupIds.every(id => selectedIds.has(id));

    if (allSelected) {
      // Deselect all in this store
      setSelectedIds(prev => {
        const next = new Set(prev);
        groupIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all in this store (clear others first since single-store)
      setSelectedIds(new Set(groupIds));
    }
  };

  const isItemDisabled = (item: CartItemData) => {
    if (!selectedStoreId) return false;
    const itemStoreKey = item.product.storeId || '__system__';
    return itemStoreKey !== selectedStoreId && !selectedIds.has(item.id);
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const prevItems = items;
    setItems(items.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i));
    try {
      await apiClientClient.patch(`/cart/${itemId}`, { quantity: newQuantity });
    } catch (error: any) {
      setItems(prevItems);
      alert(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const prevItems = items;
    setItems(items.filter(i => i.id !== itemId));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    try {
      await apiClientClient.delete(`/cart/${itemId}`);
    } catch {
      setItems(prevItems);
    }
  };

  const handleCheckout = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(',');
    const storeId = selectedItems[0]?.product.storeId || '';
    router.push(`/portal/checkout?cartMode=true&storeId=${storeId}&items=${ids}`);
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Giỏ hàng trống</h3>
        <p className="text-gray-600 mb-6">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
        <Link
          href="/portal/products"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  const storeKeys = Object.keys(storeGroups);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Info banner if multiple stores */}
        {storeKeys.length > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium">
              ℹ️ Giỏ hàng có sản phẩm từ <strong>{storeKeys.length} cửa hàng</strong> khác nhau. Bạn chỉ có thể thanh toán sản phẩm từ <strong>1 cửa hàng</strong> trong mỗi đơn hàng.
            </p>
          </div>
        )}

        {storeKeys.map((storeKey) => {
          const group = storeGroups[storeKey];
          const groupIds = group.items.map(i => i.id);
          const allGroupSelected = groupIds.every(id => selectedIds.has(id));
          const someGroupSelected = groupIds.some(id => selectedIds.has(id));
          const isThisStoreDisabled = selectedStoreId !== null && selectedStoreId !== storeKey;

          return (
            <div key={storeKey} className={`rounded-xl overflow-hidden transition-all ${isThisStoreDisabled ? 'opacity-50' : ''}`}>
              {/* Store Header */}
              <div className={`flex items-center gap-3 px-5 py-3 ${isThisStoreDisabled ? 'bg-gray-100' : 'bg-white border border-gray-200'} rounded-t-xl`}>
                <input
                  type="checkbox"
                  checked={allGroupSelected}
                  onChange={() => selectAllInStore(storeKey)}
                  disabled={isThisStoreDisabled}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                />
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {group.storeName.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-gray-800 text-sm">{group.storeName}</span>
                <span className="text-xs text-gray-500">({group.items.length} sản phẩm)</span>
              </div>

              {/* Items */}
              <div className="space-y-0">
                {group.items.map((item) => {
                  const price = getCartItemPrice(item);
                  const itemTotal = price * item.quantity;
                  const isOutOfStock = !item.product.isActive;
                  const disabled = isItemDisabled(item);
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white border border-gray-100 border-t-0 p-4 transition-all ${
                        disabled ? 'opacity-40 pointer-events-none' : ''
                      } ${isSelected ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex gap-4 items-center">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          disabled={disabled || isOutOfStock}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600 flex-shrink-0"
                        />

                        {/* Image */}
                        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                          {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 mb-0.5 leading-tight truncate">{item.product.name}</h3>
                          {(item.size || item.color) && (
                            <div className="text-xs text-gray-500 mb-1">
                              {item.size && <span>Size: {item.size} </span>}
                              {item.color && <span>&bull; Màu: {item.color}</span>}
                            </div>
                          )}
                          <div className="text-lg font-bold text-blue-600 mb-1">{formatCurrency(price)}</div>

                          {!item.product.isActive && (
                            <div className="text-xs text-red-600 font-medium bg-red-50 p-1 rounded inline-block">⚠️ Ngừng kinh doanh</div>
                          )}

                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                                disabled={isOutOfStock || item.quantity <= 1}
                              >−</button>
                              <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                                disabled={isOutOfStock}
                              >+</button>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >Xóa</button>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="text-right flex-shrink-0 hidden sm:block">
                          <div className="font-bold text-gray-800">{formatCurrency(itemTotal)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tóm tắt đơn hàng</h3>

          {selectedIds.size === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <div className="text-3xl mb-2">☝️</div>
              Chọn sản phẩm để thanh toán
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Đã chọn</span>
                  <span className="font-medium">{selectedIds.size} sản phẩm</span>
                </div>
                {selectedStoreId && (
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>Cửa hàng</span>
                    <span className="font-medium text-indigo-600">
                      {storeGroups[selectedStoreId]?.storeName || 'Hệ thống'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Tạm tính</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="border-t border-gray-100 pt-4 mt-2 flex justify-between items-center text-lg font-bold text-gray-900">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600 text-xl">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-md shadow-blue-200 active:scale-95 mb-3"
              >
                Thanh toán ({selectedIds.size} sản phẩm)
              </button>
            </>
          )}

          <Link href="/portal/products" className="block text-center text-sm text-gray-600 hover:text-gray-800 font-medium mt-2">
            ← Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}

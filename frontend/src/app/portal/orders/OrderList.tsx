'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, ChevronDown, ChevronUp, Star } from 'lucide-react';
import OrderReviewForm from '@/components/customer/OrderReviewForm';

type OrderItem = {
  id: string;
  product: { id: string; name: string; imageUrl: string | null } | null; // Allow null for deleted products
  quantity: number;
  price: number;
  isGift: boolean;
  size: string | null;
  color: string | null;
};

type Order = {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  items: OrderItem[];
  source?: string | null;
  metadata?: any;
};

export default function OrderList({ orders }: { orders: Order[] }) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const router = useRouter();

  const toggleRow = (id: string) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  const handleReorder = async (order: Order) => {
    const mainItem = order.items.find(i => !i.isGift);
    if (!mainItem || !mainItem.product) {
      alert('Không thể mua lại đơn hàng này (sản phẩm không còn tồn tại)');
      return;
    }

    setReordering(order.id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/check-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: mainItem.product.id,
          size: mainItem.size,
          color: mainItem.color,
          quantity: mainItem.quantity,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Build checkout query
        const query = new URLSearchParams({
          productId: mainItem.product.id,
          quantity: mainItem.quantity.toString(),
        });
        if (mainItem.size) query.append('size', mainItem.size);
        if (mainItem.color) query.append('color', mainItem.color);

        router.push(`/portal/checkout?${query.toString()}`);
      } else {
        alert(data.error || 'Sản phẩm này đã hết hàng!');
      }
    } catch (error) {
      alert('Có lỗi xảy ra khi kiểm tra tồn kho');
    } finally {
      setReordering(null);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

  const handleReviewSuccess = () => {
    setReviewingOrder(null);
    // Refresh page to update review status
    router.refresh();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
      case 'PAYMENT_COLLECTED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">{status === 'COMPLETED' ? 'Hoàn thành' : status === 'DELIVERED' ? 'Đã nhận' : 'Đã thu tiền'}</span>;
      case 'PACKAGING':
      case 'WAITING_FOR_GOODS':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{status === 'PACKAGING' ? 'Đang đóng hàng' : 'Chờ hàng'}</span>;
      case 'PENDING':
      case 'WAITING_FOR_SHIPPING':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">{status === 'PENDING' ? 'Chờ xác nhận' : 'Chờ vận chuyển'}</span>;
      case 'CANCELLED':
      case 'RETURNING':
      case 'REFUNDED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{status === 'CANCELLED' ? 'Đã hủy' : status === 'RETURNING' ? 'Đang hoàn' : 'Hoàn trả'}</span>;
      case 'CONFIRMED':
      case 'SHIPPED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đã gửi hàng'}</span>;
      case 'EXCHANGING':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Đang đổi</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có đơn hàng nào</h3>
        <p className="text-gray-600">Bạn chưa thực hiện đơn đặt đồ nào. Hãy khám phá sản phẩm của chúng tôi!</p>
      </div>
    );
  }

  return (
    <>
      {/* Review Form Modal */}
      {reviewingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <OrderReviewForm
              order={reviewingOrder}
              onSuccess={handleReviewSuccess}
              onCancel={() => setReviewingOrder(null)}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100">
          {orders.map(order => {
            const isPancake = order.source === 'PANCAKE';
            const displayItems = isPancake && order.metadata?.items
              ? (order.metadata.items as any[]).map((it, idx) => ({
                id: `pck-${order.id}-${idx}`,
                product: { name: it.name, imageUrl: it.image },
                quantity: it.quantity,
                price: it.price,
                isGift: false,
                size: null,
                color: null
              }))
              : (order.items || []);

            return (
              <div key={`mob-${order.id}`} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono font-bold text-gray-800">{order.orderCode}</span>
                  {getStatusBadge(order.status)}
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">
                    {new Intl.DateTimeFormat('vi-VN', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    }).format(new Date(order.createdAt))}
                  </span>
                  <span className="font-bold text-rose-600 text-sm">{fmt(order.totalAmount)}</span>
                </div>

                <div className="flex gap-2 mt-2">
                  <Link
                    href={`/portal/orders/${order.id}`}
                    className="flex-1 py-2 text-center text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    Chi tiết
                  </Link>
                  <button
                    onClick={() => handleReorder(order)}
                    disabled={reordering === order.id || isPancake}
                    className="flex-1 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    {reordering === order.id ? 'Đang xử lý' : 'Mua lại'}
                  </button>
                  {(order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                    <button
                      onClick={() => setReviewingOrder(order)}
                      className="flex-1 py-2 text-center text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100"
                    >
                      Đánh giá
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={() => toggleRow(order.id)}
                  className="mt-1 w-full flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  {expandedRow === order.id ? (
                    <>Thu gọn <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>Xem {displayItems.length} sản phẩm <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>

                {expandedRow === order.id && (
                  <div className="mt-2 pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {displayItems.length === 0 && (
                      <div className="text-xs text-gray-500 italic">Không có chi tiết sản phẩm</div>
                    )}
                    {displayItems.map(item => {
                      const productName = item.product?.name || '[Sản phẩm đã bị xóa]';
                      const productImage = item.product?.imageUrl;
                      const hasValidImage = productImage && typeof productImage === 'string' && productImage.length > 0;

                      return (
                        <div key={`mob-item-${item.id}`} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-white border border-gray-100">
                            {hasValidImage ? (
                              <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800 truncate">{productName}</div>
                            <div className="text-[10px] text-gray-500 mt-1">
                              SL: {item.quantity}
                              {item.size && ` • Size: ${item.size}`}
                              {item.color && ` • Màu: ${item.color}`}
                            </div>
                          </div>
                          <div className="text-xs font-bold text-gray-800 text-right whitespace-nowrap pl-2">
                            {item.isGift ? <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Quà tặng</span> : fmt(item.price * item.quantity)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã đơn hàng</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày đặt</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Đánh giá</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Mua lại</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => {
                // For Pancake orders, items are in metadata
                const isPancake = order.source === 'PANCAKE';
                const displayItems = isPancake && order.metadata?.items
                  ? (order.metadata.items as any[]).map((it, idx) => ({
                    id: `pck-${order.id}-${idx}`,
                    product: { name: it.name, imageUrl: it.image },
                    quantity: it.quantity,
                    price: it.price,
                    isGift: false,
                    size: null,
                    color: null
                  }))
                  : (order.items || []); // Fix: Đảm bảo luôn có array

                return (
                  <React.Fragment key={order.id}>
                    <tr
                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${expandedRow === order.id ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleRow(order.id)}
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-gray-800">{order.orderCode}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Intl.DateTimeFormat('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(order.createdAt))}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-800">{fmt(order.totalAmount)}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-center">
                        {(order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewingOrder(order);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-sm font-medium rounded-lg transition-all border border-yellow-200"
                            title="Đánh giá đơn hàng"
                          >
                            <Star className="w-4 h-4" />
                            Đánh giá
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder(order);
                          }}
                          disabled={reordering === order.id || isPancake}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-blue-600 text-gray-700 hover:text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-700"
                          title={isPancake ? "Đơn hàng từ Pancake không hỗ trợ mua lại nhanh" : "Mua lại đơn hàng này"}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {reordering === order.id ? 'Đang xử lý...' : 'Mua lại'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/portal/orders/${order.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                    {expandedRow === order.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="p-0">
                          <div className="p-6 border-b border-gray-200 animate-fadeIn">
                            <h4 className="text-sm font-semibold mb-3 text-gray-800">
                              Sản phẩm ({displayItems.length})
                            </h4>
                            <div className="flex flex-col gap-3">
                              {displayItems.length === 0 && (
                                <div className="text-sm text-gray-500 italic">Không có chi tiết sản phẩm</div>
                              )}
                              {displayItems.map(item => {
                                // Handle deleted products
                                const productName = item.product?.name || '[Sản phẩm đã bị xóa]';
                                const productImage = item.product?.imageUrl;
                                const hasValidImage = productImage && typeof productImage === 'string' && productImage.length > 0;

                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                        {hasValidImage ? (
                                          <img
                                            src={productImage}
                                            alt={productName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-xs text-gray-400">📦</span>
                                        )}
                                      </div>
                                      <div>
                                        <div className={`font-semibold text-sm ${item.product ? 'text-gray-800' : 'text-gray-500 italic'}`}>
                                          {productName}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          Số lượng: {item.quantity}
                                          {(item.size || item.color) && (
                                            <span className="ml-2">
                                              {item.size && <span>• Size: {item.size}</span>}
                                              {item.color && <span>• Màu: {item.color}</span>}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                      <div className="font-bold text-sm">
                                        {item.isGift ? (
                                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Quà tặng</span>
                                        ) : (
                                          fmt(item.price * item.quantity)
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

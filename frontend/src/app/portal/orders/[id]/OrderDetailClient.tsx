'use client';

import Image from '@/components/ui/AppImage';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OrderReviewForm from '@/components/customer/OrderReviewForm';
import { Copy } from 'lucide-react';
import { passthroughImageLoader } from '@/lib/imageLoader';

function fmt(amount: number) {
  return `${new Intl.NumberFormat('vi-VN').format(amount || 0)} đ`;
}

function fmtDate(d: string | Date) {
  if (!d) return '—';
  const date = new Date(d);
  
  if (isNaN(date.getTime()) && typeof d === 'string') {
    const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/) ||
                  d.match(/^(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) return d;
    return d;
  }

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return String(d);
  }
}

interface OrderProductSummary {
  name?: string | null;
  imageUrl?: string | null;
  slug?: string | null;
}

interface OrderItemSummary {
  id: string;
  quantity: number;
  price: number;
  size?: string | null;
  color?: string | null;
  isGift?: boolean;
  product?: OrderProductSummary | null;
}

interface MetadataField {
  name?: string | null;
  value?: string | number | null;
}

interface MetadataItem {
  id?: string | number | null;
  variationId?: string | number | null;
  name?: string | null;
  image?: string | null;
  images?: string[] | null;
  quantity: number;
  price: number;
  size?: string | null;
  color?: string | null;
  isBonusProduct?: boolean;
  isGift?: boolean;
  is_bonus_product?: boolean;
  fields?: MetadataField[] | null;
}

interface CourierUpdate {
  status?: string | null;
  key?: string | null;
  note?: string | null;
  address?: string | null;
  location?: string | null;
  update_at?: string | Date | null;
  update_time?: string | Date | null;
  time?: string | Date | null;
}

interface PartnerMetadata {
  trackingCode?: string | null;
  deliveryName?: string | null;
  deliveryPhone?: string | null;
  courierUpdates?: CourierUpdate[] | null;
  partnerId?: string | null;
}

interface PaymentMetadata {
  totalPaid?: number;
  transferMoney?: number;
}

interface ShippingAddressMetadata {
  fullName?: string | null;
  phoneNumber?: string | null;
  fullAddress?: string | null;
  address?: string | null;
}

interface OrderMetadata {
  partner?: PartnerMetadata | null;
  payment?: PaymentMetadata | null;
  shippingAddress?: ShippingAddressMetadata | null;
  items?: MetadataItem[] | null;
  pancakeCreatedAt?: string | Date | null;
  pancakeStatusName?: string | null;
}

export interface PortalOrderDetail {
  id: string;
  orderCode: string;
  source?: string | null;
  metadata?: OrderMetadata | null;
  status: string;
  hasReview?: boolean;
  items?: OrderItemSummary[] | null;
  subtotal: number;
  discountAmount?: number;
  totalAmount: number;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingStreet?: string | null;
  shippingWard?: string | null;
  shippingProvince?: string | null;
  customerNote?: string | null;
  createdAt: string | Date;
  reviewRewardGranted?: boolean;
}

interface DisplayOrderItem {
  id?: string | number | null;
  name: string;
  image?: string | null;
  quantity: number;
  price?: number | null;
  size?: string | null;
  color?: string | null;
  isGift?: boolean;
  product?: OrderProductSummary | null;
  slug?: string | null;
}

const statusMap: Record<string, { label: string; cls: string; step: number }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'bg-orange-100 text-orange-700', step: 0 },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-cyan-100 text-cyan-700', step: 1 },
  WAITING_FOR_GOODS: { label: 'Chờ hàng', cls: 'bg-yellow-100 text-yellow-700', step: 1 },
  PACKAGING: { label: 'Đang đóng gói', cls: 'bg-purple-100 text-purple-700', step: 2 },
  WAITING_FOR_SHIPPING: {
    label: 'Chờ vận chuyển',
    cls: 'bg-indigo-100 text-indigo-700',
    step: 2,
  },
  SHIPPED: { label: 'Đang giao hàng', cls: 'bg-blue-100 text-blue-700', step: 3 },
  DELIVERED: { label: 'Đã nhận hàng', cls: 'bg-teal-100 text-teal-700', step: 4 },
  PAYMENT_COLLECTED: { label: 'Đã thu tiền', cls: 'bg-emerald-100 text-emerald-700', step: 4 },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-green-100 text-green-700', step: 5 },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700', step: -1 },
  REFUNDED: { label: 'Hoàn trả', cls: 'bg-red-100 text-red-700', step: -1 },
  RETURNING: { label: 'Đang hoàn', cls: 'bg-amber-100 text-amber-700', step: -1 },
  EXCHANGING: { label: 'Đang đổi', cls: 'bg-amber-100 text-amber-700', step: -1 },
};

export default function PortalOrderDetailClient({ order }: { order: PortalOrderDetail }) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirmingReceived, setConfirmingReceived] = useState(false);

  const isPancake = order.source === 'PANCAKE';
  const m: OrderMetadata = order.metadata || {};
  const partner: PartnerMetadata = m.partner || {};
  const payment: PaymentMetadata = m.payment || {};
  const shippingAddr: ShippingAddressMetadata = m.shippingAddress || {};

  const st = statusMap[order.status] || {
    label: order.status,
    cls: 'bg-gray-100 text-gray-700',
    step: 0,
  };
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
  const canConfirmReceived = ['DELIVERED', 'PAYMENT_COLLECTED'].includes(order.status);
  const canReview = order.status === 'COMPLETED' && !order.hasReview;

  const hasLinkedItems = Array.isArray(order.items) && order.items.length > 0 && order.items.some((item) => item.product);

  const displayItems: DisplayOrderItem[] = hasLinkedItems
    ? (order.items || []).map((item) => ({
      id: item.id,
      name: item.product?.name || 'Sản phẩm',
      image: item.product?.imageUrl,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      color: item.color,
      isGift: item.isGift,
      product: item.product,
      slug: item.product?.slug,
    }))
    : isPancake && (m.items?.length ?? 0) > 0
      ? m.items?.map((item) => {
        const sizeField = item.fields?.find((field) => {
          const fieldName = field.name?.toLowerCase();
          return fieldName === 'kích thước' || fieldName === 'size';
        });
        const colorField = item.fields?.find((field) => {
          const fieldName = field.name?.toLowerCase();
          return fieldName === 'màu sắc' || fieldName === 'màu' || fieldName === 'color';
        });
        const sizeValue = typeof sizeField?.value === 'string' ? sizeField.value : null;
        const colorValue = typeof colorField?.value === 'string' ? colorField.value : null;

        return {
          id: item.id || item.variationId,
          name: item.name || 'Sản phẩm',
          image: item.image || item.images?.[0],
          quantity: item.quantity,
          price: item.price,
          size: item.size || sizeValue,
          color: item.color || colorValue,
          isGift: item.isBonusProduct || item.isGift || item.is_bonus_product,
          product: null,
          slug: null,
        };
      }) || []
      : [];

  const reviewOrder = {
    id: order.id,
    orderCode: order.orderCode,
    totalAmount: order.totalAmount,
    status: order.status,
    createdAt: new Date(order.createdAt),
    items: (order.items || []).map((item) => ({
      id: item.id,
      product: item.product
        ? {
          id: item.product.slug || item.id,
          name: item.product.name || 'Sản phẩm',
          imageUrl: item.product.imageUrl || null,
        }
        : null,
      quantity: item.quantity,
      price: item.price,
      isGift: item.isGift || false,
      size: item.size || null,
      color: item.color || null,
    })),
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/${order.id}/cancel`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason: cancelReason }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Không thể hủy đơn hàng');
        return;
      }

      setShowCancelModal(false);
      router.refresh();
    } catch {
      alert('Có lỗi xảy ra');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmReceived = async () => {
    setConfirmingReceived(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/${order.id}/confirm-received`,
        {
          method: 'PATCH',
          credentials: 'include',
        },
      );

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Không thể xác nhận đã nhận hàng');
        return;
      }

      router.refresh();
    } catch {
      alert('Có lỗi xảy ra');
    } finally {
      setConfirmingReceived(false);
    }
  };

  const handleReviewSuccess = () => {
    setShowReviewModal(false);
    router.refresh();
  };

  const statusLabels: Record<string, string> = {
    pending: "Đang chờ xử lý",
    new: "Đang chờ xử lý",
    waiting_confirmation: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    waiting_for_goods: "Chờ hàng",
    waiting_print: "Chờ in",
    printed: "Đã in",
    packing: "Đang đóng gói",
    ready_to_ship: "Sẵn sàng vận chuyển",
    waiting_for_shipping: "Chờ chuyển hàng",
    delivering: "Đang giao hàng",
    ready_to_pickup: "Sẵn sàng lấy hàng",
    picked_up: "Đã lấy hàng",
    delivered: "Đã giao hàng",
    payment_collected: "Đã thu tiền",
    returned: "Đã hoàn trả",
    returning: "Đang hoàn",
    partially_returned: "Hoàn một phần",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
    returned_to_origin: "Hoàn trả về kho"
  };

  return (
    <>
      <div className="mb-6">
        <Link
          href="/portal/orders"
          className="mb-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Quay lại đơn hàng
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
              >
                Hủy đơn
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl bg-white p-6 border border-gray-200">
            <h2 className="mb-2 text-lg font-bold flex items-center gap-2 text-gray-800">Đơn hàng<p className='text-xm text-gray-700'>({displayItems.length})</p></h2>
            <div className="space-y-1">
              {displayItems.map((item, idx) => (
                <div key={item.id || idx} className="flex gap-4 rounded-lg p-3">
                  <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                    {item.image || item.product?.imageUrl ? (
                      <Image
                        loader={passthroughImageLoader}
                        unoptimized
                        src={item.image || item.product?.imageUrl || ''}
                        alt={item.name || item.product?.name || 'Sản phẩm'}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-gray-400">📦</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {item.name || item.product?.name || 'Sản phẩm'}
                    </p>
                    <div className="mt-0.5 flex gap-2 text-xs text-gray-500">
                      <span>SL: {item.quantity}</span>
                      {item.size && <span>Size: {item.size}</span>}
                      {item.color && <span>Màu: {item.color}</span>}
                      {item.price && <span>Giá: {fmt(item.price)}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 items-center">
                      {item.isGift && (
                        <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Quà tặng
                        </span>
                      )}
                      {item.slug && (
                        <Link
                          href={`/portal/products/${item.slug}`}
                          className="inline-block rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 hover:text-blue-700"
                        >
                          Mua lại
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 border border-gray-200">
            <h2 className="mb-1 text-lg font-bold text-gray-800">Chi tiết thanh toán</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Tiền hàng:</span>
                <span className="">{fmt(order.subtotal)}</span>
              </div>
              {(order.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá:</span>
                  <span className="font-semibold">-{fmt(order.discountAmount ?? 0)}</span>
                </div>
              )}
              {isPancake && (payment.totalPaid ?? 0) > 0 && (
                <div className="mt-1">
                  {(payment.transferMoney ?? 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Chuyển khoản:</span>
                      <span className="font-medium">{fmt(payment.transferMoney ?? 0)}</span>
                    </div>
                  )}
                </div>

              )}
              <div className="flex justify-between pt-2 text-base font-bold text-gray-900">
                <span>Tổng cộng:</span>
                <span className="text-blue-600">{fmt(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {isPancake && partner.trackingCode && (
            <div className="rounded-xl bg-white p-6 border border-gray-200">
              <h2 className="mb-4 text-lg font-bold text-gray-800 flex items-center gap-2">
                Thông tin vận chuyển
              </h2>
              {(partner.deliveryName || partner.deliveryPhone) && (
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  {partner.deliveryName && (
                    <div>
                      <p className="text-xs text-gray-500">Tên shipper</p>
                      <p className="font-medium text-gray-800">{partner.deliveryName}</p>
                    </div>
                  )}
                  {partner.deliveryPhone && (
                    <div>
                      <p className="text-xs text-gray-500">SĐT shipper</p>
                      <p className="font-medium text-gray-800">{partner.deliveryPhone}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Shipping Timeline */}
              {(partner.courierUpdates?.length ?? 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-700 mb-4">Lịch sử vận chuyển</h3>
                  <div className="relative pl-6">
                    {/* Vertical line */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {partner.courierUpdates?.map((update, idx) => {
                        const updatedAt = update.update_at || update.update_time || update.time;

                        return (
                          <div key={idx} className="relative">
                            {/* Dot */}
                            <div className={`absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center z-10 ${idx === 0
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-white border-gray-300'
                              }`}>
                              {idx === 0 && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="ml-2 pb-1">
                              <p className={`text-sm ${idx === 0 ? 'text-black' : 'text-black'}`}>
                                <span className='font-semibold text-sm text-black'>Trạng thái VC:</span> {update.status || update.key || 'Cập nhật'}
                              </p>
                              {update.note && (
                                <p className="text-xs text-black mt-0.5"><span className='font-semibold text-xs text-black'>Ghi chú: </span>{update.note}</p>
                              )}
                              {update.address && (
                                <p className="text-xs text-black mt-0.5"><span className='font-semibold text-xs text-black'>Địa chỉ: </span>{update.address}</p>
                              )}
                              {update.location && (
                                <p className="text-xs text-black mt-0.5">Vị trí: {update.location}</p>
                              )}
                              {updatedAt && (
                                <p className="text-xs text-black mt-1"><span className='font-semibold text-xs text-black'>Cập nhật gần nhất:</span> {fmtDate(updatedAt)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 border border-gray-200">
            <h2 className="mb-3 text-lg font-bold text-gray-800">Thông tin nhận hàng</h2>
            <div className="space-y-2.5 text-sm">
              <div>
                <p className="text-xs text-gray-500">Người nhận</p>
                <p className="font-medium text-gray-800">
                  {isPancake ? shippingAddr.fullName || order.shippingName : order.shippingName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Số điện thoại</p>
                <p className="font-medium text-gray-800">
                  {isPancake ? shippingAddr.phoneNumber || order.shippingPhone : order.shippingPhone}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Địa chỉ</p>
                <p className="font-medium text-gray-800">
                  {isPancake
                    ? shippingAddr.fullAddress || shippingAddr.address
                    : [order.shippingStreet, order.shippingWard, order.shippingProvince]
                      .filter(Boolean)
                      .join(', ')}
                </p>
              </div>
            </div>
          </div>
          {isPancake && partner.trackingCode && (
            <div className="rounded-xl bg-white p-6 border border-gray-200">
              <h2 className="mb-3 text-lg font-bold text-gray-800 flex items-center gap-2">
                Thông tin đơn hàng
              </h2>
              <div className="divide-y divide-gray-100 text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <p className="text-gray-500">Mã vận đơn:</p>
                  <div className="font-medium text-blue-500 flex items-center gap-1 cursor-pointer" onClick={() => navigator.clipboard.writeText(partner.trackingCode ?? '')}>
                    {partner.trackingCode}
                    <Copy className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <p className="text-gray-500">Ngày đặt hàng:</p>
                  <p className="font-medium text-gray-800">{fmtDate(m.pancakeCreatedAt || order.createdAt)}</p>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <p className="text-gray-500">Trạng thái đơn hàng:</p>
                  <p className="font-medium text-gray-800">
                    {statusLabels[m.pancakeStatusName ?? ''] || m.pancakeStatusName || st.label}
                  </p>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <p className="text-gray-500">Đơn vị vận chuyển:</p>
                  <p className="font-medium text-gray-800">
                    {partner.partnerId === 'viettelpost' || partner.partnerId === '3' ? 'VTP'
                      : partner.partnerId === 'GHN' ? 'GHN'
                        : partner.partnerId === 'GHTK' ? 'GHTK'
                          : partner.partnerId || 'ĐVVC'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {order.customerNote && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-gray-800">Ghi chú</h2>
              <div className="rounded-r-lg border-l-4 border-gray-200 bg-gray-50 p-3">
                <p className="text-sm italic text-gray-700">{order.customerNote}</p>
              </div>
            </div>
          )}

          {(canConfirmReceived || canReview || order.hasReview) && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-gray-800">Sau khi giao hàng</h2>
              <div className="space-y-3">
                {canConfirmReceived && (
                  <button
                    onClick={handleConfirmReceived}
                    disabled={confirmingReceived}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {confirmingReceived ? 'Đang xác nhận...' : 'Tôi đã nhận được hàng'}
                  </button>
                )}

                {canReview && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    Đánh giá kèm mô tả để nhận 1 lượt quay thưởng
                  </button>
                )}

                {order.hasReview && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Bạn đã đánh giá đơn hàng này
                    {order.reviewRewardGranted ? ' và đã nhận thưởng lượt quay.' : '.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <OrderReviewForm
              order={reviewOrder}
              onSuccess={handleReviewSuccess}
              onCancel={() => setShowReviewModal(false)}
            />
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-lg font-bold text-gray-800">Hủy đơn hàng</h3>
            <p className="mb-4 text-sm text-gray-600">
              Bạn có chắc muốn hủy đơn hàng <strong>#{order.orderCode}</strong>?
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Lý do hủy (không bắt buộc)..."
              className="mb-4 h-24 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Quay lại
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

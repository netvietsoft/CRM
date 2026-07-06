import type { ReactNode } from 'react';
import Image from '@/components/ui/AppImage';
import Link from 'next/link';
import OrderReadStatusManager from '@/components/admin/OrderReadStatusManager';
import DeleteOrderButton from '@/components/admin/DeleteOrderButton';
import CreateOrderVoucherButton from '@/components/admin/CreateOrderVoucherButton';
import { apiClient } from '@/lib/apiClient';
import { Copy } from 'lucide-react';
import OrderPaymentClient from '@/components/admin/OrderPaymentClient';
import OrderNotesClient from '@/components/admin/OrderNotesClient';
import OrderInfoClient from '@/components/admin/OrderInfoClient';
import { OrderSaveProvider } from '@/components/admin/OrderSaveProvider';
import { passthroughImageLoader } from '@/lib/imageLoader';
import { formatVnd } from '@/lib/format';

function fmt(amount: number) {
  return formatVnd(amount);
}

function fmtDate(d: string | Date) {
  if (!d) return '—';
  const date = new Date(d);

  if (isNaN(date.getTime()) && typeof d === 'string') {
    // Try to handle DD/MM/YYYY HH:mm or HH:mm DD/MM/YYYY
    const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/) ||
      d.match(/^(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) return d; // If it matches a common readable format but isn't ISO, just return it as is
    return d; // Return raw string as fallback
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

interface StaffSummary {
  id: string;
  name?: string | null;
  phone?: string | null;
}

interface OrderUserSummary {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  rank?: string | null;
  addressStreet?: string | null;
  addressWard?: string | null;
  addressProvince?: string | null;
}

interface OrderProductSummary {
  name?: string | null;
  imageUrl?: string | null;
}

interface OrderItem {
  id: string;
  product?: OrderProductSummary | null;
  productName?: string | null;
  productImageUrl?: string | null;
  productDisplayId?: string | null;
  productBarcode?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number;
  isGift?: boolean;
}

interface MetadataField {
  name?: string | null;
  keyValue?: string | null;
  value?: string | number | null;
}

interface MetadataItem {
  id?: string | number | null;
  variationId?: string | number | null;
  image?: string | null;
  name?: string | null;
  displayId?: string | null;
  barcode?: string | null;
  fields?: MetadataField[] | null;
  quantity: number;
  weight?: number | null;
  isBonusProduct?: boolean;
  discountEachProduct?: number | null;
  isDiscountPercent?: boolean;
  returnedCount?: number | null;
  price: number;
}


interface OrderDisplayItem {
  key: string;
  image?: string | null;
  name?: string | null;
  displayId?: string | null;
  barcode?: string | null;
  fields?: MetadataField[] | null;
  quantity: number;
  weight?: number | null;
  isGift?: boolean;
  price: number;
}

interface VoucherApplication {
  id: string;
  discountApplied: number;
  userVoucher?: {
    voucher?: {
      code?: string | null;
    } | null;
  } | null;
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

interface CommissionSummary {
  id: string;
  amount: number;
  status?: string | null;
  level?: number | string | null;
  percentage?: number | string | null;
  user?: {
    name?: string | null;
  } | null;
}

interface MetadataCustomer {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  fbId?: string | null;
  pancakeCustomerId?: string | null;
}

interface ShippingAddressMetadata {
  fullAddress?: string | null;
  fullName?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
}

interface SourceMetadata {
  accountName?: string | null;
  pageId?: string | null;
  postId?: string | null;
  isFromEcommerce?: boolean;
  isLivestream?: boolean;
  receivedAtShop?: boolean;
}

interface WarehouseInfo {
  name?: string | null;
  phone_number?: string | null;
  full_address?: string | null;
  address?: string | null;
}

interface StaffMetadata {
  name?: string | null;
}

interface ReportByPhone {
  order_success?: number;
  order_fail?: number;
  warning?: number;
}

type OrderTag = string | { name?: string | null };

interface PartnerMetadata {
  trackingCode?: string | null;
  totalFee?: number;
  deliveryName?: string | null;
  deliveryPhone?: string | null;
  pickedUpAt?: string | Date | null;
  cod?: number;
  sortCode?: string | null;
  paidAt?: string | Date | null;
  courierUpdates?: CourierUpdate[] | null;
}

interface OrderMetadata {
  pancakeCreatedAt?: string | Date | null;
  items?: MetadataItem[] | null;
  partner?: PartnerMetadata | null;
  shippingAddress?: ShippingAddressMetadata | null;
  customer?: MetadataCustomer | null;
  source?: SourceMetadata | null;
  reportsByPhone?: Record<string, ReportByPhone> | null;
  trackingLink?: string | null;
  warehouseInfo?: WarehouseInfo | null;
  tags?: OrderTag[] | null;
  creator?: StaffMetadata | null;
  marketer?: StaffMetadata | null;
  assigningSeller?: StaffMetadata | null;
  assigningCare?: StaffMetadata | null;
}

interface OrderDetail {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  source?: string | null;
  storeId?: string | null;
  metadata?: OrderMetadata | null;
  user?: OrderUserSummary | null;
  items?: OrderItem[] | null;
  isRead?: boolean;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingStreet?: string | null;
  shippingWard?: string | null;
  shippingProvince?: string | null;
  appliedVouchers?: VoucherApplication[] | null;
  commissions?: CommissionSummary[] | null;
}

// Design pill families (handoff): green #047857/#d1fae5, orange #c2410c/#ffedd5,
// yellow #92400e/#fef3c7, red #dc2626/#fee2e2
const PILL = {
  green: 'bg-[#d1fae5] text-[#047857]',
  orange: 'bg-[#ffedd5] text-[#c2410c]',
  yellow: 'bg-[#fef3c7] text-[#92400e]',
  red: 'bg-[#fee2e2] text-[#dc2626]',
  gray: 'bg-gray-100 text-gray-600',
} as const;

const statusMap: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: PILL.orange, label: 'Chờ duyệt' },
  WAITING_FOR_GOODS: { cls: PILL.yellow, label: 'Chờ hàng' },
  CONFIRMED: { cls: PILL.green, label: 'Đã xác nhận' },
  PACKAGING: { cls: PILL.yellow, label: 'Đang đóng hàng' },
  WAITING_FOR_SHIPPING: { cls: PILL.yellow, label: 'Chờ chuyển hàng' },
  SHIPPED: { cls: PILL.green, label: 'Đã gửi hàng' },
  DELIVERED: { cls: PILL.green, label: 'Đã nhận hàng' },
  PAYMENT_COLLECTED: { cls: PILL.green, label: 'Đã thu tiền' },
  RETURNING: { cls: PILL.orange, label: 'Đang hoàn' },
  EXCHANGING: { cls: PILL.orange, label: 'Đang đổi' },
  COMPLETED: { cls: PILL.green, label: 'Hoàn thành' },
  CANCELLED: { cls: PILL.red, label: 'Đã hủy' },
  REFUNDED: { cls: PILL.red, label: 'Đã hoàn trả' },
};

const paymentStatusMap: Record<string, { cls: string; label: string }> = {
  UNPAID: { cls: PILL.gray, label: 'Chưa thanh toán' },
  PAID: { cls: PILL.green, label: 'Đã thanh toán' },
  PARTIALLY_PAID: { cls: PILL.yellow, label: 'Thanh toán 1 phần' },
  REFUNDED: { cls: PILL.red, label: 'Đã hoàn tiền' },
};

function InfoRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-gray-800 ${className || ''}`}>{value}</p>
    </div>
  );
}

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const backUrl = searchParams?.from === 'order-vouchers' ? '/admin/order-vouchers' : '/admin/orders';

  let order: OrderDetail | null = null;
  let staffList: StaffSummary[] = [];

  try {
    order = await apiClient.get<OrderDetail>(`/orders/${params.id}`);
    if (order?.storeId) {
      staffList = await apiClient.get<StaffSummary[]>(`/admin/staff?storeId=${order.storeId}`);
    }
  } catch (error) {
    console.error('Error fetching order details or staff:', error);
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập
        </h1>
        <Link
          href={backUrl}
          className="text-[#2563eb] hover:text-[#1d4ed8] font-semibold text-sm"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const st = statusMap[order.status] || {
    cls: 'bg-gray-100 text-gray-700',
    label: order.status,
  };
  const pst = paymentStatusMap[order.paymentStatus] || {
    cls: 'bg-gray-100 text-gray-700',
    label: order.paymentStatus,
  };

  const isPancake = order.source === 'PANCAKE';
  const m: OrderMetadata = order.metadata ?? {};
  const partner: PartnerMetadata = m.partner ?? {};
  const shippingAddr: ShippingAddressMetadata = m.shippingAddress ?? {};
  const customer: MetadataCustomer = m.customer ?? {};
  const source: SourceMetadata = m.source ?? {};

  const fullAddress = isPancake
    ? shippingAddr.fullAddress
    : [order.user?.addressStreet, order.user?.addressWard, order.user?.addressProvince].filter(Boolean).join(', ');

  const linkedDisplayItems: OrderDisplayItem[] = (order.items || []).map((item) => ({
    key: item.id,
    image: item.product?.imageUrl || item.productImageUrl,
    name: item.product?.name || item.productName || 'Sản phẩm',
    displayId: item.productDisplayId,
    barcode: item.productBarcode,
    fields:
      item.size || item.color
        ? [
            ...(item.size ? [{ name: 'Size', value: item.size }] : []),
            ...(item.color ? [{ name: 'Màu', value: item.color }] : []),
          ]
        : null,
    quantity: item.quantity,
    isGift: item.isGift,
    price: item.price,
  }));

  const metadataDisplayItems: OrderDisplayItem[] = (m.items || []).map((item, idx) => ({
    key: String(item.id ?? item.variationId ?? idx),
    image: item.image,
    name: item.name || 'Sản phẩm',
    displayId: item.displayId,
    barcode: item.barcode,
    fields: item.fields,
    quantity: item.quantity,
    weight: item.weight,
    isGift: item.isBonusProduct,
    price: item.price,
  }));

  const displayItems = isPancake && metadataDisplayItems.length > linkedDisplayItems.length
    ? metadataDisplayItems
    : linkedDisplayItems.length > 0
      ? linkedDisplayItems
      : metadataDisplayItems;

  return (
    <>
      <OrderReadStatusManager orderId={order.id} isRead={order.isRead ?? false} />
      <div className="mb-[18px]">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-[#2563eb] mb-3.5"
        >
          ← Danh sách đơn hàng
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.4px] font-mono text-gray-900">
              #{order.orderCode}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>
              {st.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${pst.cls}`}>
              {pst.label}
            </span>
            {isPancake && m.pancakeCreatedAt && (
              <span className="text-xs text-gray-400 font-medium">
                {fmtDate(m.pancakeCreatedAt)}
              </span>
            )}
          </div>
          <div className="flex gap-2.5 flex-wrap items-center">
            <DeleteOrderButton orderId={order.id} orderCode={order.orderCode} />
          </div>
        </div>
      </div>

      <OrderSaveProvider>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Items */}
          <div className="bg-white border border-[#eceef2] rounded-[14px] overflow-hidden">
            <div className="px-5 py-[15px] border-b border-[#f0f1f5] text-[15px] font-bold text-gray-900">
              Sản phẩm ({displayItems.length})
            </div>
            <div>
              {displayItems.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-3 items-start px-5 py-[13px] border-b border-[#f3f4f6]"
                >
                  <div className="w-11 h-11 bg-[#f3f4f6] rounded-[10px] overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image
                        loader={passthroughImageLoader}
                        unoptimized
                        src={item.image}
                        alt={item.name ?? 'Sản phẩm'}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 flex items-center justify-center text-[10px] font-semibold text-gray-400">
                        Ảnh
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13.5px] font-semibold text-gray-800 mb-1">
                      {item.name || 'Sản phẩm'}
                    </h3>
                    <div className="flex gap-2 flex-wrap mb-1">
                      {item.displayId && (
                        <span className="text-[11px] bg-[#f3f4f6] text-gray-500 px-1.5 py-0.5 rounded font-mono">
                          SKU: {item.displayId}
                        </span>
                      )}
                      {item.barcode && (
                        <span className="text-[11px] bg-[#f3f4f6] text-gray-500 px-1.5 py-0.5 rounded font-mono">
                          {item.barcode}
                        </span>
                      )}
                    </div>
                    {item.fields && item.fields.length > 0 && (
                      <p className="text-[11.5px] text-gray-400 mb-1">
                        {item.fields.map((field) => `${field.name || field.keyValue}: ${field.value}`).join(' • ')}
                      </p>
                    )}
                    <p className="text-[11.5px] text-gray-400">
                      Số lượng: {item.quantity} {item.weight ? `• ${item.weight}g` : ''}
                    </p>
                    {item.isGift && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-[#fef3c7] text-[#92400e] text-[11px] font-semibold rounded">
                        Quà tặng
                      </span>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap min-w-[90px]">
                    <p className="text-[13.5px] font-bold text-gray-900">{fmt(item.price * item.quantity)}</p>
                    <p className="text-[12.5px] text-gray-500">
                      {fmt(item.price)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2-Column Grid for Payment and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Summary / Financials - Pancake style (Dynamic Client Component) */}
            <OrderPaymentClient order={order} metadata={m} isPancake={isPancake} />

            {/* Notes Section */}
            <OrderNotesClient order={order} />
          </div>

          {/* Vouchers */}
          {(order.appliedVouchers?.length ?? 0) > 0 && (
            <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">
                Voucher đã áp dụng:
              </h3>
              <div className="space-y-2">
                {order.appliedVouchers?.map((ov) => (
                  <div
                    key={ov.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span className="font-mono text-sm font-semibold">
                      {ov.userVoucher?.voucher?.code || 'Voucher'}
                    </span>
                    <span className="text-sm text-green-600 font-semibold">
                      -{fmt(ov.discountApplied)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Partner / Tracking for Pancake */}
          {isPancake && partner && partner.trackingCode && (
            <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
              <h2 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                Trạng thái đơn hàng
              </h2>
              <div className="space-y-4">
                {/* Tracking header */}
                <div className="flex items-center justify-between rounded-lg">
                  <div className='flex items-center gap-2'>
                    <p className="font-mono font-bold text-[#2563eb] text-lg select-all">{partner.trackingCode}</p>
                    <Copy className='w-4 h-4 text-[#2563eb] cursor-pointer' />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Phí Ship</p>
                    <p className="font-semibold text-gray-800">{fmt(partner.totalFee ?? 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Tên shipper" value={partner.deliveryName} />
                  <InfoRow label="SĐT shipper" value={partner.deliveryPhone} />
                  <InfoRow label="Thời điểm lấy hàng" value={partner.pickedUpAt ? fmtDate(partner.pickedUpAt) : null} />
                  <InfoRow label="COD (ĐVVC)" value={(partner.cod ?? 0) > 0 ? fmt(partner.cod ?? 0) : null} />
                  <InfoRow label="Mã phân loại" value={partner.sortCode} />
                  <InfoRow label="Thời điểm đối soát" value={partner.paidAt ? fmtDate(partner.paidAt) : null} />
                </div>

                {/* Timeline */}
                {partner.courierUpdates && partner.courierUpdates.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-4">Lịch sử vận chuyển</h3>
                    <div className="relative pl-6">
                      {/* Vertical line */}
                      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />
                      <div className="space-y-4">
                        {partner.courierUpdates.map((update, idx) => {
                          const updatedAt = update.update_at ?? update.update_time ?? update.time;

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
            </div>
          )}

          {/* Commissions */}
          {(order.commissions?.length ?? 0) > 0 && (
            <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
              <h2 className="text-[15px] font-bold text-gray-900 mb-4">
                Hoa hồng ({order.commissions?.length ?? 0})
              </h2>
              <div className="space-y-3">
                {order.commissions?.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {comm.user?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Cấp {comm.level} • {comm.percentage}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{fmt(comm.amount)}</p>
                      <p className="text-xs text-gray-500">{comm.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <CreateOrderVoucherButton orderId={order.id} orderCode={order.orderCode} />

        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Information Section */}
          <OrderInfoClient order={order} metadata={m} isPancake={isPancake} staffList={staffList} statusLabel={st.label} />
          {/* Customer Info */}
          <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
            <h2 className="text-[15px] font-bold text-gray-900 mb-4">
              Khách hàng
            </h2>
            <div className="space-y-3">
              <InfoRow label="Tên" value={isPancake ? (customer.name || order.user?.name) : order.user?.name} />
              <InfoRow label="Số điện thoại" value={isPancake ? (customer.phone || order.user?.phone) : order.user?.phone} />
              <InfoRow label="Email" value={isPancake ? (customer.email || order.user?.email) : order.user?.email} />
              {!isPancake && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Hạng</p>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    {order.user?.rank || 'MEMBER'}
                  </span>
                </div>
              )}
              {isPancake && customer.fbId && (
                <InfoRow label="Facebook ID" value={customer.fbId} />
              )}
              {isPancake && customer.pancakeCustomerId && (
                <InfoRow label="Pancake Customer ID" value={customer.pancakeCustomerId} />
              )}
              {fullAddress && <InfoRow label="Địa chỉ" value={fullAddress} />}
            </div>

            {/* Reports by phone (Pancake) */}
            {isPancake && m.reportsByPhone && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Lịch sử đơn hàng</h3>
                {Object.entries(m.reportsByPhone).map(([phone, report]) => (
                  <div key={phone} className="flex gap-3 text-sm">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        ✓ {report.order_success || 0}
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                        ✗ {report.order_fail || 0}
                      </span>
                      {(report.warning ?? 0) > 0 && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          {report.warning ?? 0}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
            <h2 className="text-[15px] font-bold text-gray-900 mb-4">📍 Nhận hàng</h2>
            <div className="space-y-3">
              <InfoRow
                label="Người nhận"
                value={isPancake ? shippingAddr.fullName : order.shippingName}
              />
              <InfoRow
                label="SĐT"
                value={isPancake ? shippingAddr.phoneNumber : order.shippingPhone}
              />
              <InfoRow
                label="Địa chỉ"
                value={isPancake ? (shippingAddr.fullAddress || shippingAddr.address) : order.shippingStreet}
              />
              {!isPancake && (
                <>
                  <InfoRow label="Phường/Xã" value={order.shippingWard} />
                  <InfoRow label="Tỉnh/TP" value={order.shippingProvince} />
                </>
              )}
            </div>
          </div>

          {/* Source / Channel Info for Pancake */}
          {isPancake && (source.accountName || source.pageId || m.trackingLink) && (
            <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
              <h2 className="text-[15px] font-bold text-gray-900 mb-4">📡 Nguồn đơn</h2>
              <div className="space-y-3">
                <InfoRow label="Nguồn" value={source.accountName} />
                <InfoRow label="Page ID" value={source.pageId} />
                <InfoRow label="Post ID" value={source.postId} />
                {source.isFromEcommerce && (
                  <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                    Sàn TMĐT
                  </span>
                )}
                {source.isLivestream && (
                  <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                    Livestream
                  </span>
                )}
                {source.receivedAtShop && (
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                    Bán tại quầy
                  </span>
                )}
                {m.trackingLink && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Link xác nhận</p>
                    <a href={m.trackingLink} target="_blank" rel="noreferrer" className="text-[#2563eb] hover:underline text-sm break-all">
                      {m.trackingLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warehouse Info */}
          {isPancake && m.warehouseInfo && (
            <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
              <h2 className="text-[15px] font-bold text-gray-900 mb-4">Kho hàng</h2>
              <div className="space-y-3">
                <InfoRow label="Tên kho" value={m.warehouseInfo.name} />
                <InfoRow label="SĐT kho" value={m.warehouseInfo.phone_number} />
                <InfoRow label="Địa chỉ" value={m.warehouseInfo.full_address || m.warehouseInfo.address} />
              </div>
            </div>
          )}

          {/* Tags */}
          {isPancake && m.tags && m.tags.length > 0 && (
            <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
              <h2 className="text-[15px] font-bold text-gray-900 mb-4">🏷️ Thẻ</h2>
              <div className="flex gap-2 flex-wrap">
                {m.tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {typeof tag === 'string' ? tag : tag.name || ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Staff Assignments */}
          {isPancake && (m.creator || m.marketer || m.assigningSeller || m.assigningCare) && (
            <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
              <h2 className="text-[15px] font-bold text-gray-900 mb-4">Nhân viên</h2>
              <div className="space-y-3">
                {m.creator && <InfoRow label="Người tạo đơn" value={m.creator.name} />}
                {m.marketer && <InfoRow label="Marketer" value={m.marketer.name} />}
                {m.assigningSeller && <InfoRow label="Nhân viên bán hàng" value={m.assigningSeller.name} />}
                {m.assigningCare && <InfoRow label="Nhân viên chăm sóc" value={m.assigningCare.name} />}
              </div>
            </div>
          )}
        </div>
        </div>
      </OrderSaveProvider>
    </>
  );
}

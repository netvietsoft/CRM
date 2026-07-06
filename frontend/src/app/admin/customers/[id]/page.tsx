import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';
import CustomerActions from './CustomerActions';
import { formatVndSymbol } from '@/lib/format';

interface CustomerOrder {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  paymentStatus?: string | null;
  source?: string | null;
  createdAt: string | Date;
}

interface CustomerCommission {
  id: string;
  amount: number;
  percentage: number;
  level: number;
  status: string;
  createdAt: string | Date;
  order?: {
    orderCode: string;
    totalAmount: number;
  } | null;
}

interface CustomerVoucher {
  id: string;
  isUsed: boolean;
  usedAt?: string | Date | null;
  createdAt: string | Date;
  voucher?: {
    code: string;
    type: string;
    value: number;
    validTo?: string | Date | null;
  } | null;
}

interface CustomerReferrer {
  id: string;
  name: string | null;
  phone: string | null;
  referralCode: string;
}

interface CustomerReferee {
  id: string;
  name: string | null;
  phone: string | null;
  rank: string;
  totalSpent: number;
  createdAt: string | Date;
}

interface CustomerDetail {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dob: string | Date | null;
  rank: string;
  totalSpent: number;
  commissionBalance: number;
  referralCode: string;
  addressStreet: string | null;
  addressWard: string | null;
  addressProvince: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  referrer?: CustomerReferrer | null;
  referees: CustomerReferee[];
  orders: CustomerOrder[];
  commissionsEarned: CustomerCommission[];
  userVouchers: CustomerVoucher[];
  _count?: {
    orders?: number;
    referees?: number;
    commissionsEarned?: number;
    userVouchers?: number;
  };
  stats?: {
    completedOrders: number;
    completedRevenue: number;
    totalCommission: number;
  };
}

function formatMoney(amount: number) {
  return formatVndSymbol(amount);
}

function formatDate(value: string | Date) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | Date) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const statusMap: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Chờ duyệt', bg: '#ffedd5', fg: '#c2410c' },
  CONFIRMED: { label: 'Đã xác nhận', bg: '#fef3c7', fg: '#92400e' },
  PACKAGING: { label: 'Đang đóng hàng', bg: '#fef3c7', fg: '#92400e' },
  SHIPPED: { label: 'Đã gửi hàng', bg: '#dbeafe', fg: '#1d4ed8' },
  DELIVERED: { label: 'Đã nhận hàng', bg: '#d1fae5', fg: '#047857' },
  COMPLETED: { label: 'Hoàn thành', bg: '#d1fae5', fg: '#047857' },
  CANCELLED: { label: 'Đã hủy', bg: '#fee2e2', fg: '#dc2626' },
  REFUNDED: { label: 'Hoàn trả', bg: '#fee2e2', fg: '#dc2626' },
};

const rankMap: Record<string, { bg: string; fg: string }> = {
  MEMBER: { bg: '#f1f5f9', fg: '#334155' },
  SILVER: { bg: '#e2e8f0', fg: '#1e293b' },
  GOLD: { bg: '#fef3c7', fg: '#92400e' },
  DIAMOND: { bg: '#cffafe', fg: '#155e75' },
  PLATINUM: { bg: '#fae8ff', fg: '#86198f' },
};

export default async function CustomerDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  let customer: CustomerDetail | null = null;
  try {
    customer = await apiClient.get<CustomerDetail>(`/admin/customers/${params.id}`);
  } catch (error) {
    console.error('Failed to load customer detail', error);
  }

  if (!customer) {
    return (
      <div className="py-16 text-center">
        <div className="mb-[10px] text-[44px]">👥</div>
        <h1 className="text-[16px] font-bold text-[#111827]">Không tìm thấy khách hàng</h1>
        <Link href="/admin/customers" className="mt-4 inline-block text-[13px] font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const address = [
    customer.addressStreet,
    customer.addressWard,
    customer.addressProvince,
  ]
    .filter(Boolean)
    .join(', ');

  const customerName = customer.name || customer.phone || 'Khách hàng';

  const rankTone = rankMap[customer.rank] || rankMap.MEMBER;

  return (
    <div>
      <Link
        href="/admin/customers"
        className="mb-[14px] inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6b7280] hover:text-[#2563eb]"
      >
        ← Danh sách khách hàng
      </Link>

      {/* Header card */}
      <div className="mb-4 flex flex-wrap items-center gap-[18px] rounded-[14px] border border-[#eceef2] bg-white p-[22px]">
        <div
          className="flex h-[62px] w-[62px] items-center justify-center rounded-full text-[24px] font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
        >
          {customerName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">{customerName}</span>
            <span
              className="rounded-full px-[11px] py-[3px] text-[11px] font-bold"
              style={{ background: rankTone.bg, color: rankTone.fg }}
            >
              {customer.rank}
            </span>
            {!customer.isActive && (
              <span
                className="rounded-full px-[11px] py-[3px] text-[11px] font-bold"
                style={{ background: '#fee2e2', color: '#dc2626' }}
              >
                BANNED
              </span>
            )}
          </div>
          <div className="mt-[5px] text-[13px] text-[#6b7280]">
            {customer.phone || 'Chưa có số điện thoại'}
            {customer.email ? ` · ${customer.email}` : ''}
          </div>
          <div className="mt-0.5 text-[13px] text-[#6b7280]">{address || 'Chưa cập nhật địa chỉ'}</div>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-[12px]">
            <div>
              <dt className="text-[#9ca3af]">Giới tính</dt>
              <dd className="font-semibold text-[#111827]">{customer.gender || '—'}</dd>
            </div>
            <div>
              <dt className="text-[#9ca3af]">Ngày sinh</dt>
              <dd className="font-semibold text-[#111827]">{customer.dob ? formatDate(customer.dob) : '—'}</dd>
            </div>
            <div>
              <dt className="text-[#9ca3af]">Mã giới thiệu</dt>
              <dd className="font-mono font-semibold text-[#111827]">{customer.referralCode}</dd>
            </div>
            <div>
              <dt className="text-[#9ca3af]">Cập nhật</dt>
              <dd className="font-semibold text-[#111827]">{formatDateTime(customer.updatedAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex gap-2.5">
          <CustomerActions
            customerId={customer.id}
            customerName={customerName}
            customerPhone={customer.phone}
            isActive={customer.isActive}
          />
        </div>
      </div>

      {/* Stat tiles */}
      <div className="stat-grid mb-4 grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-4">
          <div className="mb-1.5 text-[12px] text-[#6b7280]">Tổng chi tiêu</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">{formatMoney(customer.totalSpent)}</div>
          <div className="mt-1 text-[11px] text-[#9ca3af]">Hoàn thành {customer.stats?.completedOrders || 0} đơn</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-4">
          <div className="mb-1.5 text-[12px] text-[#6b7280]">Hoa hồng hiện tại</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#059669]">{formatMoney(customer.commissionBalance)}</div>
          <div className="mt-1 text-[11px] text-[#9ca3af]">Tổng đã trả {formatMoney(customer.stats?.totalCommission || 0)}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-4">
          <div className="mb-1.5 text-[12px] text-[#6b7280]">Đơn hàng</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">{customer._count?.orders || 0}</div>
          <div className="mt-1 text-[11px] text-[#9ca3af]">Doanh thu hoàn thành {formatMoney(customer.stats?.completedRevenue || 0)}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-4">
          <div className="mb-1.5 text-[12px] text-[#6b7280]">Người được giới thiệu</div>
          <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">{customer._count?.referees || 0}</div>
          <div className="mt-1 text-[11px] text-[#9ca3af]">Voucher {customer._count?.userVouchers || 0}</div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
          <div className="border-b border-[#f0f1f5] px-5 py-[15px] text-[15px] font-bold text-[#111827]">Đơn hàng gần đây</div>
          {customer.orders?.length ? (
            <table className="w-full border-collapse text-[13px]">
              <tbody>
                {customer.orders.map((order) => {
                  const status = statusMap[order.status] || {
                    label: order.status,
                    bg: '#f3f4f6',
                    fg: '#374151',
                  };

                  return (
                    <tr key={order.id} className="border-t border-[#f3f4f6] hover:bg-[#eff6ff]">
                      <td className="px-5 py-2.5">
                        <Link href={`/admin/orders/${order.id}`} className="font-mono text-[12px] font-semibold text-[#2563eb]">
                          #{order.orderCode}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-[12px] text-[#6b7280]">{formatDateTime(order.createdAt)}</td>
                      <td className="px-2 py-2.5 text-right font-semibold text-[#111827]">{formatMoney(order.totalAmount)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <span
                          className="whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                          style={{ background: status.bg, color: status.fg }}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-8 text-center text-[13px] text-[#6b7280]">Chưa có đơn hàng</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Giới thiệu */}
          <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
            <div className="mb-3 text-[15px] font-bold text-[#111827]">Giới thiệu</div>
            <div className="mb-3.5 flex items-center justify-between rounded-[10px] border border-dashed border-[#d1d5db] bg-[#f9fafb] px-3.5 py-2.5">
              <span className="font-mono text-[13px] font-semibold text-[#2140da]">{customer.referralCode}</span>
            </div>

            {customer.referrer && (
              <Link
                href={`/admin/customers/${customer.referrer.id}`}
                className="mb-1 flex items-center justify-between border-t border-[#f3f4f6] py-2 hover:bg-[#eff6ff]"
              >
                <div>
                  <div className="text-[13px] font-semibold text-[#111827]">{customer.referrer.name || customer.referrer.phone}</div>
                  <div className="text-[11.5px] text-[#9ca3af]">Người giới thiệu · {customer.referrer.referralCode}</div>
                </div>
              </Link>
            )}

            {customer.referees?.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {customer.referees.map((referee) => (
                  <Link
                    key={referee.id}
                    href={`/admin/customers/${referee.id}`}
                    className="flex items-center justify-between border-t border-[#f3f4f6] py-2 hover:bg-[#eff6ff]"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-[#111827]">{referee.name || referee.phone}</div>
                      <div className="text-[11.5px] text-[#9ca3af]">{referee.phone || formatDate(referee.createdAt)}</div>
                    </div>
                    <span className="text-[12.5px] font-semibold text-[#059669]">{formatMoney(referee.totalSpent)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              !customer.referrer && (
                <div className="border-t border-[#f3f4f6] py-3 text-[12.5px] text-[#9ca3af]">Chưa có người được giới thiệu</div>
              )
            )}
          </div>

          {/* Voucher */}
          {customer.userVouchers?.length > 0 && (
            <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
              <div className="mb-3 text-[15px] font-bold text-[#111827]">Voucher</div>
              {customer.userVouchers.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 border-t border-[#f3f4f6] py-[9px]">
                  <div>
                    <span className="font-mono text-[12.5px] font-semibold text-[#111827]">{item.voucher?.code}</span>
                    <div className="text-[11.5px] text-[#9ca3af]">
                      {item.voucher?.type === 'PERCENTAGE'
                        ? `Giảm ${item.voucher.value}%`
                        : `Giảm ${formatMoney(item.voucher?.value || 0)}`}
                      {item.voucher?.validTo ? ` · HSD ${formatDate(item.voucher.validTo)}` : ''}
                    </div>
                  </div>
                  <span
                    className="whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                    style={item.isUsed ? { background: '#f3f4f6', color: '#6b7280' } : { background: '#d1fae5', color: '#047857' }}
                  >
                    {item.isUsed ? 'Đã dùng' : 'Chưa dùng'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Lịch sử hoa hồng */}
          {customer.commissionsEarned?.length > 0 && (
            <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
              <div className="mb-3 text-[15px] font-bold text-[#111827]">Lịch sử hoa hồng</div>
              {customer.commissionsEarned.map((commission) => (
                <div key={commission.id} className="flex items-center justify-between border-t border-[#f3f4f6] py-[9px]">
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">Đơn #{commission.order?.orderCode || '—'}</div>
                    <div className="text-[11.5px] text-[#9ca3af]">
                      Cấp {commission.level} · {commission.percentage}% · {formatDate(commission.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-[#111827]">{formatMoney(commission.amount)}</div>
                    <div className="text-[11.5px] text-[#9ca3af]">{commission.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

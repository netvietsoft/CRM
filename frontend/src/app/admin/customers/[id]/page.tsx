import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';
import CustomerActions from './CustomerActions';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
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

const statusMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ duyệt', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  CONFIRMED: { label: 'Đã xác nhận', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  PACKAGING: { label: 'Đang đóng hàng', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  SHIPPED: { label: 'Đã gửi hàng', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  DELIVERED: { label: 'Đã nhận hàng', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  COMPLETED: { label: 'Hoàn thành', className: 'bg-green-50 text-green-700 border-green-200' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-red-50 text-red-700 border-red-200' },
  REFUNDED: { label: 'Hoàn trả', className: 'bg-red-50 text-red-700 border-red-200' },
};

const rankMap: Record<string, string> = {
  MEMBER: 'bg-gray-100 text-gray-700',
  SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
  DIAMOND: 'bg-blue-100 text-blue-700',
  PLATINUM: 'bg-slate-200 text-slate-800',
};

export default async function CustomerDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  let customer: any = null;
  try {
    customer = await apiClient.get(`/admin/customers/${params.id}`);
  } catch (error) {
    console.error('Failed to load customer detail', error);
  }

  if (!customer) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Không tìm thấy khách hàng</h1>
        <Link href="/admin/customers" className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-700">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/customers" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Quay lại danh sách
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{customerName}</h1>
          
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${rankMap[customer.rank] || rankMap.MEMBER}`}>
              {customer.rank}
            </span>
            {!customer.isActive && (
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                BANNED
              </span>
            )}
            <CustomerActions
              customerId={customer.id}
              customerName={customerName}
              customerPhone={customer.phone}
              isActive={customer.isActive}
            />
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Tạo lúc {formatDate(customer.createdAt)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-semibold">
                {customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{customerName}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {customer.phone || 'Chưa có số điện thoại'}
                  {customer.email ? ` • ${customer.email}` : ''}
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Giới tính</dt>
                <dd className="mt-1 font-medium text-gray-900">{customer.gender || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Ngày sinh</dt>
                <dd className="mt-1 font-medium text-gray-900">{customer.dob ? formatDate(customer.dob) : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Mã giới thiệu</dt>
                <dd className="mt-1 font-medium text-gray-900 font-mono">{customer.referralCode}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Cập nhật lần cuối</dt>
                <dd className="mt-1 font-medium text-gray-900">{formatDateTime(customer.updatedAt)}</dd>
              </div>
            </dl>

            <div>
              <p className="text-sm text-gray-500">Địa chỉ</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{address || 'Chưa cập nhật'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Tổng chi tiêu</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{formatMoney(customer.totalSpent)}</p>
              <p className="mt-1 text-xs text-gray-500">
                Hoàn thành {customer.stats?.completedOrders || 0} đơn
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Hoa hồng hiện tại</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{formatMoney(customer.commissionBalance)}</p>
              <p className="mt-1 text-xs text-gray-500">
                Tổng đã trả {formatMoney(customer.stats?.totalCommission || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Đơn hàng</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{customer._count?.orders || 0}</p>
              <p className="mt-1 text-xs text-gray-500">
                Doanh thu hoàn thành {formatMoney(customer.stats?.completedRevenue || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Người được giới thiệu</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{customer._count?.referees || 0}</p>
              <p className="mt-1 text-xs text-gray-500">
                Voucher {customer._count?.userVouchers || 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Đơn hàng gần đây</h2>
            </div>
            <div className="p-4">
              {customer.orders?.length ? (
                <div className="space-y-2">
                  {customer.orders.map((order: any) => {
                    const status = statusMap[order.status] || {
                      label: order.status,
                      className: 'bg-gray-50 text-gray-700 border-gray-200',
                    };

                    return (
                      <Link
                        key={order.id}
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">#{order.orderCode}</p>
                          <p className="mt-1 text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full border text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 min-w-28 text-right">
                            {formatMoney(order.totalAmount)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-2 py-8 text-sm text-gray-500 text-center">Chưa có đơn hàng</div>
              )}
            </div>
          </section>

          {customer.commissionsEarned?.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Lịch sử hoa hồng</h2>
              </div>
              <div className="p-4 space-y-2">
                {customer.commissionsEarned.map((commission: any) => (
                  <div key={commission.id} className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Đơn #{commission.order?.orderCode || '—'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Cấp {commission.level} • {commission.percentage}% • {formatDate(commission.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatMoney(commission.amount)}</p>
                      <p className="mt-1 text-xs text-gray-500">{commission.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {customer.referrer && (
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Người giới thiệu</h2>
              </div>
              <div className="p-4">
                <Link
                  href={`/admin/customers/${customer.referrer.id}`}
                  className="block rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{customer.referrer.name || customer.referrer.phone}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {customer.referrer.phone || 'Chưa có số điện thoại'} • {customer.referrer.referralCode}
                  </p>
                </Link>
              </div>
            </section>
          )}

          {customer.referees?.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Khách hàng được giới thiệu</h2>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {customer.referees.map((referee: any) => (
                  <Link
                    key={referee.id}
                    href={`/admin/customers/${referee.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{referee.name || referee.phone}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(referee.createdAt)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${rankMap[referee.rank] || rankMap.MEMBER}`}>
                      {referee.rank}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {customer.userVouchers?.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Voucher</h2>
              </div>
              <div className="p-4 space-y-2">
                {customer.userVouchers.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-mono">{item.voucher?.code}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.voucher?.type === 'PERCENTAGE'
                           ? `Giảm ${item.voucher.value}%`
                           : `Giảm ${formatMoney(item.voucher?.value || 0)}`}
                        {item.voucher?.validTo ? ` • HSD ${formatDate(item.voucher.validTo)}` : ''}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.isUsed ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-700'}`}>
                      {item.isUsed ? 'Đã dùng' : 'Chưa dùng'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

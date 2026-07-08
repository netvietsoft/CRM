import { apiClient } from '@/lib/apiClient';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function fmt(n: number) {
  return (n || 0).toLocaleString('vi-VN') + ' đ';
}

export default async function VoucherStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ orderCode?: string }>;
}) {
  const session = await getSession();
  if (!session) return null; // layout đã redirect sang /login

  const { orderCode } = await searchParams;
  if (!orderCode) {
    return <div className="p-6 text-center text-gray-600">Thiếu mã đơn hàng.</div>;
  }

  let data: any = null;
  try {
    data = await apiClient.get(`/vouchers/order-voucher-status/${orderCode}`, { cache: 'no-store' });
  } catch {
    data = null;
  }

  if (!data?.exists || !data.voucher) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="text-lg font-semibold text-gray-800">Không tìm thấy voucher</div>
        <p className="mt-2 text-sm text-gray-500">Đơn #{orderCode} chưa có voucher, hoặc không thuộc tài khoản của bạn.</p>
      </div>
    );
  }

  const STATUS: Record<string, string> = {
    PENDING: '🕒 Chờ kích hoạt',
    WAITING_APPROVAL: '⏳ Chờ cửa hàng duyệt',
    ACTIVE: '✅ Đã kích hoạt — dùng được',
    REJECTED: '❌ Không đủ điều kiện kích hoạt',
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="text-lg font-bold text-amber-900">🎁 Voucher đơn #{orderCode}</div>
        <div className="mt-2 font-mono text-gray-800">{data.voucher.code}</div>
        <div className="text-gray-700">
          {data.voucher.type === 'PERCENT'
            ? `Giảm ${data.voucher.value}%`
            : data.voucher.type === 'FREESHIP'
              ? 'Miễn phí vận chuyển'
              : `Giảm ${fmt(data.voucher.value)}`}
        </div>
        <div className="mt-3 text-base font-semibold text-gray-900">{STATUS[data.status] || data.status}</div>
        <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-gray-600">
          Voucher chỉ được kích hoạt khi khách nhận hàng thành công.
        </p>
      </div>
    </div>
  );
}

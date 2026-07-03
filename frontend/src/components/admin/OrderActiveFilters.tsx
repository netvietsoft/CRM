'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  WAITING_FOR_GOODS: 'Chờ hàng',
  CONFIRMED: 'Đã xác nhận',
  PACKAGING: 'Đang đóng hàng',
  WAITING_FOR_SHIPPING: 'Chờ vận chuyển',
  SHIPPED: 'Đã gửi hàng',
  DELIVERED: 'Đã giao',
  PAYMENT_COLLECTED: 'Đã thu tiền',
  RETURNING: 'Đang hoàn',
  EXCHANGING: 'Đang đổi',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Hoàn trả',
};

export default function OrderActiveFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productName = searchParams.get('productName') || '';
  const statuses = (searchParams.get('status') || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => STATUS_LABELS[s]);
  const sources = (searchParams.get('source') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  const pushWithout = (keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((k) => params.delete(k));
    params.delete('page');
    router.push(`/admin/orders?${params.toString()}`);
  };

  if (productName) {
    chips.push({
      key: 'productName',
      label: `Sản phẩm: "${productName}"`,
      onRemove: () => pushWithout(['productName']),
    });
  }

  if (statuses.length > 0) {
    chips.push({
      key: 'status',
      label:
        statuses.length === 1
          ? `Trạng thái: ${STATUS_LABELS[statuses[0]]}`
          : `Trạng thái: ${statuses.length} mục`,
      onRemove: () => pushWithout(['status']),
    });
  }

  if (sources.length > 0) {
    chips.push({
      key: 'source',
      label: sources.length === 1 ? `Nguồn: ${sources[0]}` : `Nguồn: ${sources.length} mục`,
      onRemove: () => pushWithout(['source']),
    });
  }

  if (startDate || endDate) {
    const label =
      startDate && endDate
        ? `Ngày: ${startDate} → ${endDate}`
        : startDate
          ? `Từ ngày: ${startDate}`
          : `Đến ngày: ${endDate}`;
    chips.push({ key: 'date', label, onRemove: () => pushWithout(['startDate', 'endDate']) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs font-semibold text-gray-400">Đang lọc:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-blue-200/70 text-blue-500"
            aria-label="Gỡ lọc"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => pushWithout(['productName', 'status', 'source', 'startDate', 'endDate'])}
        className="text-xs font-bold text-gray-500 hover:text-red-600 underline underline-offset-2 ml-1"
      >
        Xóa tất cả
      </button>
    </div>
  );
}

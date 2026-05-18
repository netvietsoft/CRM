'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface OrderStatusManagerProps {
  orderId: string;
  currentStatus: string;
  currentPaymentStatus: string;
}

const statusOptions = [
  { value: 'PENDING', label: 'Chờ xác nhận', color: 'orange' },
  { value: 'WAITING_FOR_GOODS', label: 'Chờ hàng', color: 'purple' },
  { value: 'CONFIRMED', label: 'Đã xác nhận', color: 'cyan' },
  { value: 'PACKAGING', label: 'Đang đóng hàng', color: 'blue' },
  { value: 'WAITING_FOR_SHIPPING', label: 'Chờ vận chuyển', color: 'gray' },
  { value: 'SHIPPED', label: 'Đã gửi hàng', color: 'cyan' },
  { value: 'DELIVERED', label: 'Đã nhận', color: 'green' },
  { value: 'PAYMENT_COLLECTED', label: 'Đã thu tiền', color: 'green' },
  { value: 'RETURNING', label: 'Đang hoàn', color: 'red' },
  { value: 'EXCHANGING', label: 'Đang đổi', color: 'orange' },
  { value: 'COMPLETED', label: 'Hoàn thành', color: 'green' },
  { value: 'CANCELLED', label: 'Đã hủy', color: 'red' },
  { value: 'REFUNDED', label: 'Hoàn trả', color: 'red' },
];

const paymentStatusOptions = [
  { value: 'UNPAID', label: 'Chưa thanh toán', color: 'gray' },
  { value: 'PAID', label: 'Đã thanh toán', color: 'green' },
  { value: 'PARTIALLY_PAID', label: 'Thanh toán 1 phần', color: 'yellow' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền', color: 'red' },
];

export default function OrderStatusManager({
  orderId,
  currentStatus,
  currentPaymentStatus,
}: OrderStatusManagerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdate = async () => {
    if (status === currentStatus && paymentStatus === currentPaymentStatus) {
      setMessage({ text: 'Không có thay đổi nào', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await apiClientClient.patch(`/orders/${orderId}/status`, {
        status,
        paymentStatus,
      });

      setMessage({ text: 'Cập nhật thành công!', type: 'success' });
      router.refresh();
    } catch (error: any) {
      setMessage({
        text: error.response?.data?.message || 'Có lỗi xảy ra',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Quản lý trạng thái</h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Trạng thái đơn hàng
          </label>
          <Select
            value={status}
            onChange={(val) => setStatus(val)}
            options={statusOptions}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Trạng thái thanh toán
          </label>
          <Select
            value={paymentStatus}
            onChange={(val) => setPaymentStatus(val)}
            options={paymentStatusOptions}
            className="w-full"
          />
        </div>

        <button
          onClick={handleUpdate}
          disabled={loading || (status === currentStatus && paymentStatus === currentPaymentStatus)}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
        </button>
      </div>
    </div>
  );
}

import React, { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default async function OrderSuccessPage(props: { searchParams: Promise<{ orderId?: string }> }) {
  const searchParams = await props.searchParams;
  const orderId = searchParams.orderId;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Đặt hàng thành công!</h1>
      <p className="text-gray-600 max-w-md mb-8">
        Cảm ơn bạn đã mua sắm. Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        {orderId && (
          <Link
            href={`/portal/orders/${orderId}`}
            className="flex-1 py-3 px-6 bg-green-100 hover:bg-green-200 text-green-800 font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center border border-green-200 shadow-sm"
          >
            Chi tiết đơn hàng
          </Link>
        )}
        <Link
          href="/portal"
          className="flex-1 py-3 px-6 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center border border-blue-200 shadow-sm"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

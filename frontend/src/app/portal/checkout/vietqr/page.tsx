import { Metadata } from 'next';
import VietQRPaymentClient from './VietQRPaymentClient';

export const metadata: Metadata = {
  title: 'Thanh toán VietQR | Customer CRM',
  description: 'Quét mã QR để thanh toán đơn hàng',
};

export default async function VietQRPage(props: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const orderId = searchParams.orderId;

  if (!orderId) {
    return (
      <div className="container mx-auto p-4 text-center py-20">
        <h1 className="text-2xl font-bold text-gray-800">Không tìm thấy đơn hàng</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg p-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <VietQRPaymentClient orderId={orderId} />
      </div>
    </div>
  );
}

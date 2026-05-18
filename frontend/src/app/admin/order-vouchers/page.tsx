import OrderVouchersTableClient from '@/components/admin/OrderVouchersTableClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voucher Đơn Hàng | Quản Trị Viên',
};

export default function OrderVouchersPage() {
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Voucher Đơn Hàng</h1>
        <p className="text-gray-500 mt-1 text-sm font-medium">Quản lý danh sách các voucher được tạo riêng cho từng đơn hàng</p>
      </div>
      <OrderVouchersTableClient />
    </div>
  );
}

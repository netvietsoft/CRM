import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function CreateOrderButton() {
  return (
    <Link
      href="/admin/orders/create-order"
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-sm whitespace-nowrap"
    >
      <Plus className="w-5 h-5" />
      Tạo đơn hàng
    </Link>
  );
}

export const dynamic = 'force-dynamic';
import Link from 'next/link';

export default function ViettelOperationsReportPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">📊 Báo cáo vận hành</h1>
        <Link href="/admin/viettel-customers" className="ml-auto text-sm text-indigo-600 hover:underline">← Danh sách khách hàng</Link>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
        🚧 Trang đang xây dựng — sẽ bổ sung số liệu vận hành (đếm đơn theo trạng thái, tỷ lệ giao/hoàn…).
      </div>
    </div>
  );
}

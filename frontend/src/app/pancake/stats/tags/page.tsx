'use client';
export const dynamic = 'force-dynamic';

import { Card, MockTable, MockBadge } from '@/components/pancake/ui';

const TAGS = ['Kiểm hàng', 'Câu hỏi', 'Mua hàng', 'Đã gửi', 'Hết hàng', 'Trả hàng'];

export default function StatsTags() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Thẻ hội thoại</h1><MockBadge /><span className="ml-auto text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">📅 31/5/2026 → 30/6/2026</span></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top 5 thẻ đang được gắn nhiều nhất" subtitle="Số lần gắn − số lần gỡ"><div className="h-40 grid place-items-center text-gray-300 text-sm">Chưa có dữ liệu gắn thẻ</div></Card>
        <Card title="Tỉ lệ các thẻ đang được gắn" subtitle="Chỉ tính thẻ có tổng > 0"><div className="h-40 grid place-items-center text-gray-400"><div className="text-center"><div className="text-3xl font-bold text-gray-800">0</div><div className="text-sm">lượt gắn thẻ</div></div></div></Card>
      </div>
      <Card title="Thống kê chi tiết thẻ hội thoại" subtitle="Các thẻ được gắn/gỡ theo thời gian">
        <MockTable headers={['Thẻ', '01/06', '05/06', '10/06', '15/06', '20/06', 'Tổng']} rows={TAGS.map((t) => [`🏷️ ${t}`, '0', '0', '0', '0', '0', '0'])} />
      </Card>
    </div>
  );
}

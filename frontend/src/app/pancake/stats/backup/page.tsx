'use client';
export const dynamic = 'force-dynamic';

import { Card, MockTable, MockBadge } from '@/components/pancake/ui';

export default function StatsBackup() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Sao lưu</h1><MockBadge /></div>
      <Card title="Sao lưu dữ liệu" subtitle="Xuất hội thoại / khách hàng / thống kê" right={<button className="px-4 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium">+ Tạo bản sao lưu</button>}>
        <MockTable headers={['Thời gian tạo', 'Loại dữ liệu', 'Khoảng thời gian', 'Dung lượng', 'Trạng thái', 'Tải về']} rows={[['—', '—', '—', '—', '—', '—']]} />
      </Card>
    </div>
  );
}

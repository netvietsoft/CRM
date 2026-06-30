'use client';
export const dynamic = 'force-dynamic';

import { Card, StatCard, MockTable, MockBadge } from '@/components/pancake/ui';

export default function StatsCallCenter() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Tổng đài</h1><MockBadge /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📞" label="Cuộc gọi đến" value="0" />
        <StatCard icon="📲" label="Cuộc gọi đi" value="0" />
        <StatCard icon="⏱️" label="Thời lượng TB" value="0s" />
        <StatCard icon="❌" label="Cuộc gọi nhỡ" value="0" />
      </div>
      <Card title="Lịch sử cuộc gọi" subtitle="Template — sẽ nối tổng đài (VOIP) sau">
        <MockTable headers={['Thời gian', 'Khách', 'Số máy', 'Hướng', 'Thời lượng', 'Nhân viên', 'Trạng thái']} rows={[['—', '—', '—', '—', '—', '—', '—']]} />
      </Card>
    </div>
  );
}

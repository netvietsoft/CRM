'use client';
export const dynamic = 'force-dynamic';

import { Card, StatCard, MockTable, MockBadge } from '@/components/ccm/ui';

export default function StatsReviews() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Đánh giá</h1><MockBadge /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="⭐" label="Điểm trung bình" value="—" />
        <StatCard icon="📝" label="Tổng đánh giá" value="0" />
        <StatCard icon="😊" label="Tích cực" value="0" />
        <StatCard icon="😟" label="Tiêu cực" value="0" />
      </div>
      <Card title="Đánh giá gần đây" subtitle="Template — sẽ nối nguồn đánh giá sau">
        <MockTable headers={['Thời gian', 'Khách', 'Điểm', 'Nội dung', 'Nguồn']} rows={[['—', '—', '—', '—', '—']]} />
      </Card>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { Card, Sparkline, StatCard, MockTable, MockBadge } from '@/components/pancake/ui';

const ROWS = [
  ['30/6/2026', '217', '10', '9', '25', '720', '141', '2960', '208', '115'],
  ['29/6/2026', '257', '11', '11', '24', '858', '143', '3256', '243', '108'],
  ['28/6/2026', '200', '11', '10', '22', '672', '170', '2742', '193', '116'],
  ['27/6/2026', '234', '18', '17', '36', '746', '196', '3278', '221', '125'],
  ['26/6/2026', '202', '8', '8', '24', '654', '71', '2082', '202', '111'],
];

export default function StatsPages() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Trang</h1><MockBadge /><span className="ml-auto text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">📅 31/5/2026 → 30/6/2026</span></div>
      <Card title="Tổng quan về trang" subtitle="Thống kê tin nhắn và bình luận của trang"><Sparkline /></Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📱" label="SĐT mới" value="520" delta="8.79%" />
        <StatCard icon="📣" label="KH cũ TT qua tin nhắn" value="4.914" delta="23.65%" />
        <StatCard icon="🧩" label="Khách mới" value="9.299" delta="17.57%" />
        <StatCard icon="📚" label="H.thoại tin nhắn mới" value="8.909" delta="17.18%" />
      </div>
      <Card title="Thống kê chi tiết" subtitle="Lượt tương tác đến trang của bạn">
        <MockTable headers={['Thời gian', 'Khách mới', 'SĐT/ngày', 'SĐT mới', 'BL bởi KH', 'TN bởi KH', 'BL bởi trang', 'TN bởi trang', 'H.thoại TN mới', 'KH cũ nhắn lại']} rows={ROWS} />
      </Card>
    </div>
  );
}

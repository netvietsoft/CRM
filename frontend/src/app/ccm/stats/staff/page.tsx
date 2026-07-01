'use client';
export const dynamic = 'force-dynamic';

import { Card, Donut, MockTable, MockBadge } from '@/components/ccm/ui';

const TOP = [['Nguyễn Văn H…', '54s', 35], ['Phạm Tony', '1m 4s', 45], ['Nguyễn Ngọc …', '3m 31s', 70], ['phuong Nguyễ…', '6m 10s', 100]];
const ROWS = [
  ['phuong Nguyễn', '0', '899', '150', '8139', '2391', '6m 10s', '62', '59'],
  ['Nguyễn Ngọc Ánhh', '14', '4039', '556', '53741', '11466', '3m 31s', '343', '261'],
  ['Nguyễn Văn Hào', '0', '1170', '298', '18477', '5909', '0m 54s', '121', '100'],
  ['Phạm Tony', '0', '0', '0', '7', '2', '1m 4s', '0', '0'],
];

export default function StatsStaff() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Nhân viên</h1><MockBadge /><span className="ml-auto text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">📅 31/5/2026 → 30/6/2026</span></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top 5 nhân viên phản hồi nhanh nhất" subtitle="Phản hồi khách hàng nhanh nhất trong giờ làm">
          <div className="space-y-3">
            {TOP.map(([n, t, w]) => (
              <div key={n as string} className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-full bg-gray-100 grid place-items-center">👤</span>
                <span className="text-gray-700 w-40 truncate">{n}</span>
                <div className="flex-1 h-3 bg-blue-100 rounded-full overflow-hidden"><div className="h-full bg-blue-400" style={{ width: `${w}%` }} /></div>
                <span className="text-gray-500 w-16 text-right">{t}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Tỉ lệ phản hồi theo nhân viên" subtitle="Tỉ lệ phản hồi trong khoảng thời gian">
          <Donut segments={[{ label: 'Nguyễn Ngọc Ánhh', value: 66.82, color: '#fcd34d' }, { label: 'Nguyễn Văn Hào', value: 22.72, color: '#f59e0b' }, { label: 'phuong Nguyễn', value: 10.45, color: '#5eead4' }, { label: 'Phạm Tony', value: 0.01, color: '#14b8a6' }]} />
        </Card>
      </div>
      <Card title="Thống kê chi tiết" subtitle="Hoạt động của nhân viên">
        <MockTable headers={['Nhân viên', 'TN từ b.luận', 'Bình luận', 'Phiên tr.lời BL', 'Tin nhắn', 'Phiên t.lời TN', 'T.gian PH TB', 'SĐT mang về', 'Số đơn chốt']} rows={ROWS} />
      </Card>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { Card, MockTable, MockBadge } from '@/components/ccm/ui';

function Gauge({ title, total, a, b, labelA, labelB, color }: { title: string; total: string; a: string; b: string; labelA: string; labelB: string; color: string }) {
  return (
    <Card title={title}>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 120 70" className="w-40">
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#eef2f7" strokeWidth={14} strokeLinecap="round" />
          <path d="M10 60 A50 50 0 0 1 60 10" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" />
        </svg>
        <div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-500 mb-2">Tổng</div>
          <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: color }} />{labelA}: <b>{a}</b></div>
          <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full bg-gray-200 mr-1" />{labelB}: <b>{b}</b></div>
        </div>
      </div>
    </Card>
  );
}

const ROWS = [
  ['30/6/2026', '683', '221', '904', '846', '68', '208', '7'],
  ['29/6/2026', '687', '260', '947', '888', '75', '247', '11'],
  ['28/6/2026', '660', '200', '860', '806', '72', '191', '13'],
  ['27/6/2026', '780', '292', '1072', '1006', '92', '274', '13'],
];

export default function StatsInteractions() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Tương tác</h1><MockBadge /><span className="ml-auto text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">📅 31/5/2026 → 30/6/2026</span></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Gauge title="Tương tác khách hàng" total="31.742" a="9.319" b="22.423" labelA="TT với khách mới" labelB="TT với khách cũ" color="#2dd4bf" />
        <Gauge title="Đơn hàng" total="412" a="249" b="163" labelA="Đơn từ khách mới" labelB="Đơn từ khách cũ" color="#3b82f6" />
      </div>
      <Card title="Thống kê chi tiết tương tác" subtitle="Theo thời gian và nhân viên">
        <MockTable headers={['Thời gian', 'KH cũ', 'KH mới', 'Tổng TT', 'Tin nhắn', 'Bình luận', 'H.thoại mới', 'Tổng ĐH']} rows={ROWS} />
      </Card>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { Card, MockChart, Sparkline, StatCard, MockBadge } from '@/components/ccm/ui';

export default function StatsOverview() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        <MockBadge />
        <select className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"><option>30 ngày</option><option>7 ngày</option><option>Hôm nay</option></select>
      </div>

      <Card title="Tổng quan về hoạt động" subtitle="Thống kê tổng quan">
        <MockChart />
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mt-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#9be7d8]" /> Tổng tương tác</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-pink-500" /> Khách hàng mới</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> Số đơn chốt</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Tổng quan về trang" subtitle="Một số thông tin về trang của bạn">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon="✉️" label="Tin nhắn tới trang" value="31.128" />
            <StatCard icon="💬" label="Bình luận tới trang" value="1.053" />
          </div>
        </Card>
        <Card title="Tương tác" subtitle="Tương tác giữa khách hàng và nhân viên">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['Tổng tương tác', '31.742', '#a78bfa'], ['Tin nhắn', '29.609', '#3b82f6'], ['Bình luận', '2.192', '#f59e0b'], ['HT tin nhắn mới', '8.891', '#10b981']].map(([l, v, c]) => (
              <div key={l}><div className="text-lg font-bold text-gray-900">{v}</div><div className="text-xs text-gray-500 mb-1">{l}</div><Sparkline color={c as string} /></div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top thẻ hội thoại" subtitle="Các thẻ đang được gắn nhiều nhất">
          <div className="space-y-2 text-sm">
            {[['🏷️', 'Kiểm hàng'], ['🏷️', 'Câu hỏi'], ['🏷️', 'Mua hàng'], ['🏷️', 'Đã gửi'], ['🏷️', 'Hết hàng']].map(([i, l]) => (
              <div key={l} className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-600">{i} {l}</span><span className="text-orange-500 font-semibold">0</span></div>
            ))}
          </div>
        </Card>
        <Card title="Nhân viên" subtitle="Top nhân viên có lượt tương tác nhiều nhất">
          <div className="space-y-3 text-sm">
            {[['🥇', 'Nguyễn Ngọc Ánhh', '25589 lượt'], ['', 'Phạm Tony', '2 lượt']].map(([m, n, v]) => (
              <div key={n} className="flex items-center gap-3"><span>{m || '👤'}</span><span className="w-8 h-8 rounded-full bg-gray-100 grid place-items-center">👤</span><span className="text-gray-700">{n}</span><span className="ml-auto text-gray-400">{v}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

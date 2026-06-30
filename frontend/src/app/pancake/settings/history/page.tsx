'use client';
export const dynamic = 'force-dynamic';

import { Card, Pill, MockBadge } from '@/components/pancake/ui';

const TABS = ['Cài đặt', 'Xóa bình luận', 'Chặn khách hàng', 'Vi phạm', 'Chế độ xoay vòng'];
const LOGS = [
  { who: 'phuong Nguyễn', when: '09:14 25/06', what: 'Trả lời nhanh', code: '6887ebe8', cur: true },
  { who: 'Nguyễn Ngọc Ánhh', when: '08:25 16/06', what: 'Trả lời nhanh', code: 'b10b96c0' },
  { who: 'Nguyễn Ngọc Ánhh', when: '08:25 16/06', what: 'Chủ đề trả lời nhanh', code: 'cd7c772a' },
  { who: 'Nguyễn Ngọc Ánhh', when: '08:23 16/06', what: 'Trả lời nhanh', code: '5c9ebde8' },
  { who: 'Nguyễn Ngọc Ánhh', when: '08:22 16/06', what: 'Chủ đề trả lời nhanh', code: '962e33c2' },
];

export default function SettingsHistory() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Lịch sử</h1><MockBadge /></div>
      <div className="flex gap-4 border-b border-gray-200 text-sm">
        {TABS.map((t, i) => <button key={t} className={`pb-2 ${i === 0 ? 'text-[#3b5bdb] border-b-2 border-[#3b5bdb] font-medium' : 'text-gray-500'}`}>{t}</button>)}
      </div>
      <div className="grid grid-cols-[1fr_300px] gap-4">
        <Card>
          <div className="space-y-4">
            {LOGS.map((l) => (
              <div key={l.code} className="flex items-center gap-3 pb-4 border-b border-gray-50">
                <span className="w-9 h-9 rounded-full bg-gray-100 grid place-items-center">👤</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium text-gray-800">{l.who}</span><span className="text-xs text-gray-400">{l.when}</span>{l.cur && <Pill color="green">Hiện tại</Pill>}</div>
                  <div className="text-sm text-gray-500 mt-0.5">Đã cập nhật <Pill color="gray">{l.what}</Pill> ›</div>
                </div>
                <Pill color="blue">{l.code}</Pill>
              </div>
            ))}
          </div>
        </Card>
        <Card title="ℹ️ Lưu ý">
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
            <li>Khôi phục sẽ xoá những thay đổi sau thời điểm bạn chọn</li>
            <li>Thẻ hội thoại đã bị xoá sẽ không thể khôi phục</li>
            <li>Cài đặt thay đổi bởi hệ thống sẽ không thể khôi phục</li>
            <li>Lịch sử lưu tối đa 500 bản ghi</li>
            <li>Thao tác phân quyền không thể khôi phục</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

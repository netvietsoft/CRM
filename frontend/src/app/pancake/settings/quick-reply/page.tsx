'use client';
export const dynamic = 'force-dynamic';

import { Card, MockTable, Pill, SettingRow, Toggle, MockBadge } from '@/components/pancake/ui';

const ROWS = [
  ['1', 'Cathy', <Pill key="1" color="blue">Cathy set</Pill>, 'Set CATHY chị quan tâm gồm: 1 áo vest cộc tay và 1 chân váy…'],
  ['2', 'xin', <Pill key="2" color="purple">Xin thông tin</Pill>, 'Chị cho em xin cân nặng và chiều cao để em tư vấn size…'],
  ['3', 'camelia', <Pill key="3" color="gray">camelia</Pill>, 'Set CAMELIA chị quan tâm gồm: 1 áo Vest cộc tay và 1 quần Âu…'],
  ['4', 'casablaca', <Pill key="4" color="green">casablaca</Pill>, 'Dạ Set CASABLACA gồm: áo croptop cổ nơ trắng và chân váy A…'],
  ['5', 'nami', <Pill key="5" color="blue">nami</Pill>, 'Set NAMI JUMPSUIT áo liền quần ✅ Giá: 990.000đ giảm còn 890.000đ…'],
];

export default function SettingsQuickReply() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Hỗ trợ trả lời</h1><MockBadge /></div>
      <Card title="Trả lời nhanh" right={<button className="px-3 py-1.5 rounded-lg bg-[#3b5bdb] text-white text-sm">+ Thêm mẫu</button>}>
        <MockTable headers={['STT', 'Ký tự tắt', 'Chủ đề', 'Tin nhắn']} rows={ROWS} />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Chức năng & công cụ">
          <SettingRow title="Gợi ý mẫu trả lời nhanh" desc="Nhập / + ký tự tắt (vd /Pancake) sẽ gợi ý câu trả lời" control={<Toggle on />} />
          <SettingRow title="Gửi ngay mẫu khi chọn từ gợi ý" control={<Toggle />} />
          <SettingRow title="Chủ đề câu trả lời nhanh" desc="Cài chủ đề để phân biệt nhóm câu" control={<Toggle on />} />
        </Card>
        <Card title="Chủ đề câu trả lời nhanh" subtitle="72 chủ đề">
          <div className="space-y-2 text-sm">
            {[['Set tweed', 'red'], ['Cathy set', 'blue'], ['Xin thông tin', 'purple'], ['camelia', 'gray'], ['casablaca', 'green']].map(([n, c]) => (
              <div key={n} className="flex items-center justify-between py-1.5 border-b border-gray-50"><span className="text-gray-700">⠿ {n}</span><Pill color={c}>{n}</Pill></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

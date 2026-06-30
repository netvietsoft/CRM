'use client';
export const dynamic = 'force-dynamic';

import { Card, Pill, MockBadge } from '@/components/pancake/ui';

const TAGS = [['Set tweed', 'red'], ['Cathy set', 'blue'], ['Xin thông tin', 'purple'], ['camelia', 'gray'], ['casablaca', 'green']];

export default function SettingsTags() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5"><h1 className="text-2xl font-bold text-gray-800">Thẻ hội thoại</h1><MockBadge /></div>
      <Card title="Danh sách thẻ" subtitle="72 chủ đề" right={<button className="px-3 py-1.5 rounded-lg bg-[#3b5bdb] text-white text-sm">+ Thêm thẻ</button>}>
        <div className="space-y-2">
          {TAGS.map(([name, color]) => (
            <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-sm text-gray-700">⠿ {name}</span>
              <span className="flex items-center gap-3"><Pill color={color}>{name}</Pill><button className="text-gray-400 text-sm">✏️</button><button className="text-red-400 text-sm">🗑️</button></span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { Card, MockBadge } from '@/components/pancake/ui';

const TOOLS = [
  ['📥', 'Nhập khách hàng', 'Import danh sách khách từ file Excel/CSV'],
  ['📤', 'Xuất dữ liệu', 'Xuất hội thoại / khách hàng ra file'],
  ['🔁', 'Gộp hội thoại trùng', 'Tự động gộp khách trùng SĐT'],
  ['🧹', 'Dọn spam', 'Quét và ẩn bình luận spam'],
];

export default function SettingsTools() {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-5"><h1 className="text-2xl font-bold text-gray-800">Công cụ</h1><MockBadge /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOOLS.map(([i, t, d]) => (
          <Card key={t}>
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl bg-indigo-50 grid place-items-center text-xl">{i}</span>
              <div><div className="font-medium text-gray-800">{t}</div><div className="text-sm text-gray-500 mt-0.5">{d}</div></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

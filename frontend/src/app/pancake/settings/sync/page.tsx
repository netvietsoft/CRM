'use client';
export const dynamic = 'force-dynamic';

import { Card, SettingRow, Toggle, MockBadge } from '@/components/pancake/ui';

export default function SettingsSync() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5"><h1 className="text-2xl font-bold text-gray-800">Đồng bộ</h1><MockBadge /></div>
      <Card title="Đồng bộ dữ liệu" subtitle="Kết nối Page / nguồn dữ liệu" right={<button className="px-3 py-1.5 rounded-lg bg-[#3b5bdb] text-white text-sm">↻ Đồng bộ ngay</button>}>
        <SettingRow icon="☁️" title="Tự động đồng bộ hội thoại" desc="Kéo tin nhắn/bình luận mới theo thời gian thực" control={<Toggle on />} />
        <SettingRow title="Đồng bộ đơn hàng từ POS" control={<Toggle on />} />
        <SettingRow title="Đồng bộ bài viết" control={<Toggle />} />
      </Card>
    </div>
  );
}

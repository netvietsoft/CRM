'use client';
export const dynamic = 'force-dynamic';

import { SettingSection, SettingRow, Toggle, MockBadge } from '@/components/ccm/ui';

export default function SettingsInterface() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5"><h1 className="text-2xl font-bold text-gray-800">Giao diện</h1><MockBadge /></div>
      <SettingSection title="Hiển thị">
        <SettingRow icon="🖥️" title="Chế độ tối" desc="Giao diện nền tối" control={<Toggle />} />
        <SettingRow title="Hiển thị ảnh đại diện khách" control={<Toggle on />} />
        <SettingRow title="Cỡ chữ hội thoại" control={<span className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">Vừa ▾</span>} />
        <SettingRow title="Thu gọn danh sách hội thoại" control={<Toggle />} />
      </SettingSection>
    </div>
  );
}

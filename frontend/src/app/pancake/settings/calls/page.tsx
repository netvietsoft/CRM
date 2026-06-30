'use client';
export const dynamic = 'force-dynamic';

import { SettingSection, SettingRow, Toggle, MockBadge } from '@/components/pancake/ui';

export default function SettingsCalls() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5"><h1 className="text-2xl font-bold text-gray-800">Cuộc gọi</h1><MockBadge /></div>
      <SettingSection title="Tổng đài">
        <SettingRow icon="📞" title="Kết nối tổng đài (VOIP)" desc="Gọi điện trực tiếp từ hội thoại" control={<Toggle />} />
        <SettingRow title="Tự động ghi âm cuộc gọi" control={<Toggle />} />
        <SettingRow title="Hiển thị popup khi có cuộc gọi đến" control={<Toggle on />} />
      </SettingSection>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { Card, SettingRow, Toggle, Pill, MockBadge } from '@/components/ccm/ui';

export default function SettingsAI() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5"><h1 className="text-2xl font-bold text-gray-800">Trợ lý AI</h1><Pill color="amber">Beta</Pill><MockBadge /></div>
      <Card title="Trợ lý AI phản hồi khách 24/7" subtitle="Tự động trả lời khách như chính bạn">
        <SettingRow icon="✨" title="Bật trợ lý AI" desc="Cho phép AI gợi ý / tự trả lời tin nhắn khách" control={<Toggle />} />
        <SettingRow title="Giọng điệu" desc="Phong cách trả lời của AI" control={<span className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">Thân thiện ▾</span>} />
        <SettingRow title="Chỉ gợi ý (không tự gửi)" control={<Toggle on />} />
      </Card>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card, SettingRow, Toggle, MockBadge } from '@/components/pancake/ui';

const MODES = [
  { key: 'off', icon: '🚫', label: 'Tắt chế độ phân công' },
  { key: 'self', icon: '✋', label: 'Nhân viên tự phân công' },
  { key: 'group', icon: '👥', label: 'Phân công theo nhóm' },
  { key: 'account', icon: '👤', label: 'Tuỳ chọn tài khoản' },
];

export default function SettingsRotation() {
  const [mode, setMode] = useState('off');
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Chế độ xoay vòng</h1><MockBadge /></div>
        <button className="px-4 py-2 rounded-lg bg-gray-400 text-white text-sm font-medium">Lưu cài đặt</button>
      </div>
      <Card title="Cài đặt chế độ" subtitle="Chọn các chế độ chia hội thoại cho nhân viên">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODES.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left ${mode === m.key ? 'border-blue-300 bg-blue-50 text-[#3b5bdb]' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
              <span className="w-10 h-10 rounded-full bg-white border border-gray-200 grid place-items-center">{m.icon}</span>
              <span className="font-medium">{m.label}</span>
              {mode === m.key && <span className="ml-auto text-[#3b5bdb]">✓</span>}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Cấu hình chi tiết" subtitle="Cấu hình cho chế độ chia hội thoại được chọn">
        <SettingRow icon="👁️" title="Quyền xem" desc="Nhân viên chỉ xem được hội thoại được chia cho mình" control={<Toggle on />} />
      </Card>
    </div>
  );
}

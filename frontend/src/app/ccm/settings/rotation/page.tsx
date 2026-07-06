'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';

const MODES = [
  { key: 'off', icon: '🚫', label: 'Tắt chế độ phân công' },
  { key: 'self', icon: '✋', label: 'Nhân viên tự phân công' },
  { key: 'group', icon: '👥', label: 'Phân công theo nhóm' },
  { key: 'account', icon: '👤', label: 'Tuỳ chọn tài khoản' },
];

export default function SettingsRotation() {
  const [mode, setMode] = useState('off');
  const [view, setView] = useState(true);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">Chế độ xoay vòng</h1>
          <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e]">template · mock</span>
        </div>
        <button className="px-[18px] py-2.5 border-none rounded-[11px] bg-[#4f68ee] text-white text-[13.5px] font-bold cursor-pointer hover:bg-[#3c55e6]">Lưu cài đặt</button>
      </div>

      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-[22px] max-w-[1000px] mt-[18px] mb-4">
        <div className="text-base font-extrabold">Cài đặt chế độ</div>
        <div className="text-[13px] text-[#6b7280] my-1 mb-4">Chọn các chế độ chia hội thoại cho nhân viên</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3">
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <div key={m.key} onClick={() => setMode(m.key)}
                className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl border cursor-pointer hover:border-[#c7d2fe] ${active ? 'border-[#3c55e6] bg-[#e9efff]' : 'border-[#e6e9f2]'}`}>
                <span className="text-[18px]">{m.icon}</span>
                <span className={`flex-1 text-[15px] font-bold ${active ? 'text-[#3c55e6]' : ''}`}>{m.label}</span>
                <span className="text-[#3c55e6] font-extrabold">{active ? '✓' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-[22px] max-w-[1000px]">
        <div className="text-base font-extrabold">Cấu hình chi tiết</div>
        <div className="text-[13px] text-[#6b7280] my-1 mb-3">Cấu hình cho chế độ chia hội thoại được chọn</div>
        <div className="flex items-center gap-3.5 py-3">
          <span className="text-[17px]">👁</span>
          <div className="flex-1">
            <div className="text-[15px] font-bold">Quyền xem</div>
            <div className="text-[13px] text-[#6b7280] mt-0.5">Nhân viên chỉ xem được hội thoại được chia cho mình</div>
          </div>
          <span onClick={() => setView((v) => !v)} className={`inline-flex w-11 h-[25px] rounded-full p-0.5 transition-colors shrink-0 cursor-pointer ${view ? 'bg-[#3c55e6]' : 'bg-[#d1d5db]'}`}>
            <span className={`w-[21px] h-[21px] rounded-full bg-white transition-transform ${view ? 'translate-x-[19px]' : ''}`} />
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';

const COLS = ['Tải SĐT', 'Tải BL', 'TN hội thoại', 'Cuộc gọi', 'TT khách', 'Cài đặt chung', 'Cài đặt thẻ', 'Hỗ trợ trả lời', 'Xoay vòng', 'Quảng cáo', 'Khác', 'Media'];
const ROLES = [
  { name: 'Quản trị viên', all: true },
  { name: 'Biên tập viên', all: false },
  { name: 'Người kiểm duyệt', all: true },
  { name: 'Mất quyền', none: true },
];
const STAFF = ['Nguyễn', 'Nguyễn Văn Hào', 'Nguyễn Ngọc Ánhh'];

/** perm[rowKey][colIndex] = boolean — staff cells là toggle được (giữ hành vi cũ). */
function initialPerm() {
  const p: Record<string, boolean[]> = {};
  STAFF.forEach((s) => { p[s] = COLS.map((_, i) => i !== 8); });
  return p;
}

export default function SettingsPermissions() {
  const [perm, setPerm] = useState<Record<string, boolean[]>>(initialPerm);
  const toggle = (row: string, col: number) =>
    setPerm((prev) => ({ ...prev, [row]: prev[row].map((v, i) => (i === col ? !v : v)) }));

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">Phân quyền</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e]">template · mock</span>
      </div>
      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-5 mt-[18px] overflow-x-auto">
        <div className="flex items-center gap-[18px] flex-wrap mb-4">
          <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-[10px] px-[13px] py-[9px] text-[#9ca3af] w-[300px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input placeholder="Tìm kiếm tài khoản" className="flex-1 border-none outline-none text-[13px] bg-transparent min-w-0 text-[#111827]" />
          </div>
          <label className="flex items-center gap-[7px] text-[13.5px] font-semibold cursor-pointer">
            <input type="checkbox" defaultChecked className="w-[15px] h-[15px] accent-[#3c55e6]" /> Chọn quyền cá nhân
          </label>
          <span className="flex items-center gap-[7px] text-[13.5px] font-semibold">
            <span className="w-3 h-3 rounded-full bg-[#16a34a]" /> Quyền theo vai trò
          </span>
        </div>
        <table className="border-collapse text-[13px] min-w-[900px]">
          <thead>
            <tr className="bg-[#f8fafc]">
              <th className="px-3.5 py-[9px] text-left text-[12px] font-bold text-[#374151] min-w-[180px]">Vai trò người dùng</th>
              {COLS.map((c) => <th key={c} className="px-2.5 py-[9px] text-[11.5px] font-bold text-[#374151] whitespace-nowrap">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r.name} className="border-t border-[#f1f5f9]">
                <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap">▸ {r.name}</td>
                {COLS.map((c) => (
                  <td key={c} className="p-2.5 text-center">
                    {r.none
                      ? <span className="text-[#e5e7eb]">○</span>
                      : <span className="text-[#9ca3af]">◉</span>}
                  </td>
                ))}
              </tr>
            ))}
            {STAFF.map((s) => (
              <tr key={s} className="border-t border-[#f1f5f9] bg-[#f5f8ff]">
                <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap pl-8">👤 {s}</td>
                {COLS.map((c, i) => {
                  const on = perm[s][i];
                  return (
                    <td key={c} className="p-2.5 text-center">
                      <span onClick={() => toggle(s, i)}
                        className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-md text-[12px] font-bold cursor-pointer select-none ${on ? 'bg-[#3c55e6] text-white' : 'bg-[#f1f5f9] text-[#9ca3af]'}`}>
                        {on ? '✓' : ''}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

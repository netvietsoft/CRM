'use client';
export const dynamic = 'force-dynamic';

import { Card, MockBadge } from '@/components/pancake/ui';

const COLS = ['Tải SĐT', 'Tải BL', 'TN hội thoại', 'Cuộc gọi', 'TT khách', 'Cài đặt chung', 'Cài đặt thẻ', 'Hỗ trợ trả lời', 'Xoay vòng', 'Quảng cáo', 'Khác', 'Media'];
const ROLES = [
  { name: 'Quản trị viên', all: true },
  { name: 'Biên tập viên', all: false },
  { name: 'Người kiểm duyệt', all: true },
  { name: 'Mất quyền', none: true },
];
const STAFF = ['Nguyễn', 'Nguyễn Văn Hào', 'Nguyễn Ngọc Ánhh'];

export default function SettingsPermissions() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Phân quyền</h1><MockBadge /></div>
      <Card>
        <div className="flex items-center gap-4 mb-3 text-sm">
          <input placeholder="🔍 Tìm kiếm tài khoản" className="border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-xs" />
          <span className="flex items-center gap-1 text-gray-600">☑️ Chọn quyền cá nhân</span>
          <span className="flex items-center gap-1 text-gray-600">🟢 Quyền theo vai trò</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 sticky left-0 bg-gray-50 w-44">Vai trò người dùng</th>
                {COLS.map((c) => <th key={c} className="px-2 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ROLES.map((r) => (
                <tr key={r.name}>
                  <td className="px-3 py-2 text-gray-700 sticky left-0 bg-white whitespace-nowrap">▸ {r.name}</td>
                  {COLS.map((c) => <td key={c} className="px-2 py-2 text-center">{r.none ? <span className="text-gray-200">○</span> : <span className="text-gray-400">◉</span>}</td>)}
                </tr>
              ))}
              {STAFF.map((s) => (
                <tr key={s} className="bg-blue-50/30">
                  <td className="px-3 py-2 text-gray-700 sticky left-0 bg-blue-50/30 whitespace-nowrap pl-8">👤 {s}</td>
                  {COLS.map((c, i) => <td key={c} className="px-2 py-2 text-center">{i === 8 ? <input type="checkbox" /> : <input type="checkbox" defaultChecked className="accent-[#3b5bdb]" />}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

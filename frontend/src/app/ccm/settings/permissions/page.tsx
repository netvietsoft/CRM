'use client';
export const dynamic = 'force-dynamic';

// Phân quyền THẬT — cùng dữ liệu staffPermissions với /admin/staff.
// Hàng = nhân viên, cột = module; mỗi ô 3 nút X (Xem) / S (Sửa) / D (Xoá) tick trực tiếp, lưu ngay.
import { useEffect, useMemo, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { PERM_MODULES } from '@/lib/staffPermissions';
import StaffAvatar from '@/components/ui/StaffAvatar';

interface StaffRecord {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl?: string | null;
  staffPermissions?: string[] | null;
}

export default function SettingsPermissions() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiClientClient.get<StaffRecord[]>('/admin/staff')
      .then((rows) => setStaff(rows || []))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Không tải được danh sách nhân viên'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return staff;
    return staff.filter((u) => u.name?.toLowerCase().includes(s) || u.phone?.includes(s) || u.email?.toLowerCase().includes(s));
  }, [staff, q]);

  const permsOf = (u: StaffRecord) => new Set(Array.isArray(u.staffPermissions) ? u.staffPermissions : []);

  // Tick 1 quyền → lưu ngay (optimistic, lỗi thì hoàn tác).
  const toggle = async (u: StaffRecord, key: string) => {
    const cur = permsOf(u);
    if (cur.has(key)) cur.delete(key); else cur.add(key);
    const next = [...cur];
    const prev = u.staffPermissions;
    setStaff((list) => list.map((x) => (x.id === u.id ? { ...x, staffPermissions: next } : x)));
    setSavingId(u.id); setErr('');
    try {
      await apiClientClient.post(`/admin/staff/${u.id}/permissions`, { permissions: next });
    } catch (e) {
      setStaff((list) => list.map((x) => (x.id === u.id ? { ...x, staffPermissions: prev } : x))); // hoàn tác
      setErr(e instanceof Error ? e.message : 'Lưu quyền thất bại');
    } finally { setSavingId(null); }
  };

  const Cell = ({ u, k, label, tip }: { u: StaffRecord; k: string | null; label: string; tip: string }) => {
    if (!k) return <span className="inline-block w-[22px] text-center text-[#e5e7eb]">·</span>;
    const on = permsOf(u).has(k);
    return (
      <span onClick={() => void toggle(u, k)} title={`${tip}${on ? ' — đang BẬT' : ' — đang tắt'}`}
        className={`inline-flex h-[21px] w-[22px] cursor-pointer select-none items-center justify-center rounded-md text-[10.5px] font-bold transition-colors ${on ? 'bg-[#3c55e6] text-white' : 'bg-[#eef1f6] text-[#b0b7c3] hover:bg-[#e2e6ee]'}`}>
        {label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">Phân quyền</h1>
      </div>
      <p className="mt-1 text-[13px] text-[#6b7280]">
        Tick trực tiếp — lưu ngay. Mỗi module 3 quyền: <b>X</b> Xem · <b>S</b> Sửa (tạo/cập nhật) · <b>D</b> Xoá.
        Cùng dữ liệu với trang <a href="/admin/staff" className="font-semibold text-[#3c55e6] underline">Quản trị → Nhân viên</a>.
      </p>
      {err && <div className="mt-3 rounded-[10px] border border-[#fecaca] bg-[#fee2e2] px-4 py-2.5 text-[13px] text-[#dc2626]">{err}</div>}

      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-5 mt-[18px] overflow-x-auto">
        <div className="mb-4 flex items-center gap-[18px] flex-wrap">
          <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-[10px] px-[13px] py-[9px] text-[#9ca3af] w-[300px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên / SĐT / email" className="flex-1 border-none outline-none text-[13px] bg-transparent min-w-0 text-[#111827]" />
          </div>
          {savingId && <span className="text-[12.5px] font-semibold text-[#3c55e6]">Đang lưu…</span>}
        </div>

        {loading ? (
          <div className="py-10 text-center text-[13px] text-[#9ca3af]">Đang tải…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[#9ca3af]">
            Chưa có nhân viên nào — tạo ở <a href="/admin/staff/assign" className="font-semibold underline">Quản trị → Nhân viên</a>.
          </div>
        ) : (
          <table className="border-collapse text-[13px] min-w-[980px]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="px-3.5 py-[9px] text-left text-[12px] font-bold text-[#374151] min-w-[180px]">Nhân viên</th>
                {PERM_MODULES.map((m) => (
                  <th key={m.name} title={m.note ? `${m.name} — ${m.note}` : m.name}
                    className="px-2.5 py-[9px] text-[11.5px] font-bold text-[#374151] whitespace-nowrap text-center">{m.short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={`border-t border-[#f1f5f9] ${i % 2 === 1 ? 'bg-[#f9fafb]' : ''} ${savingId === u.id ? 'opacity-70' : ''}`}>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <StaffAvatar src={u.avatarUrl} name={u.name || u.phone} size={26} />
                      <div>
                        <div className="font-semibold">{u.name || u.phone}</div>
                        <div className="text-[11px] text-[#9ca3af]">{u.phone}</div>
                      </div>
                    </div>
                  </td>
                  {PERM_MODULES.map((m) => (
                    <td key={m.name} className="p-2 text-center">
                      <span className="inline-flex gap-[3px]">
                        <Cell u={u} k={m.view} label="X" tip={`${m.name}: Xem`} />
                        <Cell u={u} k={m.manage} label="S" tip={`${m.name}: Sửa${m.name.startsWith('Tin nhắn') ? ' (trả lời tin)' : ''}`} />
                        <Cell u={u} k={m.del} label="D" tip={`${m.name}: Xoá`} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

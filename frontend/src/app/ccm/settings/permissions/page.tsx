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

interface MsgPage { id: string; externalId: string; name: string | null }
interface AccessRow {
  pageId: string;
  userId: string;
  access: string; // FULL | VIEW
  page: { externalId: string; name: string | null };
  user: { name: string | null; phone: string | null; avatarUrl: string | null };
}

export default function SettingsPermissions() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState('');

  // Phân quyền NV theo PAGE (truy cập đầy đủ / chỉ xem)
  const [pages, setPages] = useState<MsgPage[]>([]);
  const [matrix, setMatrix] = useState<AccessRow[]>([]);
  const [addPageId, setAddPageId] = useState('');
  const [addUserId, setAddUserId] = useState('');

  useEffect(() => {
    Promise.all([
      apiClientClient.get<StaffRecord[]>('/admin/staff'),
      apiClientClient.get<MsgPage[]>('/messenger/pages').catch(() => [] as MsgPage[]),
      apiClientClient.get<AccessRow[]>('/messenger/assign/matrix').catch(() => [] as AccessRow[]),
    ])
      .then(([rows, ps, mx]) => { setStaff(rows || []); setPages(ps || []); setMatrix(mx || []); })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false));
  }, []);

  // Đặt quyền page (FULL/VIEW/null=gỡ) — lưu ngay, optimistic.
  const setAccess = async (pageId: string, userId: string, access: string | null, rowInfo?: AccessRow) => {
    const prev = matrix;
    if (access === null) setMatrix((m) => m.filter((r) => !(r.pageId === pageId && r.userId === userId)));
    else if (prev.some((r) => r.pageId === pageId && r.userId === userId)) {
      setMatrix((m) => m.map((r) => (r.pageId === pageId && r.userId === userId ? { ...r, access } : r)));
    } else if (rowInfo) setMatrix((m) => [...m, rowInfo]);
    setErr('');
    try {
      await apiClientClient.post('/messenger/assign/access', { pageId, userId, access });
    } catch (e) {
      setMatrix(prev); // hoàn tác
      setErr(e instanceof Error ? e.message : 'Lưu quyền page thất bại');
    }
  };

  const addAssignment = () => {
    if (!addPageId || !addUserId) return;
    if (matrix.some((r) => r.pageId === addPageId && r.userId === addUserId)) { setErr('NV này đã được gán page này rồi.'); return; }
    const p = pages.find((x) => x.id === addPageId);
    const u = staff.find((x) => x.id === addUserId);
    if (!p || !u) return;
    void setAccess(addPageId, addUserId, 'FULL', {
      pageId: addPageId, userId: addUserId, access: 'FULL',
      page: { externalId: p.externalId, name: p.name },
      user: { name: u.name, phone: u.phone, avatarUrl: u.avatarUrl || null },
    });
    setAddUserId('');
  };

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

      {/* ===== Phân quyền NV theo PAGE: truy cập đầy đủ / chỉ xem ===== */}
      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-5 mt-[18px] overflow-x-auto">
        <div className="text-base font-extrabold">Phân quyền theo Page</div>
        <p className="mt-1 mb-3 text-[13px] text-[#6b7280]">
          Gán nhân viên vào từng page: <b>Truy cập đầy đủ</b> = xem + trả lời tin; <b>Chỉ xem</b> = đọc hội thoại, KHÔNG gửi được tin (chặn cả API).
          NV được gán tự có quyền vào /ccm/conversations.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <select value={addPageId} onChange={(e) => setAddPageId(e.target.value)}
            className="rounded-[10px] border border-[#c7ced9] bg-white px-3 py-2 text-[13px] outline-none">
            <option value="">— Chọn page —</option>
            {pages.map((p) => <option key={p.id} value={p.id}>{p.name || p.externalId}</option>)}
          </select>
          <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)}
            className="rounded-[10px] border border-[#c7ced9] bg-white px-3 py-2 text-[13px] outline-none">
            <option value="">— Chọn nhân viên —</option>
            {staff.map((u) => <option key={u.id} value={u.id}>{u.name || u.phone}</option>)}
          </select>
          <button onClick={addAssignment} disabled={!addPageId || !addUserId}
            className="rounded-[10px] bg-[#3c55e6] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#2f44c4] disabled:opacity-50">＋ Gán vào page</button>
        </div>

        {matrix.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-[#9ca3af]">Chưa gán NV nào vào page — chọn page + nhân viên rồi bấm ＋.</div>
        ) : (
          <table className="border-collapse text-[13px] min-w-[860px]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="px-3 py-[9px] text-left text-[11.5px] font-bold text-[#374151]">ID Page</th>
                <th className="px-3 py-[9px] text-left text-[11.5px] font-bold text-[#374151]">Tên Page</th>
                <th className="px-3 py-[9px] text-left text-[11.5px] font-bold text-[#374151]">ID Nhân viên</th>
                <th className="px-3 py-[9px] text-left text-[11.5px] font-bold text-[#374151]">Tên Nhân viên</th>
                <th className="px-3 py-[9px] text-center text-[11.5px] font-bold text-[#374151]">Truy cập đầy đủ</th>
                <th className="px-3 py-[9px] text-center text-[11.5px] font-bold text-[#374151]">Chỉ xem</th>
                <th className="px-2 py-[9px]"></th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((r, i) => (
                <tr key={`${r.pageId}:${r.userId}`} className={`border-t border-[#f1f5f9] ${i % 2 === 1 ? 'bg-[#f9fafb]' : ''}`}>
                  <td className="px-3 py-2.5 font-mono text-[11.5px] text-[#6b7280] whitespace-nowrap">{r.page.externalId}</td>
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{r.page.name || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-[11.5px] text-[#6b7280]">{r.userId.slice(0, 8)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <StaffAvatar src={r.user.avatarUrl} name={r.user.name || r.user.phone} size={24} />
                      <span className="font-semibold">{r.user.name || r.user.phone}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input type="checkbox" checked={r.access === 'FULL'} onChange={() => void setAccess(r.pageId, r.userId, 'FULL')}
                      className="h-[16px] w-[16px] cursor-pointer accent-[#3c55e6]" />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input type="checkbox" checked={r.access === 'VIEW'} onChange={() => void setAccess(r.pageId, r.userId, 'VIEW')}
                      className="h-[16px] w-[16px] cursor-pointer accent-[#d97706]" />
                  </td>
                  <td className="px-2 py-2.5">
                    <button onClick={() => void setAccess(r.pageId, r.userId, null)} title="Gỡ NV khỏi page"
                      className="rounded-lg px-2 py-1 text-[#dc2626] hover:bg-[#fee2e2]">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

// Chia hội thoại cho NV trực page (rotation) — cài đặt THẬT theo từng page.
// mode: OFF | SELF | GROUP | STAFF. Lưu qua POST /messenger/assign/settings.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import StaffAvatar from '@/components/ui/StaffAvatar';

interface MsgPage { id: string; externalId: string; name: string | null }
interface StaffUser { id: string; name: string | null; phone: string | null; avatarUrl?: string | null; role?: string; staffPermissions?: string[] | null }
interface Group { name: string; memberIds: string[]; ratio: number }
interface StaffRatio { userId: string; ratio: number }
interface AssignConfig {
  selfClaim?: boolean;
  groups?: Group[];
  staffRatios?: StaffRatio[];
  onlineMode?: 'ONLINE_ONLY' | 'EVEN' | 'PREFER_ONLINE';
  shuffle?: boolean;
  mainPerConv?: number;
  extraAfterUnreadMin?: number;
  extraIfOffline?: boolean;
  maxPendingEnabled?: boolean;
  maxPending?: number;
  schedule?: 'ALL_TIME' | 'WORK_HOURS';
  outsideViewAll?: boolean;
  visibility?: 'ALL' | 'MINE_AND_UNASSIGNED' | 'MINE';
}

const MODES = [
  { key: 'OFF', icon: '🚫', label: 'Tắt chế độ phân công', desc: 'Tất cả nhân viên vai trò như nhau trên hội thoại của page.' },
  { key: 'SELF', icon: '✋', label: 'Nhân viên tự phân công', desc: 'Tin mới chưa ai trả lời — NV nào trả lời trước sẽ tự nhận, NV khác thấy tag và không tranh.' },
  { key: 'GROUP', icon: '👥', label: 'Phân công theo nhóm', desc: 'Tạo nhóm NV, chia tin theo tỷ lệ % từng nhóm (xen kẽ, không dồn).' },
  { key: 'STAFF', icon: '👤', label: 'Phân công theo nhân viên', desc: 'Chia tin theo tỷ lệ % từng NV, kèm cấu hình chi tiết.' },
];

const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button type="button" disabled={disabled} onClick={() => onChange(!on)}
    className={`relative h-[22px] w-[40px] rounded-full transition-colors ${on ? 'bg-[#3c55e6]' : 'bg-[#d1d5db]'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
    <span className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${on ? 'left-[20px]' : 'left-[2px]'}`} />
  </button>
);

const card = 'bg-white border border-[#e6e9f2] rounded-2xl p-[22px] max-w-[1000px]';
const rowCls = 'flex items-start justify-between gap-4 py-3 border-t border-[#f1f5f9] first:border-t-0';

export default function SettingsRotation() {
  const [pages, setPages] = useState<MsgPage[]>([]);
  const [pageId, setPageId] = useState('');
  const [allStaff, setAllStaff] = useState<StaffUser[]>([]);
  const [dutyIds, setDutyIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState('OFF');
  const [cfg, setCfg] = useState<AssignConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false); // có thay đổi chưa lưu

  // Rời trang khi chưa lưu → trình duyệt cảnh báo.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // Nạp pages + toàn bộ NV (STAFF) 1 lần.
  useEffect(() => {
    Promise.all([
      apiClientClient.get<MsgPage[]>('/messenger/pages'),
      apiClientClient.get<StaffUser[]>('/admin/staff').catch(() => [] as StaffUser[]),
    ]).then(([ps, st]) => {
      setPages(ps);
      setAllStaff(st);
      if (ps.length) setPageId((prev) => prev || ps[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Đổi page → nạp cài đặt + NV trực của page đó.
  const loadPage = useCallback(async (pid: string) => {
    if (!pid) return;
    try {
      const [settings, duty] = await Promise.all([
        apiClientClient.get<{ mode: string; config: AssignConfig }>(`/messenger/assign/settings`, { params: { pageId: pid } }),
        apiClientClient.get<StaffUser[]>(`/messenger/assign/staff`, { params: { pageId: pid } }),
      ]);
      setMode(settings.mode || 'OFF');
      setCfg(settings.config || {});
      setDutyIds(new Set(duty.map((u) => u.id)));
      setDirty(false);
    } catch { /* giữ mặc định */ }
  }, []);
  useEffect(() => { void loadPage(pageId); }, [pageId, loadPage]);

  const dutyStaff = useMemo(() => allStaff.filter((s) => dutyIds.has(s.id)), [allStaff, dutyIds]);
  // NV đã có quyền vào /ccm/conversations — NV chưa có sẽ được TỰ CẤP khi lưu (BE auto-grant).
  const hasCcm = (s: StaffUser) => {
    const p = Array.isArray(s.staffPermissions) ? s.staffPermissions : [];
    return p.includes('MESSENGER_VIEW') || p.includes('MESSENGER_SEND');
  };

  const up = <K extends keyof AssignConfig>(k: K, v: AssignConfig[K]) => { setDirty(true); setCfg((p) => ({ ...p, [k]: v })); };

  // ----- nhóm -----
  const groups = cfg.groups || [];
  const setGroups = (g: Group[]) => up('groups', g);
  const groupSum = groups.reduce((s, g) => s + (Number(g.ratio) || 0), 0);
  // ----- tỷ lệ NV -----
  const ratios = cfg.staffRatios || [];
  const setRatios = (r: StaffRatio[]) => up('staffRatios', r);
  const ratioSum = ratios.reduce((s, r) => s + (Number(r.ratio) || 0), 0);

  const save = async () => {
    if (!pageId) return;
    // Chặn sớm với thông báo alert RÕ (banner đầu trang dễ bị bỏ qua → tưởng đã lưu).
    if (mode === 'GROUP') {
      if (!groups.length) { alert('Chưa có nhóm nào — bấm ＋ Thêm nhóm trước khi lưu.'); return; }
      const empty = groups.filter((g) => !g.memberIds.length);
      if (empty.length) { alert(`Nhóm chưa có nhân viên: ${empty.map((g) => g.name).join(', ')}.\nMỗi nhóm cần ít nhất 1 NV (NV phải có quyền Tin nhắn CCM).`); return; }
      if (groupSum !== 100) { alert(`Tổng tỷ lệ các nhóm đang ${groupSum}% — phải đúng 100% mới lưu được.`); return; }
    }
    if (mode === 'STAFF') {
      if (!ratios.filter((r) => r.ratio > 0).length) { alert('Chưa đặt tỷ lệ % cho nhân viên nào.'); return; }
      if (ratioSum !== 100) { alert(`Tổng tỷ lệ nhân viên đang ${ratioSum}% — phải đúng 100% mới lưu được.`); return; }
    }
    setSaving(true); setMsg(null);
    try {
      // NV được dùng trong nhóm/tỷ lệ tự vào danh sách trực page (union) — khỏi phải tick 2 nơi.
      const used = new Set<string>([
        ...dutyIds,
        ...(mode === 'GROUP' ? groups.flatMap((g) => g.memberIds) : []),
        ...(mode === 'STAFF' ? ratios.filter((r) => r.ratio > 0).map((r) => r.userId) : []),
      ]);
      await apiClientClient.post('/messenger/assign/staff', { pageId, userIds: [...used] });
      setDutyIds(used);
      await apiClientClient.post('/messenger/assign/settings', { pageId, mode, config: cfg });
      setMsg({ ok: true, text: 'Đã lưu cài đặt chia hội thoại.' });
      setDirty(false);
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Lưu thất bại';
      setMsg({ ok: false, text });
      alert(`Lưu thất bại: ${text}`); // alert để không bị bỏ sót banner
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-10 text-center text-[13px] text-[#9ca3af]">Đang tải…</div>;

  return (
    <div className="space-y-4">
      <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">Chia hội thoại (trực page)</h1>
      {msg && <div className={`rounded-[10px] border px-4 py-2.5 text-[13px] ${msg.ok ? 'border-[#a7f3d0] bg-[#d1fae5] text-[#047857]' : 'border-[#fecaca] bg-[#fee2e2] text-[#dc2626]'}`}>{msg.text}</div>}
      {pages.length === 0 && <div className={`${card} text-center text-[13px] text-[#9ca3af]`}>Chưa có page nào — kết nối fanpage ở mục Tích hợp trước.</div>}

      {/* Chọn Page — đặt trên cùng, mọi cài đặt bên dưới là của page này */}
      <div className={card}>
        <div className="text-base font-extrabold">Chọn Page</div>
        <div className="text-[13px] text-[#6b7280] my-1 mb-3">Mọi cài đặt bên dưới áp cho page được chọn.</div>
        <select value={pageId}
          onChange={(e) => {
            if (dirty && !window.confirm('Cài đặt page hiện tại CHƯA LƯU — đổi page sẽ mất thay đổi. Tiếp tục?')) return;
            setPageId(e.target.value);
          }}
          className="w-full max-w-[420px] rounded-[10px] border border-[#c7ced9] bg-white px-3 py-2.5 text-[14px] font-semibold outline-none">
          {pages.map((p) => <option key={p.id} value={p.id}>{p.name || p.externalId}</option>)}
        </select>
      </div>

      {/* NV trực page */}
      <div className={card}>
        <div className="text-base font-extrabold">Nhân viên trực page</div>
        <div className="text-[13px] text-[#6b7280] my-1 mb-3">Chọn NV được trực page này (trả lời tin, lên đơn). NV được add vào nhóm/bảng tỷ lệ bên dưới sẽ tự vào danh sách này khi Lưu.</div>
        {allStaff.length === 0 ? (
          <div className="text-[13px] text-[#9ca3af]">Chưa có nhân viên — tạo ở Quản trị → Nhân viên.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allStaff.map((s) => {
              const on = dutyIds.has(s.id);
              return (
                <button key={s.id} type="button"
                  onClick={() => { setDirty(true); setDutyIds((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; }); }}
                  className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3.5 text-[13px] font-semibold transition-colors ${on ? 'bg-[#3c55e6] text-white' : 'bg-[#f1f5f9] text-[#4b5563] hover:bg-[#e5e7eb]'}`}>
                  <StaffAvatar src={s.avatarUrl} name={s.name || s.phone} size={22} />
                  {on ? '✓ ' : ''}{s.name || s.phone}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chế độ */}
      <div className={card}>
        <div className="text-base font-extrabold">Cài đặt chế độ</div>
        <div className="text-[13px] text-[#6b7280] my-1 mb-4">Chọn chế độ chia hội thoại cho nhân viên</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3">
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <div key={m.key} onClick={() => { setMode(m.key); setDirty(true); }}
                className={`px-4 py-3.5 rounded-xl border cursor-pointer hover:border-[#c7d2fe] ${active ? 'border-[#3c55e6] bg-[#e9efff]' : 'border-[#e6e9f2]'}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-[18px]">{m.icon}</span>
                  <span className={`flex-1 text-[15px] font-bold ${active ? 'text-[#3c55e6]' : ''}`}>{m.label}</span>
                  <span className="text-[#3c55e6] font-extrabold">{active ? '✓' : ''}</span>
                </div>
                <div className="mt-1 text-[12px] text-[#6b7280]">{m.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELF */}
      {mode === 'SELF' && (
        <div className={card}>
          <div className="text-base font-extrabold mb-2">✋ Nhân viên tự phân công</div>
          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Tự nhận khi trả lời</div>
              <div className="text-[12.5px] text-[#6b7280]">Tin mới chưa ai trả lời — NV trả lời sẽ được tự phân công; NV khác thấy tag người nhận và không vào tranh.</div>
            </div>
            <Toggle on={cfg.selfClaim !== false} onChange={(v) => up('selfClaim', v)} />
          </div>
          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Chỉ xem hội thoại của mình + chưa chia</div>
              <div className="text-[12.5px] text-[#6b7280]">NV chỉ thấy hội thoại được chia cho mình và hội thoại chưa được chia cho ai.</div>
            </div>
            <Toggle on={cfg.visibility === 'MINE_AND_UNASSIGNED'} onChange={(v) => up('visibility', v ? 'MINE_AND_UNASSIGNED' : 'ALL')} />
          </div>
        </div>
      )}

      {/* GROUP */}
      {mode === 'GROUP' && (
        <div className={card}>
          <div className="flex items-center justify-between">
            <div className="text-base font-extrabold">👥 Phân công theo nhóm</div>
            <button onClick={() => setGroups([...groups, { name: `Nhóm ${groups.length + 1}`, memberIds: [], ratio: 0 }])}
              className="rounded-[10px] bg-[#3c55e6] px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-[#2f44c4]">＋ Thêm nhóm</button>
          </div>
          <div className="text-[13px] text-[#6b7280] my-1 mb-3">
            Đặt tên nhóm → bấm chọn NV vào nhóm → đặt tỷ lệ %. NV chưa có quyền Tin nhắn CCM (🔓) sẽ tự được cấp khi Lưu.
            Tin chia xen kẽ theo tỷ lệ (VD 50/30/20: nhóm 1 tin 1, nhóm 2 tin 2, nhóm 3 tin 3, nhóm 1 tin 4…) — không dồn hết suất một nhóm.
            Tổng tỷ lệ hiện tại: <b className={groupSum === 100 ? 'text-[#16a34a]' : 'text-[#dc2626]'}>{groupSum}%</b> (phải bằng 100%).
          </div>
          {groups.length === 0 && <div className="text-[13px] text-[#9ca3af]">Chưa có nhóm — bấm ＋ Thêm nhóm.</div>}
          <div className="space-y-3">
            {groups.map((g, gi) => (
              <div key={gi} className="rounded-xl border border-[#e6e9f2] p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <input value={g.name} onChange={(e) => setGroups(groups.map((x, i) => (i === gi ? { ...x, name: e.target.value } : x)))}
                    className="w-[180px] rounded-[9px] border border-[#c7ced9] px-3 py-1.5 text-[13px] font-semibold outline-none" placeholder="Tên nhóm" />
                  <label className="flex items-center gap-1.5 text-[13px]">Tỷ lệ
                    <input type="number" min={0} max={100} value={g.ratio}
                      onChange={(e) => setGroups(groups.map((x, i) => (i === gi ? { ...x, ratio: Number(e.target.value) || 0 } : x)))}
                      className="w-[64px] rounded-[9px] border border-[#c7ced9] px-2 py-1.5 text-right text-[13px] outline-none" />%
                  </label>
                  <button onClick={() => setGroups(groups.filter((_, i) => i !== gi))} className="ml-auto rounded-lg px-2 py-1 text-[#dc2626] hover:bg-[#fee2e2]">🗑 Xoá nhóm</button>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {allStaff.length === 0 && (
                    <span className="text-[12px] text-[#9ca3af]">
                      Chưa có nhân viên — tạo ở <a href="/admin/staff" className="font-bold underline">Quản trị → Nhân viên</a>.
                    </span>
                  )}
                  {allStaff.map((s) => {
                    const inG = g.memberIds.includes(s.id);
                    return (
                      <button key={s.id} type="button"
                        onClick={() => setGroups(groups.map((x, i) => (i === gi ? { ...x, memberIds: inG ? x.memberIds.filter((id) => id !== s.id) : [...x.memberIds, s.id] } : x)))}
                        className={`flex items-center gap-1.5 rounded-full py-[3px] pl-[3px] pr-3 text-[12px] font-semibold ${inG ? 'bg-[#16a34a] text-white' : 'bg-[#f1f5f9] text-[#4b5563] hover:bg-[#e5e7eb]'}`}
                        title={hasCcm(s) ? undefined : 'NV chưa có quyền Tin nhắn CCM — sẽ tự được cấp khi Lưu'}>
                        <StaffAvatar src={s.avatarUrl} name={s.name || s.phone} size={20} />
                        {inG ? '✓ ' : ''}{s.name || s.phone}{!hasCcm(s) && ' 🔓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STAFF */}
      {mode === 'STAFF' && (
        <div className={card}>
          <div className="text-base font-extrabold">👤 Phân công theo nhân viên</div>
          <div className="text-[13px] text-[#6b7280] my-1 mb-3">
            Chia xen kẽ theo tỷ lệ %. Tổng hiện tại: <b className={ratioSum === 100 ? 'text-[#16a34a]' : 'text-[#dc2626]'}>{ratioSum}%</b> (phải bằng 100%).
          </div>
          {allStaff.length === 0 ? (
            <div className="text-[13px] text-[#9ca3af]">
              Chưa có nhân viên — tạo ở <a href="/admin/staff" className="font-bold underline">Quản trị → Nhân viên</a>.
            </div>
          ) : (
            <table className="w-full max-w-[560px] border-collapse text-[13px]">
              <thead><tr className="bg-[#f8fafc]">
                <th className="px-3 py-2 text-left text-[11.5px] font-bold text-[#374151]">Nhân viên</th>
                <th className="w-[120px] px-3 py-2 text-right text-[11.5px] font-bold text-[#374151]">Tỷ lệ %</th>
              </tr></thead>
              <tbody>
                {allStaff.map((s) => {
                  const r = ratios.find((x) => x.userId === s.id);
                  return (
                    <tr key={s.id} className="border-t border-[#f1f5f9]">
                      <td className="px-3 py-2 font-semibold">
                        <span className="flex items-center gap-2">
                          <StaffAvatar src={s.avatarUrl} name={s.name || s.phone} size={22} />
                          {s.name || s.phone}
                          {!hasCcm(s) && <span className="text-[11px] font-normal text-[#b45309]" title="Sẽ tự được cấp quyền Tin nhắn CCM khi Lưu">🔓 tự cấp quyền CCM khi lưu</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" min={0} max={100} value={r?.ratio ?? 0}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0;
                            const others = ratios.filter((x) => x.userId !== s.id);
                            setRatios(v > 0 || r ? [...others, { userId: s.id, ratio: v }] : others);
                          }}
                          className="w-[72px] rounded-[9px] border border-[#c7ced9] px-2 py-1.5 text-right text-[13px] outline-none" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Cấu hình chi tiết — áp cho GROUP + STAFF */}
      {(mode === 'GROUP' || mode === 'STAFF') && (
        <div className={card}>
          <div className="text-base font-extrabold mb-1">Cấu hình chi tiết</div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Cách thức chia hội thoại</div>
              <div className="text-[12.5px] text-[#6b7280]">Chỉ trực tuyến: không ai online thì chờ. Ưu tiên trực tuyến: có người online thì chia cho họ, không thì chia đều.</div>
            </div>
            <select value={cfg.onlineMode || 'EVEN'} onChange={(e) => up('onlineMode', e.target.value as AssignConfig['onlineMode'])}
              className="rounded-[9px] border border-[#c7ced9] px-3 py-1.5 text-[13px] outline-none">
              <option value="ONLINE_ONLY">Chỉ trực tuyến</option>
              <option value="EVEN">Chia đều</option>
              <option value="PREFER_ONLINE">Ưu tiên trực tuyến</option>
            </select>
          </div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Xáo trộn danh sách nhân viên</div>
              <div className="text-[12.5px] text-[#6b7280]">Bắt đầu vòng chia mới sẽ tự xáo trộn thứ tự danh sách.</div>
            </div>
            <Toggle on={!!cfg.shuffle} onChange={(v) => up('shuffle', v)} />
          </div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Số tài khoản chính mỗi hội thoại</div>
              <div className="text-[12.5px] text-[#6b7280]">Hiện hỗ trợ 1 tài khoản chính/hội thoại — nhiều tài khoản (chính + phụ) sẽ bổ sung sau.</div>
            </div>
            <input type="number" value={1} disabled className="w-[64px] rounded-[9px] border border-[#e5e7eb] bg-[#f3f4f6] px-2 py-1.5 text-right text-[13px] text-[#9ca3af]" />
          </div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Phân công thêm nếu hội thoại chưa được đọc</div>
              <div className="text-[12.5px] text-[#6b7280]">Quá thời gian mà NV chưa đọc → phân thêm tài khoản khác. <i>(Lưu cấu hình — engine kích hoạt đợt sau.)</i></div>
            </div>
            <select value={cfg.extraAfterUnreadMin ?? 0} onChange={(e) => up('extraAfterUnreadMin', Number(e.target.value))}
              className="rounded-[9px] border border-[#c7ced9] px-3 py-1.5 text-[13px] outline-none">
              {[0, 3, 5, 10, 20, 30, 60, 120].map((m) => <option key={m} value={m}>{m === 0 ? 'Tắt' : `${m} phút`}</option>)}
            </select>
          </div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Phân thêm nếu người được phân không trực tuyến</div>
              <div className="text-[12.5px] text-[#6b7280]">Tin mới đến mà NV được phân offline → phân thêm NV khác. <i>(Lưu cấu hình — kích hoạt đợt sau.)</i></div>
            </div>
            <Toggle on={!!cfg.extraIfOffline} onChange={(v) => up('extraIfOffline', v)} />
          </div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Số hội thoại chờ đọc tối đa mỗi tài khoản</div>
              <div className="text-[12.5px] text-[#6b7280]">NV đạt giới hạn sẽ không được chia thêm cho tới khi đọc bớt. Tắt = không giới hạn.</div>
            </div>
            <div className="flex items-center gap-2.5">
              <Toggle on={!!cfg.maxPendingEnabled} onChange={(v) => up('maxPendingEnabled', v)} />
              {cfg.maxPendingEnabled && (
                <input type="number" min={1} value={cfg.maxPending ?? 5} onChange={(e) => up('maxPending', Math.max(1, Number(e.target.value) || 1))}
                  className="w-[64px] rounded-[9px] border border-[#c7ced9] px-2 py-1.5 text-right text-[13px] outline-none" />
              )}
            </div>
          </div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Thời gian phân công hội thoại</div>
              <div className="text-[12.5px] text-[#6b7280]">Giờ làm việc cài ở Cài đặt chung (đang xây thêm) — hiện engine chạy toàn thời gian.</div>
            </div>
            <select value={cfg.schedule || 'ALL_TIME'} onChange={(e) => up('schedule', e.target.value as AssignConfig['schedule'])}
              className="rounded-[9px] border border-[#c7ced9] px-3 py-1.5 text-[13px] outline-none">
              <option value="ALL_TIME">Toàn thời gian</option>
              <option value="WORK_HOURS">Trong giờ làm việc</option>
            </select>
          </div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Quyền xem — NV ngoài danh sách</div>
              <div className="text-[12.5px] text-[#6b7280]">NV không được chọn trong danh sách chia vẫn xem được tất cả hội thoại của page.</div>
            </div>
            <Toggle on={cfg.outsideViewAll !== false} onChange={(v) => up('outsideViewAll', v)} />
          </div>

          <div className={rowCls}>
            <div>
              <div className="text-[14px] font-bold">Quyền xem — NV trong danh sách</div>
              <div className="text-[12.5px] text-[#6b7280]">
                &quot;Của mình + chưa chia&quot; không khả dụng khi bật giới hạn hội thoại chờ đọc ở trên.
              </div>
            </div>
            <select
              value={cfg.visibility || 'ALL'}
              onChange={(e) => up('visibility', e.target.value as AssignConfig['visibility'])}
              className="rounded-[9px] border border-[#c7ced9] px-3 py-1.5 text-[13px] outline-none">
              <option value="ALL">Xem tất cả</option>
              <option value="MINE_AND_UNASSIGNED" disabled={!!cfg.maxPendingEnabled}>Của mình + chưa chia</option>
              <option value="MINE">Chỉ của mình</option>
            </select>
          </div>
        </div>
      )}

      {/* Nút Lưu nổi sticky dưới chân — chỉ mỗi button, không dải nền */}
      <div className="pointer-events-none sticky bottom-4 z-20 flex max-w-[1000px] justify-end">
        <button onClick={() => void save()} disabled={saving || !pageId}
          className={`pointer-events-auto px-[22px] py-2.5 border-none rounded-[11px] text-white text-[13.5px] font-bold cursor-pointer shadow-lg disabled:opacity-50 ${dirty ? 'bg-[#dc2626] hover:bg-[#b91c1c] animate-pulse' : 'bg-[#4f68ee] hover:bg-[#3c55e6]'}`}>
          {saving ? 'Đang lưu…' : dirty ? '⚠ Lưu thay đổi' : '💾 Lưu cài đặt'}
        </button>
      </div>
    </div>
  );
}

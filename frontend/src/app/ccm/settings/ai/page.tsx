'use client';
export const dynamic = 'force-dynamic';

/* /ccm/settings/ai — Cài đặt AI chốt đơn qua chat (nối GET/PUT /ai-agent/config theo page). */

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface MsgPage { id: string; externalId: string; name: string | null }
interface AiConfig { pageId: string; enabled: boolean; mode: string; persona?: string | null; dailyTokenCap?: number | null }

const MODES: { v: string; label: string; desc: string }[] = [
  { v: 'OFF', label: 'Tắt', desc: 'AI không xử lý page này.' },
  { v: 'SHADOW', label: 'Shadow (gợi ý)', desc: 'AI soạn gợi ý + đơn nháp, KHÔNG gửi. Nhân viên duyệt.' },
  { v: 'AUTO', label: 'Tự động', desc: 'AI tự trả lời khách + tạo đơn PENDING. Có lưới an toàn.' },
];

export default function AiSettings() {
  const [pages, setPages] = useState<MsgPage[]>([]);
  const [pageId, setPageId] = useState('');
  const [configured, setConfigured] = useState(true);
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    apiClientClient.get<MsgPage[]>('/messenger/pages').then((p) => { setPages(p || []); if (p?.[0]) setPageId(p[0].id); }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!pageId) { setCfg(null); return; }
    setLoading(true);
    try {
      const r = await apiClientClient.get<{ config: AiConfig | null; configured: boolean }>(`/ai-agent/config?pageId=${encodeURIComponent(pageId)}`);
      setConfigured(r.configured);
      setCfg(r.config || { pageId, enabled: false, mode: 'SHADOW', persona: '', dailyTokenCap: undefined });
    } catch { setCfg({ pageId, enabled: false, mode: 'SHADOW', persona: '', dailyTokenCap: undefined }); }
    finally { setLoading(false); }
  }, [pageId]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!cfg) return;
    setSaving(true); setFlash('');
    try {
      await apiClientClient.put('/ai-agent/config', { pageId, enabled: cfg.enabled, mode: cfg.mode, persona: cfg.persona || null, dailyTokenCap: cfg.dailyTokenCap ?? null });
      setFlash('Đã lưu cấu hình AI.');
    } catch (e) { setFlash(e instanceof Error ? e.message : 'Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const set = (patch: Partial<AiConfig>) => setCfg((c) => (c ? { ...c, ...patch } : c));

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="text-2xl font-extrabold tracking-[-0.4px]">Trợ lý AI (chốt đơn)</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11.5px] font-bold bg-[#e8ecff] text-[#3c55e6]">Beta</span>
      </div>
      <p className="mt-[7px] mb-[14px] text-[13.5px] text-[#6b7280]">AI tự tư vấn + chốt đơn qua Messenger. Bật theo từng page; Shadow để thử an toàn trước khi bật Tự động.</p>

      {!configured && (
        <div className="bg-[#fffbeb] border border-[#fde68a] text-[#78350f] text-[13px] rounded-xl px-4 py-3 max-w-[900px] mb-4">
          ⚠ Chưa cấu hình <code className="font-mono bg-[#fef3c7] px-1.5 py-px rounded-[5px]">ANTHROPIC_API_KEY</code> ở backend — AI sẽ không chạy thật cho tới khi thêm key.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#e6e9f2] p-6 max-w-[900px]">
        <div className="text-[14px] font-semibold text-[#374151] mb-2">Chọn page</div>
        <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="w-full border border-[#e5e7eb] rounded-[11px] px-[13px] py-[11px] text-[14px] bg-white mb-[18px]">
          {pages.length === 0 && <option value="">(chưa có page)</option>}
          {pages.map((p) => <option key={p.id} value={p.id}>{p.name || p.externalId}</option>)}
        </select>

        {loading ? <div className="text-sm text-gray-400">Đang tải…</div> : cfg && (
          <>
            <label className="flex items-center gap-2.5 text-[14.5px] font-semibold cursor-pointer mb-[18px]">
              Bật AI cho page này
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="w-[17px] h-[17px] accent-[#3c55e6]" />
            </label>

            <div className="text-[14px] font-semibold text-[#374151] mb-2">Chế độ</div>
            <div className="space-y-2">
              {MODES.map((m) => (
                <label key={m.v} className={`flex items-start gap-2.5 p-3 rounded-[11px] border cursor-pointer ${cfg.mode === m.v ? 'border-[#3c55e6] bg-[#e9efff]' : 'border-[#e5e7eb]'}`}>
                  <input type="radio" name="mode" checked={cfg.mode === m.v} onChange={() => set({ mode: m.v })} className="mt-1 accent-[#3c55e6]" />
                  <span><span className="block text-[14.5px] font-bold text-gray-900">{m.label}</span><span className="block text-[12.5px] text-[#6b7280] mt-0.5">{m.desc}</span></span>
                </label>
              ))}
            </div>

            <div className="text-[14px] font-semibold text-[#374151] mt-[18px] mb-2">Persona / hướng dẫn AI (để trống = dùng mặc định của hệ thống)</div>
            <textarea value={cfg.persona || ''} onChange={(e) => set({ persona: e.target.value })} rows={4}
              placeholder="VD: Bạn là NV shop thời trang nữ. Giọng thân thiện, xưng em. Luôn nhắc lại đơn và xin xác nhận trước khi chốt…"
              className="w-full border border-[#e5e7eb] rounded-[11px] px-[14px] py-3 text-[13.5px] outline-none resize-y focus:border-[#3c55e6]" />

            <div className="text-[14px] font-semibold text-[#374151] mt-4 mb-2">Trần token/ngày (để trống = không giới hạn)</div>
            <input type="number" value={cfg.dailyTokenCap ?? ''} onChange={(e) => set({ dailyTokenCap: e.target.value ? Number(e.target.value) : undefined })}
              className="w-[200px] border border-[#e5e7eb] rounded-[11px] px-[13px] py-2.5 text-[14px] outline-none block focus:border-[#3c55e6]" />

            <div className="flex items-center gap-3 mt-5">
              <button onClick={() => void save()} disabled={saving || !pageId} className="px-[22px] py-3 rounded-[11px] bg-[#4f68ee] text-white text-[14px] font-bold hover:bg-[#3c55e6] disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
              {flash && <span className="text-sm text-gray-500">{flash}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

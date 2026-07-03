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
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Trợ lý AI (chốt đơn)</h1>
        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#3b5bdb]">Beta</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">AI tự tư vấn + chốt đơn qua Messenger. Bật theo từng page; Shadow để thử an toàn trước khi bật Tự động.</p>

      {!configured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-2 mb-4">
          ⚠️ Chưa cấu hình <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> ở backend — AI sẽ không chạy thật cho tới khi thêm key.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="text-sm text-gray-600">Chọn page</label>
          <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
            {pages.length === 0 && <option value="">(chưa có page)</option>}
            {pages.map((p) => <option key={p.id} value={p.id}>{p.name || p.externalId}</option>)}
          </select>
        </div>

        {loading ? <div className="text-sm text-gray-400">Đang tải…</div> : cfg && (
          <>
            <label className="flex items-center justify-between py-2 border-t border-gray-100">
              <span><span className="font-medium text-gray-800">Bật AI cho page này</span></span>
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="w-5 h-5" />
            </label>

            <div>
              <div className="text-sm font-medium text-gray-800 mb-1">Chế độ</div>
              <div className="space-y-2">
                {MODES.map((m) => (
                  <label key={m.v} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${cfg.mode === m.v ? 'border-[#3b5bdb] bg-blue-50' : 'border-gray-200'}`}>
                    <input type="radio" name="mode" checked={cfg.mode === m.v} onChange={() => set({ mode: m.v })} className="mt-1" />
                    <span><span className="font-medium text-gray-800">{m.label}</span><span className="block text-xs text-gray-500">{m.desc}</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">Persona / hướng dẫn AI (để trống = dùng mặc định của hệ thống)</label>
              <textarea value={cfg.persona || ''} onChange={(e) => set({ persona: e.target.value })} rows={5}
                placeholder="VD: Bạn là NV shop thời trang nữ. Giọng thân thiện, xưng em. Luôn nhắc lại đơn và xin xác nhận trước khi chốt…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
            </div>

            <div>
              <label className="text-sm text-gray-600">Trần token/ngày (để trống = không giới hạn)</label>
              <input type="number" value={cfg.dailyTokenCap ?? ''} onChange={(e) => set({ dailyTokenCap: e.target.value ? Number(e.target.value) : undefined })}
                className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 block" />
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => void save()} disabled={saving || !pageId} className="px-5 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
              {flash && <span className="text-sm text-gray-500">{flash}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

// Kết nối WhatsApp Business (WABA) — lưu token/WABA/Phone Number, xác minh qua Graph, gửi tin test.
// Token cần: whatsapp_business_management (quản lý WABA) + whatsapp_business_messaging (gửi/nhận tin).
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface WaStatus {
  connected: boolean;
  reason?: string;
  waba?: { id: string; name: string; reviewStatus: string | null };
  phones?: Array<{ id: string; number: string; name: string; quality: string | null }>;
  defaultPhoneNumberId?: string | null;
}
interface Integration { platform: string; shopId?: string | null; apiKey?: string | null; accessToken?: string | null; isActive?: boolean }

const inp = 'w-full rounded-[10px] border border-[#c7ced9] bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-[#2563eb] font-mono';
const card = 'bg-white border border-[#eceef2] rounded-[14px] p-6';

export default function WhatsappIntegrationPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [saving, setSaving] = useState(false);
  const [st, setSt] = useState<WaStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setChecking(true);
    try { setSt(await apiClientClient.get<WaStatus>('/integrations/whatsapp/status')); }
    catch (e) { setSt({ connected: false, reason: e instanceof Error ? e.message : 'Không kiểm tra được' }); }
    finally { setChecking(false); }
  }, []);

  useEffect(() => {
    apiClientClient.get<Integration[]>('/integrations')
      .then((list) => {
        const wa = list.find((i) => i.platform === 'WHATSAPP');
        if (wa) { setWabaId(wa.shopId || ''); setPhoneNumberId(wa.apiKey || ''); setHasSavedToken(!!wa.accessToken); }
      })
      .catch(() => {});
    void loadStatus();
  }, [loadStatus]);

  const save = async () => {
    if (!wabaId.trim()) { setMsg({ ok: false, text: 'Cần WABA ID.' }); return; }
    if (!hasSavedToken && !token.trim()) { setMsg({ ok: false, text: 'Cần Access Token.' }); return; }
    setSaving(true); setMsg(null);
    try {
      await apiClientClient.post('/integrations', {
        platform: 'WHATSAPP',
        shopId: wabaId.trim(),
        apiKey: phoneNumberId.trim(),
        ...(token.trim() ? { accessToken: token.trim() } : {}),
        isActive: true,
      });
      setToken(''); setHasSavedToken(true);
      setMsg({ ok: true, text: 'Đã lưu cấu hình — đang xác minh với Meta…' });
      await loadStatus();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Lưu thất bại' }); }
    finally { setSaving(false); }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return;
    setTesting(true); setMsg(null);
    try {
      const r = await apiClientClient.post<{ ok: boolean; messageId: string | null }>('/integrations/whatsapp/test-message', { to: testTo });
      setMsg({ ok: true, text: `✅ Đã gửi template hello_world — message id: ${r.messageId || '—'}. Kiểm tra WhatsApp trên máy nhận.` });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Gửi test thất bại' }); }
    finally { setTesting(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <button onClick={() => router.push('/admin/integrations')} className="mb-2 rounded-[9px] bg-[#f3f4f6] px-3.5 py-2 text-[13px] font-bold text-[#374151] hover:bg-[#e5e7eb]">← Kết nối</button>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827]">🟢 WhatsApp Business (WABA)</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">Token cần quyền <b>whatsapp_business_management</b> + <b>whatsapp_business_messaging</b> (App Meta → WhatsApp → API Setup, hoặc System User token).</p>
        </div>
      </div>

      {msg && <div className={`rounded-[10px] border px-4 py-2.5 text-[13px] ${msg.ok ? 'border-[#a7f3d0] bg-[#d1fae5] text-[#047857]' : 'border-[#fecaca] bg-[#fee2e2] text-[#dc2626]'}`}>{msg.text}</div>}

      {/* Cấu hình */}
      <div className={card}>
        <h3 className="mb-4 text-[15px] font-bold text-[#111827]">Cấu hình kết nối</h3>
        <div className="space-y-3.5">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-[#374151]">Access Token {hasSavedToken && <span className="ml-1 rounded-full bg-[#d1fae5] px-2 py-0.5 text-[10.5px] font-bold text-[#047857]">đã lưu — nhập để thay</span>}</label>
            <input type="password" className={inp} value={token} onChange={(e) => setToken(e.target.value)} placeholder={hasSavedToken ? '•••••••• (giữ token cũ nếu bỏ trống)' : 'EAAG…'} />
          </div>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-[#374151]">WABA ID <span className="text-[#dc2626]">*</span></label>
              <input className={inp} value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="102290129340398" />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-[#374151]">Phone Number ID</label>
              <input className={inp} value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="106540352242922" />
            </div>
          </div>
          <button onClick={() => void save()} disabled={saving} className="rounded-[10px] bg-[#16a34a] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#15803d] disabled:opacity-50">
            {saving ? 'Đang lưu…' : '💾 Lưu & xác minh'}
          </button>
        </div>
      </div>

      {/* Trạng thái kết nối */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#111827]">Trạng thái kết nối</h3>
          <button onClick={() => void loadStatus()} disabled={checking} className="rounded-[10px] border border-[#e5e7eb] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50">
            {checking ? 'Đang kiểm tra…' : '⟳ Kiểm tra lại'}
          </button>
        </div>
        {!st ? (
          <div className="text-[13px] text-[#9ca3af]">Đang tải…</div>
        ) : st.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13.5px]"><span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" /> <b>Đã kết nối:</b> {st.waba?.name} <span className="font-mono text-[11.5px] text-[#9ca3af]">({st.waba?.id})</span>{st.waba?.reviewStatus && <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] font-bold text-[#4338ca]">{st.waba.reviewStatus}</span>}</div>
            <table className="w-full border-collapse text-[13px]">
              <thead><tr className="bg-[#f9fafb]">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-[#6b7280]">Số điện thoại</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-[#6b7280]">Tên hiển thị</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-[#6b7280]">Phone Number ID</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-[#6b7280]">Chất lượng</th>
              </tr></thead>
              <tbody>
                {(st.phones || []).map((p) => (
                  <tr key={p.id} className="border-t border-[#f3f4f6]">
                    <td className="px-3 py-2 font-semibold">{p.number}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-[11.5px] text-[#6b7280]">{p.id}</td>
                    <td className="px-3 py-2">{p.quality || '—'}</td>
                  </tr>
                ))}
                {(st.phones || []).length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-center text-[#9ca3af]">WABA chưa có số điện thoại nào.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13.5px] text-[#dc2626]"><span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" /> Chưa kết nối — {st.reason}</div>
        )}
      </div>

      {/* Gửi tin test */}
      <div className={card}>
        <h3 className="mb-1 text-[15px] font-bold text-[#111827]">Gửi tin test (template hello_world)</h3>
        <p className="mb-3 text-[12.5px] text-[#6b7280]">App chưa Live/chưa duyệt quyền: chỉ gửi được tới <b>số test đã thêm & verify</b> trong App Meta → WhatsApp → API Setup. Nhập số dạng quốc tế (84…).</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <input className={`${inp} max-w-[260px]`} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="84912345678" />
          <button onClick={() => void sendTest()} disabled={testing || !testTo.trim()} className="rounded-[10px] bg-[#2563eb] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-50">
            {testing ? 'Đang gửi…' : '📨 Gửi test'}
          </button>
        </div>
      </div>
    </div>
  );
}

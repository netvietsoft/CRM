'use client';
export const dynamic = 'force-dynamic';

/* /ccm/marketing — Marketing Messages (Messenger):
 * 1. Danh sách khách ĐÃ OPT-IN nhận tin tiếp thị (webhook optin đổ về, khách STOP → OPTED_OUT).
 * 2. Tạo chiến dịch: tên + nội dung → chọn khách opt-in → Gửi (khách opt-out bị CHẶN).
 * 3. Danh sách chiến dịch: Sent / Delivered / Read / Failed theo receipt webhook.
 */
import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import StaffAvatar from '@/components/ui/StaffAvatar';

interface Optin {
  id: string; status: string; frequency: string | null; tokenExpiry: string | null; updatedAt: string; conversationId: string;
  page: { name: string | null };
  contact: { name: string | null; phone: string | null; avatarUrl: string | null };
}
interface Campaign {
  id: string; name: string; text: string; status: string; sentAt: string | null; createdAt: string;
  total: number; sent: number; delivered: number; read: number; failedCount: number;
}

const card = 'bg-white border border-[#e6e9f2] rounded-2xl p-5';
const inp = 'rounded-[10px] border border-[#c7ced9] bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-[#2563eb]';

function fmtTime(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.toLocaleTimeString('vi-VN', { hour12: false })} ${d.toLocaleDateString('vi-VN')}`;
}

export default function CcmMarketingPage() {
  const [optins, setOptins] = useState<Optin[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [os, cs] = await Promise.all([
        apiClientClient.get<Optin[]>('/messenger/marketing/optins'),
        apiClientClient.get<Campaign[]>('/messenger/marketing/campaigns'),
      ]);
      setOptins(os); setCampaigns(cs);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Không tải được dữ liệu' }); }
  }, []);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000);
    return () => window.clearInterval(t);
  }, [load]);

  const toggle = (id: string, status: string) => {
    if (status !== 'OPTED_IN') return; // opt-out không chọn được
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const send = async () => {
    if (!name.trim() || !text.trim() || selected.size === 0) { setMsg({ ok: false, text: 'Cần tên chiến dịch, nội dung và ít nhất 1 người nhận.' }); return; }
    setSending(true); setMsg(null);
    try {
      const r = await apiClientClient.post<{ sent: number; failed: number }>('/messenger/marketing/campaigns', {
        name: name.trim(), text: text.trim(), optinIds: [...selected],
      });
      setMsg({ ok: true, text: `✅ Đã gửi chiến dịch: ${r.sent} thành công, ${r.failed} lỗi/chặn.` });
      setName(''); setText(''); setSelected(new Set());
      await load();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Gửi chiến dịch thất bại' }); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">📣 Marketing Messages</h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">
          Mời khách nhận tin ở hội thoại (nút 📣) → khách bấm đồng ý sẽ xuất hiện ở đây → tạo chiến dịch gửi (khách hủy đăng ký bị CHẶN tự động).
        </p>
      </div>
      {msg && <div className={`rounded-[10px] border px-4 py-2.5 text-[13px] ${msg.ok ? 'border-[#a7f3d0] bg-[#d1fae5] text-[#047857]' : 'border-[#fecaca] bg-[#fee2e2] text-[#dc2626]'}`}>{msg.text}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Khách đã opt-in */}
        <div className={card}>
          <h3 className="text-[15px] font-extrabold">Khách đã đăng ký nhận tin ({optins.filter((o) => o.status === 'OPTED_IN').length})</h3>
          <p className="mb-3 mt-0.5 text-[12px] text-[#6b7280]">Tick chọn người nhận cho chiến dịch. Khách opt-out hiện mờ, không chọn được.</p>
          {optins.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#9ca3af]">Chưa có khách nào opt-in — vào hội thoại bấm nút 📣 để gửi lời mời.</div>
          ) : (
            <div className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
              {optins.map((o) => (
                <label key={o.id} className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2 ${o.status === 'OPTED_IN' ? 'cursor-pointer border-[#e6e9f2] hover:bg-[#f5f7ff]' : 'opacity-50 border-[#f1f5f9]'} ${selected.has(o.id) ? 'border-[#3c55e6] bg-[#eef2ff]' : ''}`}>
                  <input type="checkbox" disabled={o.status !== 'OPTED_IN'} checked={selected.has(o.id)} onChange={() => toggle(o.id, o.status)} className="h-4 w-4 accent-[#3c55e6]" />
                  <StaffAvatar src={o.contact.avatarUrl} name={o.contact.name || o.contact.phone} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{o.contact.name || o.contact.phone || 'Khách'}</span>
                    <span className="block text-[11px] text-[#9ca3af]">{o.page.name} · {fmtTime(o.updatedAt)}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${o.status === 'OPTED_IN' ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>
                    {o.status === 'OPTED_IN' ? 'Đã đồng ý' : 'Đã hủy nhận tin'}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Tạo chiến dịch */}
        <div className={card}>
          <h3 className="mb-3 text-[15px] font-extrabold">Tạo chiến dịch</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#374151]">Tên chiến dịch <span className="text-[#dc2626]">*</span></label>
              <input className={`${inp} w-full`} value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Summer Product Update" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#374151]">Nội dung tin <span className="text-[#dc2626]">*</span></label>
              <textarea rows={4} className={`${inp} w-full`} value={text} onChange={(e) => setText(e.target.value)}
                placeholder="VD: Our new summer collection is now available. Tap below to view the collection." />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-[#6b7280]">Đã chọn <b>{selected.size}</b> người nhận (chỉ khách còn opt-in)</span>
              <button onClick={() => void send()} disabled={sending || selected.size === 0 || !name.trim() || !text.trim()}
                className="rounded-[10px] bg-[#4f68ee] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#3c55e6] disabled:opacity-50">
                {sending ? 'Đang gửi…' : '📨 Gửi chiến dịch'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách chiến dịch */}
      <div className={card}>
        <h3 className="mb-3 text-[15px] font-extrabold">Chiến dịch đã gửi</h3>
        {campaigns.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-[#9ca3af]">Chưa có chiến dịch nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-[#6b7280]">Chiến dịch</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-[#6b7280]">Nội dung</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-[#6b7280]">Gửi lúc</th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-[#6b7280]">Sent</th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-[#6b7280]">Delivered</th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-[#6b7280]">Read</th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-[#6b7280]">Lỗi/Chặn</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id} className={`border-t border-[#f1f5f9] ${i % 2 === 1 ? 'bg-[#f9fafb]' : ''}`}>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{c.name}</td>
                    <td className="max-w-[280px] truncate px-3 py-2.5 text-[#4b5563]" title={c.text}>{c.text}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-[#6b7280]">{fmtTime(c.sentAt)}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#1d4ed8]">{c.sent}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#047857]">{c.delivered}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#7c3aed]">{c.read}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#dc2626]">{c.failedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

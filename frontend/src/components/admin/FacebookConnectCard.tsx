'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface FbConnection {
  id: string; fbUserId: string; fbName: string | null; status: string;
  tokenExpiresAt: string | null; lastRefreshAt: string | null; createdAt: string;
}

const fmt = (s: string | null) => { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false }); };

export default function FacebookConnectCard() {
  const [conns, setConns] = useState<FbConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const flash = (m: string, ms = 7000) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); };

  const load = useCallback(async () => {
    try { setConns(await apiClientClient.get<FbConnection[]>('/integrations/facebook/connections')); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  // Đọc kết quả callback (?fb=ok|error) khi FB redirect về.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fb = q.get('fb');
    if (fb === 'ok') flash(`Kết nối Facebook thành công: ${q.get('biz') || 0} BM · ${q.get('acc') || 0} tài khoản QC · ${q.get('page') || 0} page.`);
    else if (fb === 'error') flash(`Lỗi kết nối Facebook: ${q.get('msg') || 'không rõ'}`);
    if (fb) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const connect = async () => {
    try {
      const r = await apiClientClient.get<{ url: string }>('/integrations/facebook/oauth/start');
      if (r?.url) window.location.href = r.url;
    } catch (e) { flash(e instanceof Error ? e.message : 'Không tạo được link đăng nhập Facebook'); }
  };
  const disconnect = async (id: string) => {
    if (!window.confirm('Gỡ kết nối này?')) return;
    try { await apiClientClient.delete(`/integrations/facebook/connections/${id}`); await load(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi gỡ'); }
  };
  const refresh = async (id: string) => {
    try { await apiClientClient.post(`/integrations/facebook/connections/${id}/refresh`, {}); await load(); flash('Đã làm mới token.'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi làm mới'); }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-blue-600 text-white grid place-items-center text-xl">f</span>
          <div>
            <h3 className="font-semibold text-gray-800">Kết nối Facebook (OAuth · đa BM)</h3>
            <p className="text-sm text-gray-500">Đăng nhập FB → tự kéo tất cả BM / tài khoản QC / Page. Token lưu mã hoá.</p>
          </div>
        </div>
        <button onClick={connect} className="px-4 py-2 rounded-lg bg-[#1877f2] text-white text-sm font-semibold hover:bg-[#0f66d0]">
          🔗 Kết nối Facebook
        </button>
      </div>

      {msg && <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">{msg}</div>}

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-400">Đang tải…</div>
        ) : conns.length === 0 ? (
          <div className="text-sm text-gray-400">Chưa có kết nối OAuth nào. (Vẫn có thể dán System User token ở thẻ Meta Ads bên dưới.)</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {conns.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-gray-800">{c.fbName || c.fbUserId}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                  </div>
                  <div className="text-xs text-gray-400">Hết hạn: {fmt(c.tokenExpiresAt)} · Làm mới: {fmt(c.lastRefreshAt)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => refresh(c.id)} className="px-2.5 py-1 rounded-lg border border-gray-300 text-xs hover:bg-gray-50">Làm mới</button>
                  <button onClick={() => disconnect(c.id)} className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 text-xs hover:bg-red-50">Gỡ</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

      {/* Trung tâm hỗ trợ duyệt Meta App Review */}
      <div className="mt-5 pt-4 border-t border-blue-50">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🎬</span>
            <h4 className="text-sm font-bold text-gray-800">Bộ Công Cụ Quay Video Duyệt Meta App Review</h4>
          </div>
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            Chuẩn bị xét duyệt lại
          </span>
        </div>

        <p className="text-xs text-gray-600 mb-3">
          Để quay video đạt chuẩn Meta (Facebook), mở song song CRM và cửa sổ Facebook cá nhân. Dùng các phím tắt bên dưới để truy cập nhanh trang demo:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
          <a
            href="/admin/messenger"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-left transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <span>💬</span> <span>Hộp thư Messenger</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Quay quyền <strong>pages_messaging</strong> (Chat 2 chiều realtime)</div>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold mt-2 inline-block">Mở giao diện →</span>
          </a>

          <a
            href="/admin/adsmeta/accall"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-left transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <span>📊</span> <span>Báo cáo Ads Meta</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Quay quyền <strong>ads_read</strong> (Đọc KPI, chi tiêu, ROAS)</div>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold mt-2 inline-block">Mở giao diện →</span>
          </a>

          <a
            href="/ccm/marketing"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-left transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <span>📣</span> <span>Marketing Messages</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Quay quyền <strong>marketing_messages</strong> (Opt-in và chiến dịch)</div>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold mt-2 inline-block">Mở giao diện →</span>
          </a>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3 space-y-2 text-xs text-gray-700">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">📋 Văn bản mô tả use-case tiếng Anh (sao chép nộp Meta):</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const text = `Our CRM is a multi-channel customer support platform. Customer service agents use the CRM Messenger Inbox to receive customer inquiries sent to our Facebook Pages in real-time and send direct replies to assist customers with product consultation, order placement, and support. This permission is required for real-time bidirectional messaging between our Facebook Pages and customers.\n\nInstructions for reviewer:\n1. Log in to CRM dashboard using provided test credentials.\n2. Open Messenger Inbox at /admin/messenger.\n3. Send a test message from a Facebook user to our connected Page.\n4. Notice the incoming message appearing in the CRM inbox in real-time.\n5. Reply directly from CRM and verify delivery to the customer on Messenger.`;
                  void navigator.clipboard.writeText(text);
                  flash('Đã sao chép mô tả quyền pages_messaging!', 3000);
                }}
                className="px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-medium"
              >
                Copy pages_messaging
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = `Our CRM provides a direct product catalog synchronization engine (/admin/integrations). We use catalog_management to query merchant catalogs and push batch product updates (SKU, title, price, stock status, image link, product url) from our CRM database directly to Meta Commerce Manager using the /{catalog_id}/items_batch Graph API. This allows merchants to maintain unified inventory between CRM and Meta Shop.\n\nInstructions for reviewer:\n1. Log in to CRM dashboard.\n2. Navigate to /admin/integrations and open Meta Commerce Catalog.\n3. Verify connected Catalog ID or select a catalog.\n4. Click "Đồng bộ ngay (Sync Now)" to push product feed directly to Meta Commerce Catalog via items_batch API.`;
                  void navigator.clipboard.writeText(text);
                  flash('Đã sao chép mô tả quyền catalog_management!', 3000);
                }}
                className="px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-medium text-indigo-700"
              >
                Copy catalog_management
              </button>
            </div>
          </div>
          <div className="text-[11px] text-emerald-800 bg-emerald-50/70 rounded-lg p-2 border border-emerald-200/50">
            ✅ <strong>Quyền catalog_management:</strong> CRM đã tích hợp trực tiếp module <em>Meta Commerce Catalog Sync</em> (Batch API). Bạn có thể quay video tính năng này ngay bên dưới để Meta duyệt quyền này. Chỉ cần bỏ tick quyền <code>paid_marketing_messages</code> (vì CRM không chạy sponsored ad messaging).
          </div>
        </div>
      </div>
    </div>
  );
}

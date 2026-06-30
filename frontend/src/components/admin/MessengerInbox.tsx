'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { apiClientClient } from '@/lib/apiClientClient';

interface MsgPage { id: string; externalId: string; name: string | null; subscribed: boolean; }
interface Conversation {
  id: string; pageId: string; unreadCount: number;
  lastMessageAt: string | null; lastMessageText: string | null; lastMessageDir: string | null;
  contact: { psid: string; name: string | null; avatarUrl: string | null };
  page: { name: string | null; externalId: string };
}
interface Message {
  id: string; direction: 'IN' | 'OUT'; text: string | null; attachments: unknown;
  status: string | null; sentByUserId: string | null; createdAt: string;
}

const fmtTime = (s: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { hour12: false });
};

export default function MessengerInbox() {
  const [pages, setPages] = useState<MsgPage[]>([]);
  const [pageId, setPageId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef('');
  activeIdRef.current = activeId;

  const flash = (m: string, ms = 5000) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); };

  const loadPages = useCallback(async () => {
    try { setPages(await apiClientClient.get<MsgPage[]>('/messenger/pages')); } catch { /* ignore */ }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const qs = pageId ? `?pageId=${pageId}` : '';
      setConversations(await apiClientClient.get<Conversation[]>(`/messenger/conversations${qs}`));
    } catch (e) { flash(e instanceof Error ? e.message : 'Lỗi tải hội thoại'); }
  }, [pageId]);

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    try {
      const list = await apiClientClient.get<Message[]>(`/messenger/conversations/${id}/messages`);
      setMessages(list);
      await apiClientClient.post(`/messenger/conversations/${id}/read`, {});
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    } catch (e) { flash(e instanceof Error ? e.message : 'Lỗi tải tin nhắn'); }
  }, []);

  useEffect(() => { void loadPages(); }, [loadPages]);
  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => { threadRef.current?.scrollTo(0, threadRef.current.scrollHeight); }, [messages]);

  // Realtime: nghe 'messenger:message' → reload danh sách + thread đang mở.
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3901/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    const socket: Socket = io(`${baseUrl}/admin`, { transports: ['polling'], reconnection: true, withCredentials: true });
    socket.on('messenger:message', (p: { conversationId: string }) => {
      void loadConversations();
      if (p.conversationId === activeIdRef.current) void apiClientClient.get<Message[]>(`/messenger/conversations/${p.conversationId}/messages`).then(setMessages).catch(() => {});
    });
    socket.on('connect_error', () => {});
    return () => { socket.disconnect(); };
  }, [loadConversations]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setSending(true);
    try {
      await apiClientClient.post(`/messenger/conversations/${activeId}/reply`, { text });
      setDraft('');
      const list = await apiClientClient.get<Message[]>(`/messenger/conversations/${activeId}/messages`);
      setMessages(list);
      void loadConversations();
    } catch (e) { flash(e instanceof Error ? e.message : 'Gửi thất bại'); }
    finally { setSending(false); }
  };

  const register = async () => {
    try { const r = await apiClientClient.post<{ registered: number }>('/messenger/pages/register', {}); flash(`Đã đăng ký ${r.registered} page có quyền nhắn tin.`); await loadPages(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi đăng ký page'); }
  };
  const subscribe = async (externalId: string) => {
    try { const r = await apiClientClient.post<{ subscribed: boolean }>(`/messenger/pages/${externalId}/subscribe`, {}); flash(r.subscribed ? 'Đã bật webhook cho page.' : 'Không bật được webhook (kiểm quyền/token).'); await loadPages(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi subscribe'); }
  };
  const backfill = async (externalId: string) => {
    try { const r = await apiClientClient.post<{ conversations: number; messages: number }>(`/messenger/pages/${externalId}/backfill`, {}); flash(`Kéo ${r.conversations} hội thoại, ${r.messages} tin.`); await loadConversations(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi backfill'); }
  };

  const active = conversations.find((c) => c.id === activeId);
  const selectedPage = pages.find((p) => p.id === pageId) || pages.find((p) => p.externalId === active?.page.externalId);

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800">Tin nhắn</h1>
        <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Tất cả page</option>
          {pages.map((p) => <option key={p.id} value={p.id}>{p.name || p.externalId}{p.subscribed ? '' : ' (chưa bật webhook)'}</option>)}
        </select>
        <button onClick={register} className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm hover:bg-gray-50">Đăng ký page</button>
        {selectedPage && <button onClick={() => subscribe(selectedPage.externalId)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm hover:bg-gray-50">Bật webhook</button>}
        {selectedPage && <button onClick={() => backfill(selectedPage.externalId)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm hover:bg-gray-50">Kéo lịch sử</button>}
        {msg && <span className="text-sm text-blue-700">{msg}</span>}
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-3 h-[calc(100vh-160px)]">
        {/* Danh sách hội thoại */}
        <div className="rounded-xl border border-gray-100 bg-white overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Chưa có hội thoại. Bật webhook / kéo lịch sử cho page.</div>
          ) : conversations.map((c) => (
            <button key={c.id} onClick={() => openConversation(c.id)}
              className={`w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-blue-50/50 ${activeId === c.id ? 'bg-blue-50' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-800 truncate">{c.contact.name || c.contact.psid}</span>
                {c.unreadCount > 0 && <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[11px]">{c.unreadCount}</span>}
              </div>
              <div className="text-xs text-gray-500 truncate">{c.lastMessageDir === 'OUT' ? 'Bạn: ' : ''}{c.lastMessageText || ''}</div>
              <div className="text-[11px] text-gray-300">{c.page.name || c.page.externalId} · {fmtTime(c.lastMessageAt)}</div>
            </button>
          ))}
        </div>

        {/* Thread + composer */}
        <div className="rounded-xl border border-gray-100 bg-white flex flex-col">
          {!active ? (
            <div className="flex-1 grid place-items-center text-gray-400 text-sm">Chọn một hội thoại để xem</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">{active.contact.name || active.contact.psid}</div>
              <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/40">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${m.direction === 'OUT' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      {m.text || <span className="italic opacity-70">[đính kèm]</span>}
                      <div className={`text-[10px] mt-1 ${m.direction === 'OUT' ? 'text-blue-100' : 'text-gray-400'}`}>{fmtTime(m.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100 flex gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void send())}
                  placeholder="Nhập tin nhắn… (Enter để gửi)" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => void send()} disabled={sending || !draft.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Gửi</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

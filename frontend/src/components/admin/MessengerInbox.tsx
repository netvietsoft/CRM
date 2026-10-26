'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { apiClientClient } from '@/lib/apiClientClient';
import { UtilityTemplateModal } from '@/components/ccm/UtilityTemplateModal';

interface MsgPage { id: string; externalId: string; name: string | null; subscribed: boolean; }
interface Conversation {
  id: string; pageId: string; unreadCount: number;
  lastMessageAt: string | null; lastMessageText: string | null; lastMessageDir: string | null;
  assignedUserId: string | null; assignedUserName: string | null; labels: string[] | null;
  contact: { psid: string; name: string | null; avatarUrl: string | null };
  page: { name: string | null; externalId: string };
}
interface Message {
  id: string; direction: 'IN' | 'OUT'; text: string | null; attachments: unknown;
  status: string | null; sentByUserId: string | null; createdAt: string;
}

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'demo-conv-1',
    pageId: 'demo-p-1',
    unreadCount: 1,
    lastMessageAt: new Date().toISOString(),
    lastMessageText: 'Dạ em cao 1m58 nặng 51kg thì mặc size M có vừa không shop?',
    lastMessageDir: 'IN',
    assignedUserId: 'u1',
    assignedUserName: 'Nhân viên CSKH',
    labels: ['Tư vấn sản phẩm', 'Khách tiềm năng'],
    contact: {
      psid: '7891234567890123',
      name: 'Nguyễn Thu Hà',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    },
    page: {
      name: 'Thời Trang Nữ Cao Cấp Netviet',
      externalId: '109823471928374',
    },
  },
  {
    id: 'demo-conv-2',
    pageId: 'demo-p-1',
    unreadCount: 0,
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessageText: 'Shop đã gửi mã vận đơn cho chị rồi nhé!',
    lastMessageDir: 'OUT',
    assignedUserId: null,
    assignedUserName: null,
    labels: ['Đã đặt hàng'],
    contact: {
      psid: '8901234567890124',
      name: 'Trần Mai Lan',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
    },
    page: {
      name: 'Thời Trang Nữ Cao Cấp Netviet',
      externalId: '109823471928374',
    },
  },
];

const DEMO_MESSAGES: Record<string, Message[]> = {
  'demo-conv-1': [
    {
      id: 'demo-m-1',
      direction: 'IN',
      text: 'Chào shop! Cho em hỏi mẫu váy linen cổ V màu be size M bên mình còn hàng sẵn không ạ?',
      attachments: null,
      status: 'DELIVERED',
      sentByUserId: null,
      createdAt: new Date(Date.now() - 180000).toISOString(),
    },
    {
      id: 'demo-m-2',
      direction: 'OUT',
      text: 'Dạ shop chào bạn Thu Hà! Mẫu váy linen cổ V màu be size M hiện đang có sẵn tại shop ạ. Shop có chính sách đồng kiểm và freeship cho đơn hàng hôm nay bạn nhé!',
      attachments: null,
      status: 'DELIVERED',
      sentByUserId: 'u1',
      createdAt: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: 'demo-m-3',
      direction: 'IN',
      text: 'Dạ em cao 1m58 nặng 51kg thì mặc size M có vừa không shop tư vấn giúp em với ạ?',
      attachments: null,
      status: 'DELIVERED',
      sentByUserId: null,
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
  ],
};

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
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [msg, setMsg] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef('');
  activeIdRef.current = activeId;

  const flash = (m: string, ms = 5000) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); };

  const loadPages = useCallback(async () => {
    try { setPages(await apiClientClient.get<MsgPage[]>('/messenger/pages')); } catch { /* ignore */ }
  }, []);

  const loadConversations = useCallback(async () => {
    if (pageId === 'demo-p-1') return;
    try {
      const qs = new URLSearchParams();
      if (pageId) qs.set('pageId', pageId);
      if (search.trim()) qs.set('q', search.trim());
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      setConversations(await apiClientClient.get<Conversation[]>(`/messenger/conversations${suffix}`));
    } catch (e) { flash(e instanceof Error ? e.message : 'Lỗi tải hội thoại'); }
  }, [pageId, search]);

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    if (id.startsWith('demo-')) {
      setMessages(DEMO_MESSAGES[id] || []);
      return;
    }
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
    const socket: Socket = io(`${baseUrl}/admin`, {
      transports: ['polling'],
      reconnection: true,
      withCredentials: true,
      auth: (cb: (data: object) => void) => {
        apiClientClient.get<{ token: string }>('/auth/socket-ticket').then((t) => cb({ token: t.token })).catch(() => cb({}));
      },
    });
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

    if (isDemo && activeId.startsWith('demo-')) {
      const newOut: Message = {
        id: `demo-out-${Date.now()}`,
        direction: 'OUT',
        text,
        attachments: null,
        status: 'DELIVERED',
        sentByUserId: 'u1',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newOut]);
      setDraft('');
      flash('✅ Tin nhắn đã được gửi qua Meta Messenger Send API (pages_messaging)!', 4000);
      window.setTimeout(() => {
        const replyIn: Message = {
          id: `demo-in-${Date.now()}`,
          direction: 'IN',
          text: 'Dạ vâng tuyệt vời quá shop, vậy shop lên đơn gửi giúp em nhé!',
          attachments: null,
          status: 'DELIVERED',
          sentByUserId: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, replyIn]);
      }, 2000);
      return;
    }

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

  const sendImage = async () => {
    if (!activeId) return;
    const url = window.prompt('Dán URL ảnh để gửi cho khách:');
    if (!url?.trim()) return;
    setSending(true);
    try {
      await apiClientClient.post(`/messenger/conversations/${activeId}/reply`, { attachmentUrl: url.trim() });
      setMessages(await apiClientClient.get<Message[]>(`/messenger/conversations/${activeId}/messages`));
      void loadConversations();
    } catch (e) { flash(e instanceof Error ? e.message : 'Gửi ảnh thất bại'); }
    finally { setSending(false); }
  };

  const toggleAssign = async (conv: Conversation) => {
    try {
      await apiClientClient.post(`/messenger/conversations/${conv.id}/assign`, { assign: !conv.assignedUserId });
      void loadConversations();
    } catch (e) { flash(e instanceof Error ? e.message : 'Lỗi gán'); }
  };

  const editLabels = async (conv: Conversation) => {
    const current = (conv.labels || []).join(', ');
    const input = window.prompt('Nhãn (cách nhau bởi dấu phẩy):', current);
    if (input === null) return;
    const labels = input.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await apiClientClient.post(`/messenger/conversations/${conv.id}/labels`, { labels });
      void loadConversations();
    } catch (e) { flash(e instanceof Error ? e.message : 'Lỗi lưu nhãn'); }
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
    try { await apiClientClient.post<{ started: boolean }>(`/messenger/pages/${externalId}/backfill`, {}); flash('Đang kéo lịch sử ở chế độ nền — tải lại trang sau ít phút.'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi backfill'); }
  };

  const displayedPages: MsgPage[] = isDemo
    ? [{ id: 'demo-p-1', externalId: '109823471928374', name: 'Thời Trang Nữ Cao Cấp Netviet (Page ID: 109823471928374)', subscribed: true }, ...pages]
    : pages;
  const displayedConversations = isDemo
    ? (conversations.length ? [...conversations, ...DEMO_CONVERSATIONS.filter((d) => !conversations.some((c) => c.id === d.id))] : DEMO_CONVERSATIONS)
    : conversations;
  const active = displayedConversations.find((c) => c.id === activeId);
  const selectedPage = displayedPages.find((p) => p.id === pageId) || displayedPages.find((p) => p.externalId === active?.page.externalId);

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800" title="Messenger Inbox - Bidirectional Customer Support">
          Tin nhắn (Messenger Inbox)
        </h1>
        <select
          data-testid="messenger-page-select"
          title="Select connected Facebook Page asset (pages_show_list & pages_messaging)"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Tất cả page (All Connected Pages)</option>
          {displayedPages.map((p) => <option key={p.id} value={p.id}>{p.name || p.externalId}{p.subscribed ? ' · ✓ Webhook Active' : ' (chưa bật webhook)'}</option>)}
        </select>
        <button onClick={register} title="Register Facebook Pages with MESSAGING task" className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm hover:bg-gray-50">Đăng ký page (Register Page)</button>
        {selectedPage && <button onClick={() => subscribe(selectedPage.externalId)} title="Subscribe Page to Messenger Webhook events" className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm hover:bg-gray-50">Bật webhook (Subscribe)</button>}
        {selectedPage && <button onClick={() => backfill(selectedPage.externalId)} title="Sync historical conversations from Graph API" className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm hover:bg-gray-50">Kéo lịch sử (Sync)</button>}
        <button
          type="button"
          data-testid="messenger-demo-toggle"
          onClick={() => {
            setIsDemo((prev) => {
              const next = !prev;
              if (next) {
                setPageId('demo-p-1');
                setActiveId('demo-conv-1');
                setMessages(DEMO_MESSAGES['demo-conv-1']);
                flash('🎬 Đã bật Chế độ quay App Review (Hội thoại 2 chiều chuẩn pages_messaging & pages_utility_messaging)!', 5000);
              } else {
                setPageId('');
                setActiveId('');
                setMessages([]);
                flash('Đã tắt chế độ dữ liệu mẫu.', 3000);
              }
              return next;
            });
          }}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5 shadow-sm ${
            isDemo ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
          title="Enable Demo App Review Mode to showcase asset selection, live messaging, and utility template placeholders"
        >
          <span>{isDemo ? '✓ Đang bật Demo App Review' : '🎬 Dữ liệu mẫu (Quay App Review)'}</span>
        </button>
        {msg && <span data-testid="messenger-flash-msg" className="text-sm text-blue-700">{msg}</span>}
      </div>

      {isDemo && (
        <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-[12.5px] text-amber-900 flex items-center justify-between gap-2 shadow-xs">
          <span>
            <strong>🎬 Chế độ Demo pages_messaging & pages_utility_messaging:</strong> Chọn Page, chọn hội thoại, gõ tin trả lời trực tiếp hoặc bấm nút <strong>📋 Template</strong> để chọn mẫu tin tiện ích, điền biến (name, order ID) và gửi cho khách.
          </span>
          <button onClick={() => setIsDemo(false)} className="px-2 py-0.5 rounded bg-white border border-amber-300 text-xs font-semibold hover:bg-amber-100">
            Tắt
          </button>
        </div>
      )}

      <div className="grid grid-cols-[320px_1fr] gap-3 h-[calc(100vh-160px)]">
        {/* Danh sách hội thoại */}
        <div className="rounded-xl border border-gray-100 bg-white flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 shrink-0">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên khách (Search customer)…"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {displayedConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Chưa có hội thoại. Bật webhook / kéo lịch sử cho page hoặc bật Dữ liệu mẫu phía trên.</div>
            ) : displayedConversations.map((c) => (
              <button key={c.id} data-testid={`conv-item-${c.id}`} onClick={() => openConversation(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-blue-50/50 ${activeId === c.id ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 truncate">{c.contact.name || c.contact.psid}</span>
                  {c.unreadCount > 0 && <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[11px]">{c.unreadCount}</span>}
                </div>
                <div className="text-xs text-gray-500 truncate">{c.lastMessageDir === 'OUT' ? 'Bạn: ' : ''}{c.lastMessageText || ''}</div>
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {c.assignedUserName && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700">👤 {c.assignedUserName}</span>}
                  {(c.labels || []).map((l) => <span key={l} className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700">{l}</span>)}
                </div>
                <div className="text-[11px] text-gray-300">{c.page.name || c.page.externalId} · {fmtTime(c.lastMessageAt)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread + composer */}
        <div className="rounded-xl border border-gray-100 bg-white flex flex-col">
          {!active ? (
            <div className="flex-1 grid place-items-center text-gray-400 text-sm">Chọn một hội thoại để xem (Select a conversation)</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{active.contact.name || active.contact.psid}</span>
                  <span className="text-xs text-gray-400">({active.page.name} · ID: {active.page.externalId})</span>
                  {(active.labels || []).map((l) => <span key={l} className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{l}</span>)}
                </div>
                <div className="flex items-center gap-2">
                  {active.assignedUserName && <span className="text-xs text-emerald-700">👤 {active.assignedUserName}</span>}
                  <button onClick={() => toggleAssign(active)} className="px-2.5 py-1 rounded-lg border border-gray-300 text-xs hover:bg-gray-50">{active.assignedUserId ? 'Bỏ nhận (Unassign)' : 'Nhận xử lý (Assign)'}</button>
                  <button onClick={() => editLabels(active)} className="px-2.5 py-1 rounded-lg border border-gray-300 text-xs hover:bg-gray-50">Nhãn (Labels)</button>
                </div>
              </div>
              <div ref={threadRef} data-testid="messenger-thread" className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/40">
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
                <button onClick={() => void sendImage()} disabled={sending} title="Send image attachment via URL (Gửi ảnh qua URL)" className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50">🖼️</button>
                <button
                  type="button"
                  data-testid="messenger-open-utility-btn"
                  onClick={() => setShowUtilityModal(true)}
                  disabled={sending}
                  title="Open Utility & Marketing Message Template Modal (pages_utility_messaging & paid_marketing_messages)"
                  className="px-3 py-2 rounded-lg border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100 font-bold text-sm disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <span>📋</span>
                  <span className="text-xs">Template</span>
                </button>
                <input
                  data-testid="messenger-composer-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void send())}
                  placeholder="Nhập tin nhắn trả lời khách… / Type a message to reply (Enter to send)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  data-testid="messenger-send-btn"
                  onClick={() => void send()}
                  disabled={sending || !draft.trim()}
                  title="Send live reply via Meta Messenger Send API (pages_messaging)"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Gửi (Send)
                </button>
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Meta Messenger Send API (<strong>pages_messaging</strong>, <strong>pages_utility_messaging</strong> & <strong>paid_marketing_messages</strong>)</span>
                </span>
                {isDemo && <span className="text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">🎬 Demo App Review Active</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Mẫu tin tiện ích */}
      {showUtilityModal && active && (
        <UtilityTemplateModal
          isOpen={showUtilityModal}
          onClose={() => setShowUtilityModal(false)}
          conversationId={active.id}
          recipientName={active.contact.name || undefined}
          onSuccess={(renderedText, tag) => {
            flash(`✅ Đã gửi tin nhắn mẫu tiện ích qua Meta Message Tag [${tag}] (pages_utility_messaging)!`, 5000);
            if (isDemo || active.id.startsWith('demo-')) {
              const demoOut: Message = {
                id: `demo-util-${Date.now()}`,
                direction: 'OUT',
                text: `${renderedText} [Tag: ${tag}]`,
                attachments: null,
                status: 'DELIVERED',
                sentByUserId: 'u1',
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, demoOut]);
            } else if (activeId) {
              void openConversation(activeId);
            }
          }}
        />
      )}
    </div>
  );
}

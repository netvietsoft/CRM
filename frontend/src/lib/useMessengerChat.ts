'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { apiClientClient } from '@/lib/apiClientClient';
import { getPrefs } from '@/lib/useCcmSettings';
import { playSound } from '@/lib/ccmSounds';

// Hook chung cho hộp thư Messenger (dùng bởi /admin/messenger và /ccm/conversations).
// Bọc toàn bộ state + gọi API /messenger/* + realtime; UI tự do render.

export interface MsgPage { id: string; externalId: string; name: string | null; subscribed: boolean }
export interface StaffMember { id: string; name: string | null; phone: string | null; avatarUrl?: string | null }
export interface Conversation {
  id: string; pageId: string; unreadCount: number;
  lastMessageAt: string | null; lastMessageText: string | null; lastMessageDir: string | null;
  assignedUserId: string | null; assignedUserName: string | null; assignedUserAvatar: string | null; labels: string[] | null; star: string | null;
  contact: { psid: string; name: string | null; phone: string | null; avatarUrl: string | null; dob: string | null; gender: string | null };
  page: { name: string | null; externalId: string };
}
export interface Message {
  id: string; direction: 'IN' | 'OUT'; text: string | null; attachments: unknown;
  status: string | null; sentByUserId: string | null; createdAt: string;
}

const PAGE_DEFAULT_KEY = 'ccm_page_default';

export function useMessengerChat() {
  const [pages, setPages] = useState<MsgPage[]>([]);
  // Page mặc định: nhớ lựa chọn lần trước (localStorage) — vào lại không phải chọn lại.
  const [pageId, setPageIdRaw] = useState(() => {
    try { return localStorage.getItem(PAGE_DEFAULT_KEY) || ''; } catch { return ''; }
  });
  const setPageId = useCallback((v: string) => {
    setPageIdRaw(v);
    try { localStorage.setItem(PAGE_DEFAULT_KEY, v); } catch { /* ignore */ }
  }, []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msg, setMsg] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const activeIdRef = useRef('');
  activeIdRef.current = activeId;

  const flash = useCallback((m: string, ms = 5000) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); }, []);

  const loadPages = useCallback(async () => {
    try { setPages(await apiClientClient.get<MsgPage[]>('/messenger/pages')); } catch { /* ignore */ }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (pageId) qs.set('pageId', pageId);
      if (search.trim()) qs.set('q', search.trim());
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      setConversations(await apiClientClient.get<Conversation[]>(`/messenger/conversations${suffix}`));
    } catch (e) { flash(e instanceof Error ? e.message : 'Lỗi tải hội thoại'); }
  }, [pageId, search, flash]);

  const open = useCallback(async (id: string) => {
    setActiveId(id);
    setLoadingMsgs(true);
    try {
      setMessages(await apiClientClient.get<Message[]>(`/messenger/conversations/${id}/messages`));
      await apiClientClient.post(`/messenger/conversations/${id}/read`, {});
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    } catch (e) { flash(e instanceof Error ? e.message : 'Lỗi tải tin nhắn'); }
    finally { setLoadingMsgs(false); }
  }, [flash]);

  useEffect(() => { void loadPages(); }, [loadPages]);
  useEffect(() => { void loadConversations(); }, [loadConversations]);

  // Lưới an toàn realtime: tự đồng bộ NỀN mỗi 12s (webhook/Meta có thể trễ) — list + thread đang mở.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return; // tab ẩn thì thôi, đỡ tốn
      void loadConversations();
      const id = activeIdRef.current;
      if (id) void apiClientClient.get<Message[]>(`/messenger/conversations/${id}/messages`).then(setMessages).catch(() => {});
    }, 12000);
    return () => window.clearInterval(t);
  }, [loadConversations]);

  // Realtime: tin mới → reload list + thread đang mở.
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3901/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    const socket: Socket = io(`${baseUrl}/admin`, {
      transports: ['polling'],
      reconnection: true,
      withCredentials: true,
      // nginx prod không forward Cookie tới /socket.io → xác thực bằng vé 60s xin qua API.
      // auth dạng hàm = socket.io gọi lại MỖI lần reconnect → vé luôn mới (kiêm luôn refresh cookie hết hạn).
      auth: (cb) => {
        apiClientClient.get<{ token: string }>('/auth/socket-ticket').then((t) => cb({ token: t.token })).catch(() => cb({}));
      },
    });
    socket.on('messenger:message', (p: { conversationId: string; direction?: string }) => {
      // Phát âm thông báo CHỈ khi có TIN ĐẾN (không kêu cho tin gửi đi / event ENRICH avatar / ASSIGN).
      const pr = getPrefs();
      if (pr.sound && p.direction === 'IN') void playSound(pr.newMsgSound);
      void loadConversations();
      if (p.conversationId === activeIdRef.current) {
        void apiClientClient.get<Message[]>(`/messenger/conversations/${p.conversationId}/messages`).then(setMessages).catch(() => {});
      }
    });
    socket.on('messenger:backfill', (p: { conversations: number; messages: number }) => {
      flash(`✅ Kéo xong lịch sử: ${p.conversations} hội thoại, ${p.messages} tin mới.`, 10000);
      void loadPages();
      void loadConversations();
    });
    socket.on('connect_error', () => {});
    return () => { socket.disconnect(); };
  }, [loadConversations, loadPages, flash]);

  // Trả về true nếu gửi thật thành công; false nếu lỗi (để UI hiện preview local khi cần).
  const reply = useCallback(async (body: { text?: string; attachmentUrl?: string }): Promise<boolean> => {
    if (!activeId || (!body.text?.trim() && !body.attachmentUrl)) return false;
    setSending(true);
    try {
      await apiClientClient.post(`/messenger/conversations/${activeId}/reply`, body);
      setMessages(await apiClientClient.get<Message[]>(`/messenger/conversations/${activeId}/messages`));
      void loadConversations();
      return true;
    } catch (e) { flash(e instanceof Error ? e.message : 'Gửi thất bại'); return false; }
    finally { setSending(false); }
  }, [activeId, loadConversations, flash]);

  const toggleAssign = useCallback(async (conv: Conversation) => {
    try { await apiClientClient.post(`/messenger/conversations/${conv.id}/assign`, { assign: !conv.assignedUserId }); void loadConversations(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi gán'); }
  }, [loadConversations, flash]);

  // Phân công hội thoại cho 1 nhân viên cụ thể (userId rỗng = bỏ gán).
  const assignTo = useCallback(async (conv: Conversation, userId: string | null) => {
    try { await apiClientClient.post(`/messenger/conversations/${conv.id}/assign-user`, { userId }); void loadConversations(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi phân công'); }
  }, [loadConversations, flash]);

  // Danh sách nhân viên để phân công (tái dùng endpoint admin).
  useEffect(() => {
    apiClientClient.get<{ staff?: StaffMember[] }>('/admin/staff/members')
      .then((r) => setStaff(r.staff || [])).catch(() => { /* ignore */ });
  }, []);

  const setLabels = useCallback(async (conv: Conversation, labels: string[]) => {
    try { await apiClientClient.post(`/messenger/conversations/${conv.id}/labels`, { labels }); void loadConversations(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi lưu nhãn'); }
  }, [loadConversations, flash]);

  // Đặt sao ưu tiên (optimistic + gọi API). color=null → bỏ sao.
  const setStar = useCallback(async (conv: Conversation, color: string | null) => {
    setConversations((prev) => prev.map((x) => (x.id === conv.id ? { ...x, star: color } : x)));
    try { await apiClientClient.post(`/messenger/conversations/${conv.id}/star`, { color }); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi đặt sao'); void loadConversations(); }
  }, [flash, loadConversations]);

  // Đặt ngày sinh khách (dob='YYYY-MM-DD' hoặc null) — optimistic + đồng bộ backend.
  const setContactDob = useCallback(async (conv: Conversation, dob: string | null) => {
    setConversations((prev) => prev.map((x) => (x.id === conv.id ? { ...x, contact: { ...x.contact, dob } } : x)));
    try { await apiClientClient.post(`/messenger/conversations/${conv.id}/contact-dob`, { dob }); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi lưu ngày sinh'); void loadConversations(); }
  }, [flash, loadConversations]);

  // Đặt giới tính khách (MALE|FEMALE|OTHER|null) — optimistic + đồng bộ backend.
  const setContactGender = useCallback(async (conv: Conversation, gender: string | null) => {
    setConversations((prev) => prev.map((x) => (x.id === conv.id ? { ...x, contact: { ...x.contact, gender } } : x)));
    try { await apiClientClient.post(`/messenger/conversations/${conv.id}/contact-gender`, { gender }); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi lưu giới tính'); void loadConversations(); }
  }, [flash, loadConversations]);

  // Thu hồi tin đã gửi (chỉ ẩn trên CRM — Meta không cho page unsend phía khách).
  const recall = useCallback(async (messageId: string) => {
    const convId = activeIdRef.current;
    if (!convId) return;
    try {
      await apiClientClient.post(`/messenger/conversations/${convId}/messages/${messageId}/recall`, {});
      setMessages(await apiClientClient.get<Message[]>(`/messenger/conversations/${convId}/messages`));
    } catch (e) { flash(e instanceof Error ? e.message : 'Lỗi thu hồi'); }
  }, [flash]);

  const register = useCallback(async () => {
    try { const r = await apiClientClient.post<{ registered: number }>('/messenger/pages/register', {}); flash(`Đã đăng ký ${r.registered} page có quyền nhắn tin.`); await loadPages(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi đăng ký page'); }
  }, [loadPages, flash]);
  const subscribe = useCallback(async (externalId: string) => {
    try { const r = await apiClientClient.post<{ subscribed: boolean }>(`/messenger/pages/${externalId}/subscribe`, {}); flash(r.subscribed ? 'Đã bật webhook.' : 'Không bật được webhook.'); await loadPages(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi subscribe'); }
  }, [loadPages, flash]);
  const backfill = useCallback(async (externalId: string) => {
    try { await apiClientClient.post<{ started: boolean }>(`/messenger/pages/${externalId}/backfill`, {}); flash('Đang kéo lịch sử ở chế độ NỀN (page nhiều hội thoại mất vài phút) — tải lại trang (F5) sau ít phút.', 10000); }
    catch (e) { flash(e instanceof Error ? e.message : 'Lỗi backfill'); }
  }, [flash]);

  const active = conversations.find((c) => c.id === activeId) || null;
  const selectedPage = pages.find((p) => p.id === pageId) || pages.find((p) => p.externalId === active?.page.externalId) || null;

  return {
    pages, pageId, setPageId, conversations, activeId, messages, search, setSearch, sending, loadingMsgs, msg,
    active, selectedPage, staff, open, reply, recall, toggleAssign, assignTo, setLabels, setStar, setContactDob, setContactGender, register, subscribe, backfill, loadConversations,
  };
}

'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useMessengerChat } from '@/lib/useMessengerChat';
import { useCcmSettings } from '@/lib/useCcmSettings';
import { apiClientClient } from '@/lib/apiClientClient';
import { resolveVars } from '@/lib/resolveVars';
import { uploadToR2, folderOf } from '@/lib/uploadR2';
import { primeAudio } from '@/lib/ccmSounds';
import CcmCustomerPanel from './CcmCustomerPanel';
import CcmImagePicker from './CcmImagePicker';

/* ============================================================================
 * CCM CHAT — bố cục & tên các phần (để dễ tìm chỗ sửa)
 * Data/logic ở hook: src/lib/useMessengerChat.ts  ·  API backend: /api/messenger/*
 *
 * [CỘT 1] ICON RAIL      — thanh LỌC dọc bên trái (mảng RAIL). Mỗi icon = 1 bộ lọc danh sách:
 *     💬 Tất cả · 💭 Chưa đọc · ✉️ Lọc tin nhắn(AI, template) · ★ Quan trọng(template) ·
 *     📞 Có SĐT · 📵 Không SĐT · 🕐 Chưa trả lời(+sort) · 📅 Theo ngày(template) ·
 *     🗂️ Nguồn(template) · 👥 Lọc nhân viên. Lọc chạy client-side trên c.conversations.
 * [CỘT 2] LIST HỘI THOẠI — rộng 330px:
 *     • FRAME 2A "TOOLBAR"      — ô tìm kiếm + chọn page + nút ＋Page/⟳ (backfill).
 *     • FRAME 2B "CONV-LIST"    — danh sách; mỗi dòng = <ConversationRow>:
 *          [A] AVATAR khách (+ badge chưa đọc)
 *          [B] HÀNG-TÊN   : tên khách · 📞 SĐT · giờ tin cuối
 *          [C] HÀNG-PREVIEW: icon chiều tin (📩 đến / ↩ rep) + trích tin cuối
 *          [D] HÀNG-META  : chip nhân viên (avatar+tên) + chip nhãn
 *     • FRAME 2C "FLASH"        — dòng thông báo (c.msg).
 * [CỘT 3] KHU CHAT       — co giãn:
 *     • FRAME 3A "CHAT-HEADER"  — [3A-L] avatar+tên+phụ trách+SĐT+nhãn, hàng icon nhỏ (🔗🕐👤🎂);
 *                                 [3A-R] 4 icon: 👤⁺ Phân công NV · ☷ Tất cả HT khách · 🏷️ Nhãn · ▭ Thông tin.
 *     • FRAME 3B "THREAD"       — danh sách bong bóng tin (OUT phải / IN trái).
 *     • FRAME 3C "COMPOSER"     — nút ảnh + ô nhập + nút Gửi.
 *
 * Màu hover dòng hội thoại: xem HÀNG "ConversationRow" (biến ROW_CLS).
 * ========================================================================== */

// Icon thanh dọc trái (CỘT 1) = bộ lọc danh sách hội thoại.
//   kind 'filter' → set railFilter; 'menu' → mở popover; 'template' → chưa có (tooltip).
type RailItem = { ic: string; key: string; title: string; kind: 'filter' | 'menu' | 'template' };
const RAIL: RailItem[] = [
  { ic: '💬', key: 'all', title: 'Tất cả hội thoại', kind: 'filter' },
  { ic: '💭', key: 'unread', title: 'Chưa đọc', kind: 'filter' },
  { ic: '✉️', key: 'ai', title: 'Lọc tin nhắn', kind: 'menu' },
  { ic: '★', key: 'star', title: 'Quan trọng (đã gắn sao)', kind: 'filter' },
  { ic: '📞', key: 'hasPhone', title: 'Lọc có số điện thoại', kind: 'filter' },
  { ic: '📵', key: 'noPhone', title: 'Lọc không có số điện thoại', kind: 'filter' },
  { ic: '🕐', key: 'unanswered', title: 'Lọc chưa trả lời', kind: 'menu' },
  { ic: '📅', key: 'date', title: 'Lọc theo ngày + tìm nội dung', kind: 'menu' },
  { ic: '🗂️', key: 'source', title: 'Nguồn bài viết/QC/website (sắp có)', kind: 'template' },
  { ic: '👥', key: 'staff', title: 'Lọc nhân viên', kind: 'menu' },
];

// ----- Dữ liệu cho thanh menu composer (FRAME 3C) -----
const EMOJIS = ['😊', '😂', '❤️', '👍', '🙏', '😍', '🥰', '😢', '😅', '🎉', '✅', '🔥', '😉', '🤝', '💯', '👌'];
// MOCK — nối API sản phẩm (/products) sau. Click → chèn "tên - giá" vào ô nhập.
const MOCK_PRODUCTS = [
  { name: 'Set CATHY', price: '850.000đ' },
  { name: 'Set NAMI JUMPSUIT', price: '990.000đ' },
  { name: 'Set CAMELIA', price: '1.490.000đ' },
  { name: 'Set RITA', price: '700.000đ' },
];
// Trả lời nhanh: KHÔNG hardcode nữa — đọc từ store useCcmSettings (trang Cài đặt › Hỗ trợ trả lời).

const fmtTime = (s: string | null) => { if (!s) return ''; const d = new Date(s); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { hour12: false }); };

// Sao ưu tiên: màu + vòng đổi (trắng→vàng→xanh→đỏ→trắng).
const STAR_COLORS: Record<string, string> = { yellow: '#f59e0b', green: '#16a34a', red: '#dc2626' };
const nextStar = (cur: string | null): string | null => (cur === 'yellow' ? 'green' : cur === 'green' ? 'red' : cur === 'red' ? null : 'yellow');

/** Avatar tròn: dùng ảnh nếu có, ngược lại hiện chữ cái đầu (nền gradient). Dùng cho cả KHÁCH & NHÂN VIÊN. */
function Avatar({ src, name, size = 44 }: { src?: string | null; name?: string | null; size?: number }) {
  const s = `${size}px`;
  if (src) return <img src={src} alt="" width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: s, height: s }} referrerPolicy="no-referrer" />;
  return <span className="rounded-full bg-gradient-to-br from-pink-200 to-indigo-200 grid place-items-center font-semibold text-gray-600 shrink-0" style={{ width: s, height: s, fontSize: size * 0.4 }}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
}

/** Icon chiều tin cuối: 📩 = tin đến (khách gửi) · ↩ = đã trả lời (nhân viên gửi). */
const DirIcon = ({ dir }: { dir: string | null }) =>
  dir === 'OUT' ? <span title="Đã trả lời" className="text-blue-500">↩</span> : dir === 'IN' ? <span title="Tin đến" className="text-emerald-500">📩</span> : null;

// Class 1 dòng hội thoại (FRAME 2B). SỬA MÀU HOVER / DÒNG ĐANG CHỌN Ở ĐÂY:
//   - active (đang mở): nền xanh đậm + thanh nhấn trái.
//   - hover (rê chuột) : nền xanh rõ (blue-100) — dễ thấy khi lướt nhiều khách.
const ROW_BASE = 'w-full text-left px-3 py-3 border-b border-gray-50 flex gap-3 cursor-pointer transition-colors border-l-4';
const rowCls = (active: boolean) => `${ROW_BASE} ${active ? 'bg-blue-100 border-l-[#3b5bdb]' : 'border-l-transparent hover:bg-blue-100/70 hover:border-l-blue-200'}`;

// Chuẩn hoá attachment (Meta trả mảng {type,payload:{url}}) → ảnh / tệp để render.
function mediaOf(att: unknown): { images: string[]; files: string[] } {
  const images: string[] = []; const files: string[] = [];
  const raw = Array.isArray(att) ? att : (att && typeof att === 'object' && Array.isArray((att as { data?: unknown[] }).data) ? (att as { data: unknown[] }).data : []);
  for (const a of raw as Array<{ type?: string; url?: string; payload?: { url?: string } }>) {
    const url = a?.payload?.url || a?.url; if (!url) continue;
    if (a?.type === 'image' || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) images.push(url); else files.push(url);
  }
  return { images, files };
}

// 1 bong bóng tin: render ảnh (inline) + tệp (link) + text. `local` = preview chưa gửi thật.
function Bubble({ out, text, images, files, time, status, local }: {
  out: boolean; text?: string | null; images: string[]; files: string[]; time: string; status?: string | null; local?: boolean;
}) {
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] px-2.5 py-2 rounded-2xl text-sm ${out ? 'bg-[#3b5bdb] text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
        {images.map((u, i) => <img key={i} src={u} alt="" className="rounded-lg max-w-full max-h-60 mb-1 block" />)}
        {files.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer" className={`block underline text-xs mb-1 ${out ? 'text-blue-100' : 'text-blue-600'}`}>📎 {u.split('/').pop()?.slice(0, 28) || 'tệp'}</a>)}
        {text && <div className="whitespace-pre-wrap break-words">{text}</div>}
        {!text && images.length === 0 && files.length === 0 && <span className="italic opacity-70">[đính kèm]</span>}
        <div className={`text-[10px] mt-1 ${out ? 'text-blue-100' : 'text-gray-400'}`}>{time}{local ? ' · xem thử (chưa gửi)' : (status ? ` · ${status}` : '')}</div>
      </div>
    </div>
  );
}

/** CCM Chat — giao diện kiểu Pancake (3 cột) nối backend Messenger thật (hook useMessengerChat). */
export default function CcmConversations() {
  const c = useMessengerChat();
  const { quickReplies, tags: tagCatalog, prefs } = useCcmSettings(); // nối Cài đặt ↔ chat
  const [draft, setDraft] = useState('');
  const [showPanel, setShowPanel] = useState(true); // bật/tắt [CỘT 4] panel khách/đơn
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Preview LOCAL (per hội thoại): khi gửi thật fail ở local → hiện bong bóng để xem cách hiển thị ảnh/tệp.
  const [previews, setPreviews] = useState<Record<string, Array<{ id: string; text?: string; image?: string; file?: string; createdAt: string }>>>({});
  const addPreview = (l: { text?: string; image?: string; file?: string }) => {
    const id = c.activeId; if (!id) return;
    setPreviews((p) => ({ ...p, [id]: [...(p[id] || []), { id: 'lp' + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), ...l }] }));
  };

  // [RESIZE] Độ rộng CỘT 2 (list) & CỘT 4 (panel) — kéo tay, lưu localStorage. CỘT 3 (chat) tự co giãn.
  const [listW, setListW] = useState(330);
  const [panelW, setPanelW] = useState(360);
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem('ccm.cols.v1') || 'null'); if (s?.listW) setListW(s.listW); if (s?.panelW) setPanelW(s.panelW); } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('ccm.cols.v1', JSON.stringify({ listW, panelW })); } catch { /* ignore */ } }, [listW, panelW]);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  // Kéo divider: 'list' → đổi rộng cột 2; 'panel' → đổi rộng cột 4 (kéo trái = rộng thêm).
  const startDrag = (kind: 'list' | 'panel') => (e: ReactMouseEvent) => {
    e.preventDefault();
    const startX = e.clientX, sL = listW, sP = panelW;
    const onMove = (ev: MouseEvent) => {
      if (kind === 'list') setListW(clamp(sL + (ev.clientX - startX), 240, 560));
      else setPanelW(clamp(sP - (ev.clientX - startX), 280, 600));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
  };
  // Tự cuộn xuống cuối THREAD (FRAME 3B) khi có tin mới.
  useEffect(() => { threadRef.current?.scrollTo(0, threadRef.current.scrollHeight); }, [c.messages, previews]);
  // Ô nhập tự cao theo nội dung (đẩy lên trên), tối đa 140px rồi cuộn — chạy mỗi khi draft đổi (gõ/chèn/xoá).
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [draft]);

  const [menu, setMenu] = useState<'emoji' | 'product' | 'quick' | null>(null); // popover đang mở ở thanh menu composer
  const [qrSearch, setQrSearch] = useState(''); // tìm mẫu/chủ đề trong popover ⚡ Trả lời nhanh
  const [prodSearch, setProdSearch] = useState(''); // tìm sản phẩm trong popover 🛍️
  const [prodHits, setProdHits] = useState<{ id: string; name: string; imageUrl: string | null; salePrice: number | null; originalPrice: number | null }[]>([]);
  useEffect(() => {
    if (menu !== 'product') return;
    const t = setTimeout(async () => {
      if (!prodSearch.trim()) { setProdHits([]); return; }
      try { setProdHits(await apiClientClient.get(`/products/search?q=${encodeURIComponent(prodSearch.trim())}`)); } catch { setProdHits([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [prodSearch, menu]);
  const [hdrMenu, setHdrMenu] = useState<'assign' | 'labels' | null>(null); // dropdown ở CHAT-HEADER (Phân công / Nhãn)
  const [dobOpen, setDobOpen] = useState(false); // popover chọn ngày sinh khách (icon 🎂 ở 3A)
  const [showImagePicker, setShowImagePicker] = useState(false); // popup Thư mục ảnh (nút 🖼️)
  const [me, setMe] = useState<{ name?: string | null; phone?: string | null } | null>(null); // nhân viên đang đăng nhập (cho biến #{STAFF_*})
  useEffect(() => { apiClientClient.get<{ name?: string; phone?: string }>('/users/me').then(setMe).catch(() => { /* ignore */ }); }, []);
  // Gợi ý AI (shadow) cho hội thoại đang mở + nút tiếp quản (tạm dừng AI).
  const [aiSuggestions, setAiSuggestions] = useState<{ id: string; replyText: string | null; orderDraft: unknown }[]>([]);
  useEffect(() => {
    if (!c.activeId) { setAiSuggestions([]); return; }
    apiClientClient.get<{ id: string; replyText: string | null; orderDraft: unknown }[]>(`/ai-agent/suggestions?conversationId=${c.activeId}`)
      .then(setAiSuggestions).catch(() => setAiSuggestions([]));
  }, [c.activeId, c.messages]);
  const approveSuggestion = async (id: string) => {
    try { await apiClientClient.post(`/ai-agent/suggestions/${id}/approve`, {}); setAiSuggestions((s) => s.filter((x) => x.id !== id)); if (c.activeId) await c.open(c.activeId); }
    catch { /* ignore */ }
  };
  const pauseAi = async () => { if (!c.activeId) return; try { await apiClientClient.post(`/ai-agent/conversations/${c.activeId}/pause`, {}); } catch { /* ignore */ } };
  // Mở khoá âm thanh sau cử chỉ đầu tiên (chính sách autoplay) → âm tin đến realtime kêu được.
  useEffect(() => { const unlock = () => void primeAudio(); window.addEventListener('pointerdown', unlock, { once: true }); return () => window.removeEventListener('pointerdown', unlock); }, []);
  const [staffQuery, setStaffQuery] = useState(''); // ô tìm trong dropdown Phân công

  // [CỘT 1] BỘ LỌC danh sách: railFilter (all/unread/hasPhone/noPhone/unanswered), popover, sort, lọc NV.
  const [railFilter, setRailFilter] = useState('all');
  const [railMenu, setRailMenu] = useState<'ai' | 'unanswered' | 'staff' | 'date' | null>(null);
  const [unansweredSort, setUnansweredSort] = useState<'recent' | 'longest' | 'read_unreplied'>('recent');
  const [staffFilter, setStaffFilter] = useState<string[]>([]); // assignedUserId (''=chưa phân công); rỗng = không lọc NV
  const [staffDraft, setStaffDraft] = useState<string[]>([]);   // lựa chọn tạm trong popover Lọc nhân viên
  const [dateFrom, setDateFrom] = useState(''); // lọc theo ngày: từ (YYYY-MM-DD)
  const [dateTo, setDateTo] = useState('');     // đến
  const [dateText, setDateText] = useState(''); // tìm nội dung (khớp tin cuối / tên / SĐT)

  // Áp bộ lọc client-side lên danh sách hội thoại.
  const visibleConversations = useMemo(() => {
    let list = c.conversations;
    if (railFilter === 'hasPhone') list = list.filter((cv) => !!cv.contact.phone);
    else if (railFilter === 'noPhone') list = list.filter((cv) => !cv.contact.phone);
    else if (railFilter === 'unread') list = list.filter((cv) => cv.unreadCount > 0);
    else if (railFilter === 'star') list = list.filter((cv) => !!cv.star);
    else if (railFilter === 'unanswered') {
      list = list.filter((cv) => cv.lastMessageDir === 'IN'); // tin cuối là tin ĐẾN = chưa trả lời
      if (unansweredSort === 'read_unreplied') list = list.filter((cv) => cv.unreadCount === 0);
    } else if (railFilter === 'date') {
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
      const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
      const q = dateText.trim().toLowerCase();
      list = list.filter((cv) => {
        const t = cv.lastMessageAt ? +new Date(cv.lastMessageAt) : 0;
        if (t < from || t > to) return false;
        if (q && !`${cv.lastMessageText || ''} ${cv.contact.name || ''} ${cv.contact.phone || ''}`.toLowerCase().includes(q)) return false;
        return true;
      });
    }
    if (staffFilter.length) list = list.filter((cv) => staffFilter.includes(cv.assignedUserId || ''));
    if (railFilter === 'unanswered') {
      list = [...list].sort((a, b) => {
        const ta = a.lastMessageAt ? +new Date(a.lastMessageAt) : 0;
        const tb = b.lastMessageAt ? +new Date(b.lastMessageAt) : 0;
        return unansweredSort === 'longest' ? ta - tb : tb - ta; // longest=đợi lâu nhất (cũ trước)
      });
    }
    return list;
  }, [c.conversations, railFilter, unansweredSort, staffFilter, dateFrom, dateTo, dateText]);
  const filterActive = railFilter !== 'all' || staffFilter.length > 0;
  const clearFilters = () => { setRailFilter('all'); setStaffFilter([]); setRailMenu(null); setDateFrom(''); setDateTo(''); setDateText(''); };
  const doSend = async () => { const t = draft.trim(); if (!t) return; setDraft(''); if (!(await c.reply({ text: t }))) addPreview({ text: t }); };
  // Chọn tệp từ máy → upload R2 → gửi; lỗi (local) → preview blob để xem.
  const sendFile = async (file?: File) => {
    if (!file) return;
    const isImg = folderOf(file) === 'images';
    try { const { url } = await uploadToR2(file, folderOf(file)); if (!(await c.reply({ attachmentUrl: url }))) addPreview(isImg ? { image: url } : { file: url }); }
    catch { const blob = URL.createObjectURL(file); addPreview(isImg ? { image: blob } : { file: blob }); }
  };
  const insertDraft = (t: string) => { setDraft((d) => (d ? d + ' ' : '') + t); setMenu(null); }; // chèn emoji/sp vào ô nhập
  // Áp 1 mẫu trả lời nhanh: RESOLVE biến #{...} (tên khách/nhân viên/ngày…) rồi chèn vào ô nhập; ảnh gửi luôn.
  const applyQuickReply = (qr: (typeof quickReplies)[number]) => {
    const ctx = {
      fullName: c.active?.contact.name,
      pageName: c.active?.page.name,
      gender: null, // MsgContact chưa lưu giới tính → nhánh "chung" của #SEX{}
      staffName: me?.name,
      staffDetails: me?.name && me?.phone ? `${me.name} · ${me.phone}` : me?.name,
    };
    const text = qr.contents.map((ct) => resolveVars(ct.text, ctx)).filter(Boolean).join('\n');
    if (text) setDraft((d) => (d ? d + '\n' : '') + text);
    setMenu(null);
    qr.contents.flatMap((ct) => ct.images).forEach((u) => { void c.reply({ attachmentUrl: u }).then((ok) => { if (!ok) addPreview({ image: u }); }); });
  };

  return (
    <div className="h-full flex bg-white">
      {/* ==================== [CỘT 1] ICON RAIL = BỘ LỌC ==================== */}
      <div className="w-12 bg-[#3b5bdb] flex flex-col items-center py-3 gap-2 text-white/90 shrink-0 relative z-30">
        {RAIL.map((it) => {
          const active = it.kind === 'filter' ? railFilter === it.key
            : it.key === 'staff' ? staffFilter.length > 0
            : it.key === 'unanswered' ? railFilter === 'unanswered'
            : it.key === 'date' ? railFilter === 'date'
            : railMenu === it.key;
          const onClick = () => {
            if (it.kind === 'filter') { setRailFilter((f) => (f === it.key && it.key !== 'all' ? 'all' : it.key)); setRailMenu(null); }
            else if (it.kind === 'menu') { if (it.key === 'staff') setStaffDraft(staffFilter); setRailMenu((m) => (m === it.key ? null : (it.key as 'ai' | 'unanswered' | 'staff' | 'date'))); }
          };
          return (
            <div key={it.key} className="relative">
              <button title={it.title} onClick={onClick} disabled={it.kind === 'template'}
                className={`w-9 h-9 rounded-lg grid place-items-center text-base ${active ? 'bg-white text-[#3b5bdb]' : 'hover:bg-white/15'} ${it.kind === 'template' ? 'opacity-45 cursor-default' : ''}`}>
                {it.ic}
              </button>

              {/* Popover ✉️ Lọc tin nhắn (AI) */}
              {railMenu === 'ai' && it.key === 'ai' && (
                <div className="absolute left-full top-0 ml-1 w-56 bg-white text-gray-700 rounded-xl shadow-lg py-1 z-40">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400">Lọc tin nhắn</div>
                  <button onClick={() => { setRailFilter('all'); setRailMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">{railFilter === 'all' ? '● ' : ''}Tất cả</button>
                  {['AI đang xử lý', 'AI đã tắt', 'AI đã chuyển tiếp'].map((t) => (
                    <div key={t} className="px-3 py-1.5 text-sm text-gray-300 flex items-center justify-between">{t}<span className="text-[10px]">sắp có</span></div>
                  ))}
                </div>
              )}

              {/* Popover 🕐 Lọc chưa trả lời */}
              {railMenu === 'unanswered' && it.key === 'unanswered' && (
                <div className="absolute left-full top-0 ml-1 w-60 bg-white text-gray-700 rounded-xl shadow-lg py-1 z-40">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400">Lọc chưa trả lời</div>
                  {([['recent', 'Giảm dần theo thời gian'], ['longest', 'Đợi phản hồi lâu nhất'], ['read_unreplied', 'Đã đọc nhưng chưa trả lời']] as const).map(([k, label]) => (
                    <button key={k} onClick={() => { setUnansweredSort(k); setRailFilter('unanswered'); setRailMenu(null); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">
                      {railFilter === 'unanswered' && unansweredSort === k ? '● ' : '○ '}{label}
                    </button>
                  ))}
                </div>
              )}

              {/* Popover 👥 Lọc nhân viên (multi-select) */}
              {railMenu === 'staff' && it.key === 'staff' && (
                <div className="absolute left-full top-0 ml-1 w-64 bg-white text-gray-700 rounded-xl shadow-lg py-2 z-40 max-h-96 overflow-y-auto">
                  <div className="px-3 pb-2 text-xs font-semibold text-gray-400">Lọc nhân viên</div>
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={staffDraft.includes('')} onChange={(e) => setStaffDraft((d) => (e.target.checked ? [...d, ''] : d.filter((x) => x !== '')))} />
                    <span className="text-gray-500">🚫 Chưa phân công</span>
                  </label>
                  {c.staff.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                      <input type="checkbox" checked={staffDraft.includes(s.id)} onChange={(e) => setStaffDraft((d) => (e.target.checked ? [...d, s.id] : d.filter((x) => x !== s.id)))} />
                      <Avatar src={s.avatarUrl} name={s.name || s.phone || 'NV'} size={22} />
                      <span className="truncate">{s.name || s.phone}</span>
                    </label>
                  ))}
                  <div className="flex gap-2 px-3 pt-2">
                    <button onClick={() => { setStaffDraft([]); setStaffFilter([]); setRailMenu(null); }} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs">Xoá lọc</button>
                    <button onClick={() => { setStaffFilter(staffDraft); setRailMenu(null); }} className="flex-1 py-1.5 rounded-lg bg-[#3b5bdb] text-white text-xs">Áp dụng</button>
                  </div>
                </div>
              )}

              {/* Popover 📅 Lọc theo ngày + tìm nội dung */}
              {railMenu === 'date' && it.key === 'date' && (
                <div className="absolute left-full top-0 ml-1 w-64 bg-white text-gray-700 rounded-xl shadow-lg py-2 z-40">
                  <div className="px-3 pb-2 text-xs font-semibold text-gray-400">Lọc theo ngày + nội dung</div>
                  <div className="px-3 space-y-2">
                    <label className="block text-xs text-gray-500">Từ ngày
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 text-gray-900" />
                    </label>
                    <label className="block text-xs text-gray-500">Đến ngày
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 text-gray-900" />
                    </label>
                    <label className="block text-xs text-gray-500">Nội dung / tên / SĐT
                      <input value={dateText} onChange={(e) => setDateText(e.target.value)} placeholder="Từ khoá…" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 text-gray-900 placeholder:text-gray-400" />
                    </label>
                  </div>
                  <div className="flex gap-2 px-3 pt-2">
                    <button onClick={() => { setDateFrom(''); setDateTo(''); setDateText(''); setRailFilter('all'); setRailMenu(null); }} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs">Xoá lọc</button>
                    <button onClick={() => { setRailFilter('date'); setRailMenu(null); }} className="flex-1 py-1.5 rounded-lg bg-[#3b5bdb] text-white text-xs">Áp dụng</button>
                  </div>
                  <p className="px-3 pt-2 text-[10px] text-gray-400">Lọc theo giờ tin cuối; nội dung khớp tin cuối/tên/SĐT trong danh sách đã tải.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Nền đóng popover khi bấm ra ngoài */}
      {railMenu && <div className="fixed inset-0 z-20" onClick={() => setRailMenu(null)} />}

      {/* ==================== [CỘT 2] LIST HỘI THOẠI (rộng chỉnh được, mặc định 330px) ==================== */}
      <div className="border-r border-gray-200 flex flex-col shrink-0" style={{ width: listW }}>
        {/* --- FRAME 2A: TOOLBAR (tìm kiếm + chọn page + đăng ký/kéo lịch sử) --- */}
        <div className="p-2 border-b border-gray-100 space-y-2">
          <input value={c.search} onChange={(e) => c.setSearch(e.target.value)} placeholder="🔍 Tìm theo tên khách…"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
          <div className="flex items-center gap-1.5">
            <select value={c.pageId} onChange={(e) => c.setPageId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs">
              <option value="">Tất cả page</option>
              {c.pages.map((p) => <option key={p.id} value={p.id}>{p.name || p.externalId}{p.subscribed ? '' : ' (chưa webhook)'}</option>)}
            </select>
            <button onClick={c.register} title="Đăng ký page có quyền nhắn tin" className="px-2 py-1 rounded-lg border border-gray-200 text-xs hover:bg-gray-50">＋Page</button>
            {c.selectedPage && <button onClick={() => c.backfill(c.selectedPage!.externalId)} title="Kéo lịch sử hội thoại" className="px-2 py-1 rounded-lg border border-gray-200 text-xs hover:bg-gray-50">⟳</button>}
          </div>
        </div>

        {/* Chip bộ lọc đang bật (từ CỘT 1) */}
        {filterActive && (
          <div className="px-2 py-1.5 border-b border-gray-100 flex items-center gap-2 text-xs bg-blue-50/50">
            <span className="text-gray-600">🔎 {[railFilter !== 'all' && RAIL.find((r) => r.key === railFilter)?.title, staffFilter.length ? `${staffFilter.length} nhân viên` : ''].filter(Boolean).join(' · ')}</span>
            <span className="text-gray-400">({visibleConversations.length})</span>
            <button onClick={clearFilters} className="ml-auto text-[#3b5bdb] hover:underline">Xoá lọc</button>
          </div>
        )}

        {/* --- FRAME 2B: CONV-LIST (mỗi dòng = ConversationRow) --- */}
        <div className="flex-1 overflow-y-auto">
          {c.conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Chưa có hội thoại.<br />Đăng ký page → bật webhook → kéo lịch sử.</div>
          ) : visibleConversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Không có hội thoại khớp bộ lọc.</div>
          ) : visibleConversations.map((cv) => (
            /* === ConversationRow: 1 khách === (màu hover/active: hàm rowCls ở trên) */
            <button key={cv.id} onClick={() => c.open(cv.id)} className={rowCls(c.activeId === cv.id)}>
              {/* [A] AVATAR khách + badge chưa đọc + SAO ưu tiên (trắng→vàng→xanh→đỏ) */}
              <div className="relative shrink-0">
                <Avatar src={cv.contact.avatarUrl} name={cv.contact.name || cv.contact.psid} />
                {cv.unreadCount > 0 && <span className="absolute -bottom-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">{cv.unreadCount}</span>}
                <button onClick={(e) => { e.stopPropagation(); void c.setStar(cv, nextStar(cv.star)); }}
                  title="Sao ưu tiên: trắng → vàng → xanh → đỏ (bấm để đổi)"
                  className="absolute -top-1 -left-1 text-[25px] leading-none"
                  style={{ color: STAR_COLORS[cv.star || ''] || '#ffffff', opacity: cv.star ? 1 : 0.5, textShadow: '0 0 2px rgba(0,0,0,.65)' }}>★</button>
              </div>
              <div className="min-w-0 flex-1">
                {/* [B] HÀNG-TÊN: tên khách · 📞 SĐT · giờ tin cuối */}
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex items-baseline gap-1.5">
                    <span className="font-medium text-gray-800 truncate">{cv.contact.name || cv.contact.psid}</span>
                    {prefs.showPhone && cv.contact.phone && <span className="text-[11px] text-blue-600 shrink-0">📞 {cv.contact.phone}</span>}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0">{fmtTime(cv.lastMessageAt)}</span>
                </div>
                {/* [C] HÀNG-PREVIEW: icon chiều tin + trích nội dung tin cuối */}
                <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                  <DirIcon dir={cv.lastMessageDir} />{cv.lastMessageText || ''}
                </div>
                {/* [D] HÀNG-META: chip nhân viên (avatar+tên) + chip nhãn */}
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {prefs.showAssignee && cv.assignedUserName && (
                    <span className="inline-flex items-center gap-1 px-1 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700">
                      <Avatar src={cv.assignedUserAvatar} name={cv.assignedUserName} size={14} /> {cv.assignedUserName}
                    </span>
                  )}
                  {(cv.labels || []).map((l) => {
                    const def = tagCatalog.find((t) => t.name === l);
                    const short = prefs.fullTagName ? l : l.slice(0, 6);
                    return <span key={l} className="px-1.5 py-0.5 rounded-full text-[10px] text-white" style={{ background: def?.color || '#f59e0b' }} title={l}>{short}</span>;
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* --- FRAME 2C: FLASH (thông báo thao tác) --- */}
        {c.msg && <div className="p-2 text-xs text-blue-700 border-t border-gray-100">{c.msg}</div>}
      </div>

      {/* DIVIDER kéo chỉnh rộng CỘT 2 */}
      <div onMouseDown={startDrag('list')} title="Kéo để chỉnh rộng" className="w-1.5 shrink-0 cursor-col-resize bg-gray-100 hover:bg-[#3b5bdb]/40 transition-colors" />

      {/* ==================== [CỘT 3] KHU CHAT ==================== */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5] min-w-0">
        {!c.active ? (
          <div className="flex-1 grid place-items-center text-gray-500"><div className="flex items-center gap-2 text-lg">💬 Xin chọn 1 hội thoại từ danh sách bên trái</div></div>
        ) : (
          <>
            {/* ================= FRAME 3A: CHAT-HEADER (bố cục kiểu Pancake) =================
             * BÊN TRÁI  = KHỐI THÔNG TIN KHÁCH (2 hàng):
             *   • Hàng 1: [avatar] Tên khách  ·  👁 "Đã xem bởi <NV phụ trách>" (nếu có assignee)
             *   • Hàng 2: HÀNG ICON NHỎ  🔗 Link · 🕐 Lịch sử · 👤 Giới tính · 🎂 Ngày sinh
             * BÊN PHẢI  = 4 ICON HÀNH ĐỘNG (trái→phải): 👤+ Phân công · ☷ Tất cả HT của khách · ✉ Nhãn · ▭ Thông tin
             * ============================================================================= */}
            <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between gap-2">
              {/* [3A-L] KHỐI THÔNG TIN KHÁCH */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar src={c.active.contact.avatarUrl} name={c.active.contact.name || c.active.contact.psid} size={40} />
                  <button onClick={() => void c.setStar(c.active!, nextStar(c.active!.star))} title="Sao ưu tiên: trắng → vàng → xanh → đỏ"
                    className="absolute -top-1 -left-1 text-[25px] leading-none"
                    style={{ color: STAR_COLORS[c.active.star || ''] || '#ffffff', opacity: c.active.star ? 1 : 0.5, textShadow: '0 0 2px rgba(0,0,0,.65)' }}>★</button>
                </div>
                <div className="min-w-0">
                  {/* Hàng 1: tên + assignee (đã xem/phụ trách) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 truncate">{c.active.contact.name || c.active.contact.psid}</span>
                    {c.active.assignedUserName && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                        👁 phụ trách bởi <Avatar src={c.active.assignedUserAvatar} name={c.active.assignedUserName} size={14} /> {c.active.assignedUserName}
                      </span>
                    )}
                    {c.active.contact.phone && <span className="text-[11px] text-blue-600">📞 {c.active.contact.phone}</span>}
                    {(c.active.labels || []).map((l) => <span key={l} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700">{l}</span>)}
                  </div>
                  {/* Hàng 2: HÀNG ICON NHỎ (mô tả vị trí: trái→phải) */}
                  <div className="flex items-center gap-3 mt-0.5 text-gray-400">
                    <button title="Link hội thoại (sao chép)" onClick={() => { void navigator.clipboard?.writeText(`${location.origin}/ccm/conversations?c=${c.active!.id}`); }} className="opacity-70 hover:opacity-100"><img src="/ccm-icons/share-icon.svg" alt="" className="w-4 h-4" /></button>
                    <button title="Lịch sử hội thoại" className="hover:text-[#3b5bdb]">🕐</button>
                    <button title="Giới tính: Chưa xác định" className="opacity-70 hover:opacity-100"><img src="/ccm-icons/unspecified_gender.svg" alt="" className="w-4 h-4" /></button>
                    <span className="relative inline-flex">
                      <button title={c.active.contact.dob ? `Ngày sinh: ${new Date(c.active.contact.dob).toLocaleDateString('vi-VN')}` : 'Đặt ngày sinh khách'}
                        onClick={() => setDobOpen((o) => !o)} className={c.active.contact.dob ? '' : 'opacity-70 hover:opacity-100'}>
                        <img src="/ccm-icons/cake-gray.svg" alt="" className="w-4 h-4" />
                      </button>
                      {dobOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDobOpen(false)} />
                          <div className="absolute z-20 left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                            <div className="text-xs font-semibold text-gray-900 mb-1">🎂 Ngày sinh khách</div>
                            <input type="date" defaultValue={(c.active.contact.dob || '').slice(0, 10)}
                              onChange={(e) => void c.setContactDob(c.active!, e.target.value || null)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
                            <p className="text-[10px] text-gray-700 mt-1">Lưu vào hồ sơ khách + danh sách KH (nếu khớp SĐT).</p>
                          </div>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* [3A-R] 4 ICON HÀNH ĐỘNG */}
              <div className="flex items-center gap-1 shrink-0">
                {/* (1) 👤+ Phân công nhân viên — dropdown chọn 1 NV cụ thể */}
                <div className="relative">
                  <button onClick={() => setHdrMenu((m) => (m === 'assign' ? null : 'assign'))} title="Phân công nhân viên"
                    className={`w-9 h-9 grid place-items-center rounded-lg ${hdrMenu === 'assign' || c.active.assignedUserId ? 'bg-blue-50' : 'hover:bg-gray-100'}`}><img src="/ccm-icons/user_circle_plus.svg" alt="Phân công" className="w-5 h-5" /></button>
                  {hdrMenu === 'assign' && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => { setHdrMenu(null); setStaffQuery(''); }} />
                      <div className="absolute z-20 right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-2 max-h-80 overflow-y-auto">
                        <div className="px-3 pb-2">
                          <input value={staffQuery} onChange={(e) => setStaffQuery(e.target.value)} placeholder="🔍 Phân công nhân viên"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
                        </div>
                        {c.active.assignedUserId && (
                          <button onClick={() => { void c.assignTo(c.active!, null); setHdrMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50">✕ Bỏ phân công</button>
                        )}
                        {c.staff.filter((s) => (s.name || s.phone || '').toLowerCase().includes(staffQuery.toLowerCase())).map((s) => (
                          <button key={s.id} onClick={() => { void c.assignTo(c.active!, s.id); setHdrMenu(null); setStaffQuery(''); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left">
                            <Avatar src={s.avatarUrl} name={s.name || s.phone || 'NV'} size={26} />
                            <span className="text-sm text-gray-700 truncate">{s.name || s.phone}</span>
                            {c.active!.assignedUserId === s.id && <span className="ml-auto text-[#3b5bdb]">✓</span>}
                          </button>
                        ))}
                        {c.staff.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Không tải được danh sách nhân viên.</div>}
                      </div>
                    </>
                  )}
                </div>
                {/* (2) ☷ Tất cả hội thoại của người dùng này → lọc danh sách theo tên/psid khách */}
                <button onClick={() => c.setSearch(c.active!.contact.name || c.active!.contact.psid)} title="Tất cả hội thoại của người dùng này"
                  className="w-9 h-9 grid place-items-center rounded-lg text-gray-600 hover:bg-gray-100">☷</button>
                {/* (3) 🏷️ Nhãn hội thoại — chọn từ danh mục Thẻ (Cài đặt › Thẻ hội thoại) */}
                <div className="relative">
                  <button onClick={() => setHdrMenu((m) => (m === 'labels' ? null : 'labels'))} title="Nhãn hội thoại"
                    className={`w-9 h-9 grid place-items-center rounded-lg ${hdrMenu === 'labels' ? 'bg-blue-50 text-[#3b5bdb]' : 'text-gray-600 hover:bg-gray-100'}`}>🏷️</button>
                  {hdrMenu === 'labels' && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setHdrMenu(null)} />
                      <div className="absolute z-20 right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 max-h-80 overflow-y-auto">
                        <div className="flex items-center justify-between px-3 pb-1">
                          <span className="text-xs font-semibold text-gray-400">Nhãn hội thoại</span>
                          <a href="/ccm/settings/tags" className="text-[11px] text-[#3b5bdb] hover:underline">Quản lý</a>
                        </div>
                        {tagCatalog.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Chưa có thẻ. Thêm ở Cài đặt › Thẻ hội thoại.</div>}
                        {tagCatalog.map((t) => {
                          const on = (c.active!.labels || []).includes(t.name);
                          return (
                            <button key={t.id} onClick={() => {
                              const cur = c.active!.labels || [];
                              void c.setLabels(c.active!, on ? cur.filter((x) => x !== t.name) : [...cur, t.name]);
                            }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-sm">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
                              <span className="flex-1 truncate">{t.name}</span>
                              {on && <span className="text-[#3b5bdb]">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                {/* (4a) 🤖 Tiếp quản: tạm dừng AI cho hội thoại này */}
                <button onClick={() => void pauseAi()} title="Tiếp quản — tạm dừng AI cho hội thoại này"
                  className="w-9 h-9 grid place-items-center rounded-lg text-gray-600 hover:bg-gray-100">🤖⏸</button>
                {/* (4) ▭ Thông tin hội thoại → bật/tắt [CỘT 4] panel */}
                <button onClick={() => setShowPanel((v) => !v)} title="Thông tin hội thoại"
                  className={`w-9 h-9 grid place-items-center rounded-lg ${showPanel ? 'bg-blue-50' : 'hover:bg-gray-100'}`}><img src="/ccm-icons/apps-list-detail.svg" alt="Thông tin" className="w-5 h-5" /></button>
              </div>
            </div>

            {/* --- FRAME 3B: THREAD (bong bóng tin; OUT=phải xanh, IN=trái trắng) --- */}
            <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {c.loadingMsgs ? <div className="text-center text-gray-400 text-sm">Đang tải…</div> : (
                <>
                  {c.messages.map((m) => { const md = mediaOf(m.attachments); return (
                    <Bubble key={m.id} out={m.direction === 'OUT'} text={m.text} images={md.images} files={md.files} time={fmtTime(m.createdAt)} status={m.direction === 'OUT' ? m.status : null} />
                  ); })}
                  {(previews[c.activeId] || []).map((p) => (
                    <Bubble key={p.id} out text={p.text} images={p.image ? [p.image] : []} files={p.file ? [p.file] : []} time={fmtTime(p.createdAt)} local />
                  ))}
                </>
              )}
            </div>

            {/* --- FRAME 3C: COMPOSER (ô nhập + thanh menu icon dưới ô nhập) --- */}
            <div className="bg-white border-t border-gray-200 relative">
              {/* Gợi ý AI (shadow) — chưa gửi; NV duyệt */}
              {aiSuggestions.length > 0 && (
                <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
                  {aiSuggestions.map((s) => (
                    <div key={s.id} className="text-sm">
                      <div className="text-[11px] text-amber-700 mb-1">🤖 Gợi ý AI (chưa gửi){s.orderDraft ? ' · kèm đơn nháp' : ''}</div>
                      <div className="text-gray-700 whitespace-pre-wrap">{s.replyText}</div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => void approveSuggestion(s.id)} className="px-2 py-1 rounded bg-[#3b5bdb] text-white text-xs">Gửi</button>
                        <button onClick={() => { if (s.replyText) setDraft(s.replyText); setAiSuggestions((a) => a.filter((x) => x.id !== s.id)); }} className="px-2 py-1 rounded border border-gray-200 text-xs">Sửa</button>
                        <button onClick={() => setAiSuggestions((a) => a.filter((x) => x.id !== s.id))} className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-500">Bỏ</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* POPOVER: emoji / sản phẩm / trả lời nhanh (mở lên trên, canh PHẢI đồng bộ với hàng icon) */}
              {menu && (
                <div className="absolute bottom-full right-3 mb-1 w-72 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg p-2 z-10">
                  {menu === 'emoji' && (
                    <div className="grid grid-cols-8 gap-1 text-xl">
                      {EMOJIS.map((e) => <button key={e} onClick={() => insertDraft(e)} className="hover:bg-gray-100 rounded p-1">{e}</button>)}
                    </div>
                  )}
                  {menu === 'product' && (
                    <div className="space-y-1">
                      <input autoFocus value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} placeholder="🔍 Tìm sản phẩm"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb] mb-1" />
                      {!prodSearch.trim() && <div className="text-xs text-gray-400 px-1 py-2">Gõ để tìm sản phẩm…</div>}
                      {prodSearch.trim() && prodHits.length === 0 && <div className="text-xs text-gray-400 px-1 py-2">Không có kết quả.</div>}
                      {prodHits.map((p) => {
                        const price = (p.salePrice ?? p.originalPrice ?? 0).toLocaleString('vi-VN');
                        return (
                          <button key={p.id} onClick={() => insertDraft(`${p.name} - ${price}đ`)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left text-sm">
                            <span className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0 grid place-items-center text-gray-300 text-xs">{p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : '📦'}</span>
                            <span className="flex-1 min-w-0"><span className="text-gray-700 truncate block">{p.name}</span><span className="text-xs text-gray-400">{price}đ</span></span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {menu === 'quick' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1 pb-1">
                        <span className="text-xs text-gray-400">⚡ Trả lời nhanh</span>
                        <a href="/ccm/settings/quick-reply" className="text-[11px] text-[#3b5bdb] hover:underline">Quản lý</a>
                      </div>
                      <input autoFocus value={qrSearch} onChange={(e) => setQrSearch(e.target.value)} placeholder="🔍 Tìm chủ đề / ký tự tắt / nội dung"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb] mb-1" />
                      {quickReplies.length === 0 && <div className="text-xs text-gray-400 px-1 py-2">Chưa có mẫu. Thêm ở Cài đặt › Hỗ trợ trả lời.</div>}
                      {quickReplies
                        .filter((q) => (`${q.topic} ${q.key} ${q.contents.map((ct) => ct.text).join(' ')}`).toLowerCase().includes(qrSearch.toLowerCase()))
                        .map((q) => {
                        const preview = q.contents.map((ct) => ct.text).find(Boolean) || '';
                        const imgs = q.contents.reduce((s, ct) => s + ct.images.length, 0);
                        return (
                          <button key={q.id} onClick={() => applyQuickReply(q)} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm">
                            {q.topic && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white mr-1" style={{ background: tagCatalog.find((t) => t.name === q.topic)?.color || '#64748b' }}>{q.topic}</span>}
                            {q.key && <span className="text-[#3b5bdb] font-medium">/{q.key} </span>}
                            {imgs > 0 && <span className="text-[10px] bg-gray-200 text-gray-600 rounded px-1 mr-1">🖼️{imgs}</span>}
                            <span className="text-gray-600">{preview.slice(0, 40)}{preview.length > 40 ? '…' : (preview ? '' : '(ảnh)')}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {/* Hàng nhập: [cột ô nhập + icon canh phải thẳng mép ô nhập] + nút Gửi (cùng hàng với ô nhập) */}
              <div className="px-3 py-3 flex gap-2 items-start">
                <div className="flex-1 flex flex-col gap-1">
                  <textarea ref={inputRef} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void doSend(); } }}
                    placeholder="Nhập tin nhắn… (Enter để gửi · Shift+Enter xuống dòng)"
                    className="w-full resize-none overflow-y-auto max-h-[140px] leading-5 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
                  {/* THANH ICON canh PHẢI, thẳng mép ô nhập: 🛍️😊📎🖼️⚡ */}
                  <div className="flex items-center justify-end gap-1 text-lg">
                    <button onClick={() => setMenu(menu === 'product' ? null : 'product')} title="Sản phẩm" className={`px-2 py-1 rounded-lg hover:bg-gray-100 ${menu === 'product' ? 'bg-blue-50' : ''}`}>🛍️</button>
                    <button onClick={() => setMenu(menu === 'emoji' ? null : 'emoji')} title="Cảm xúc" className={`px-2 py-1 rounded-lg hover:bg-gray-100 ${menu === 'emoji' ? 'bg-blue-50' : ''}`}>😊</button>
                    <label title="Gửi tệp/video (upload R2)" className="px-2 py-1 rounded-lg hover:bg-gray-100 cursor-pointer">📎
                      <input type="file" accept="image/*,video/*,application/pdf" className="hidden" onChange={(e) => { void sendFile(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    <button onClick={() => setShowImagePicker(true)} disabled={c.sending} title="Gửi ảnh (thư mục ảnh)" className="px-2 py-1 rounded-lg hover:bg-gray-100 disabled:opacity-50">🖼️</button>
                    <button onClick={() => setMenu(menu === 'quick' ? null : 'quick')} title="Trả lời nhanh" className={`px-2 py-1 rounded-lg hover:bg-gray-100 ${menu === 'quick' ? 'bg-blue-50' : ''}`}>⚡</button>
                  </div>
                </div>
                <button onClick={() => void doSend()} disabled={c.sending || !draft.trim()} className="shrink-0 px-4 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium hover:bg-[#2f49b0] disabled:opacity-50">Gửi</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ==================== [CỘT 4] PANEL KHÁCH / ĐƠN HÀNG (bật/tắt ▤, rộng chỉnh được) ==================== */}
      {c.active && showPanel && (
        <>
          {/* DIVIDER kéo chỉnh rộng CỘT 4 (kéo sang trái = rộng thêm) */}
          <div onMouseDown={startDrag('panel')} title="Kéo để chỉnh rộng" className="w-1.5 shrink-0 cursor-col-resize bg-gray-100 hover:bg-[#3b5bdb]/40 transition-colors" />
          <div className="shrink-0 h-full" style={{ width: panelW }}><CcmCustomerPanel conversation={c.active} /></div>
        </>
      )}

      {/* POPUP Thư mục ảnh (nút 🖼️) → gửi từng ảnh đã chọn qua reply(attachmentUrl) */}
      {showImagePicker && (
        <CcmImagePicker
          onClose={() => setShowImagePicker(false)}
          onSend={async (urls) => { setShowImagePicker(false); for (const u of urls) { if (!(await c.reply({ attachmentUrl: u }))) addPreview({ image: u }); } }}
        />
      )}
    </div>
  );
}

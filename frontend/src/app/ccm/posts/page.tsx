'use client';
export const dynamic = 'force-dynamic';

/* /ccm/posts — Quản lý bài viết. Giữ layout template (thanh trên + panel lọc trái + bảng),
 * danh sách bài viết lấy THẬT qua Graph API: GET /messenger/pages/:externalId/posts. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface MsgPage { id: string; externalId: string; name: string | null }
interface Post { id: string; message: string; createdTime: string | null; image: string | null; permalink: string | null; likes: number; comments: number; shares: number }

const POST_FILTERS = [
  { icon: '▶️', label: 'Video' },
  { icon: '🅰️', label: 'Bài viết' },
  { icon: '🎬', label: 'Đã Livestream' },
  { icon: '🔴', label: 'Đang Livestream' },
];
const COMMENT_FILTERS = ['Ẩn bình luận', 'Không ẩn bình luận', 'Bỏ qua bình luận', 'Không bỏ qua bình luận'];
const SORTS = ['Mới nhất', 'Nhiều bình luận', 'Ít bình luận', 'Nhiều số điện thoại', 'Ít số điện thoại'];
const ENGAGE = ['Nhiều tương tác', 'Ít tương tác', 'Nhiều chia sẻ', 'Ít chia sẻ'];

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('vi-VN') : '');

// Mở link ngoài an toàn: chỉ http(s), luôn kèm noopener,noreferrer (chống reverse tab-nabbing / javascript:)
const openExternal = (url: string | null) => {
  if (!url || !/^https?:\/\//i.test(url)) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const SIDEBAR_HEADING = 'text-[11px] font-bold text-[#8a91a3] tracking-[0.08em] mb-2';

// Nhóm lọc dạng ô check (vuông) — hàng bấm được, không có state (giữ như template).
function CheckGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <div className={`${SIDEBAR_HEADING} mt-3.5`}>{title.toUpperCase()}</div>
      {items.map((it) => (
        <label key={it} className="flex items-center gap-[9px] px-2 py-1.5 rounded-lg cursor-pointer text-[13px] text-[#374151] hover:bg-[#f3f6ff]">
          <input type="checkbox" name={title} className="w-3.5 h-3.5 accent-[#3c55e6]" />
          <span>{it}</span>
        </label>
      ))}
    </>
  );
}

// Nhóm lọc dạng radio (chấm tròn) — hàng bấm được, không có state (giữ như template).
function RadioGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <div className={`${SIDEBAR_HEADING} mt-3.5`}>{title.toUpperCase()}</div>
      {items.map((it) => (
        <label key={it} className="flex items-center gap-[9px] px-2 py-1.5 rounded-lg cursor-pointer text-[13px] text-[#374151] hover:bg-[#f3f6ff]">
          <input type="radio" name={title} className="w-3.5 h-3.5 accent-[#3c55e6]" />
          <span>{it}</span>
        </label>
      ))}
    </>
  );
}

export default function CcmPosts() {
  const [pages, setPages] = useState<MsgPage[]>([]);
  const [ext, setExt] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    apiClientClient.get<MsgPage[]>('/messenger/pages').then((p) => { setPages(p || []); if (p?.[0]) setExt(p[0].externalId); }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!ext) { setPosts([]); return; }
    setLoading(true); setError('');
    try { setPosts(await apiClientClient.get<Post[]>(`/messenger/pages/${encodeURIComponent(ext)}/posts`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Lỗi tải bài viết'); setPosts([]); }
    finally { setLoading(false); }
  }, [ext]);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
    const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
    return posts.filter((p) => {
      if (k && !p.message.toLowerCase().includes(k)) return false;
      const t = p.createdTime ? +new Date(p.createdTime) : 0;
      if (t < from || t > to) return false;
      return true;
    });
  }, [posts, q, dateFrom, dateTo]);

  return (
    <div className="h-full overflow-y-auto px-[22px] py-[18px] min-w-0">
      {/* Thanh trên */}
      <div className="bg-white border border-[#e6e9f2] rounded-[14px] px-5 py-3.5 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.4px] text-gray-900">Quản lý bài viết</h1>
          <span className="px-2.5 py-[3px] rounded-lg text-[11.5px] font-bold bg-[#e8ecff] text-[#3c55e6]">Graph API</span>
        </div>
        <select value={ext} onChange={(e) => setExt(e.target.value)} className="px-[13px] py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13.5px] bg-white min-w-[170px]">
          {pages.length === 0 && <option value="">(chưa có page)</option>}
          {pages.map((p) => <option key={p.id} value={p.externalId}>{p.name || p.externalId}</option>)}
        </select>
        <div className="flex-1 min-w-[200px] flex items-center gap-2 border border-[#e5e7eb] rounded-[10px] px-[13px] py-2.5 text-[#9ca3af] focus-within:border-[#3c55e6]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm bài viết" className="flex-1 border-none outline-none text-[13.5px] bg-transparent min-w-0 text-[#111827]" />
        </div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Từ ngày" className="w-[118px] px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#3c55e6]" />
        <span className="text-[#9ca3af]">→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Đến ngày" className="w-[118px] px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#3c55e6]" />
        {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[12px] text-[#3c55e6] hover:underline">Xoá ngày</button>}
        <button onClick={() => void load()} className="px-4 py-2.5 border border-[#e5e7eb] rounded-[10px] bg-white hover:bg-[#f9fafb] text-[13px] font-bold text-[#374151] cursor-pointer flex items-center gap-[7px]">⟳ Tải lại</button>
      </div>

      <div className="flex gap-4 items-start">
        {/* Bộ lọc trái (template) */}
        <div className="w-[228px] flex-shrink-0 bg-white border border-[#e6e9f2] rounded-[14px] px-3.5 py-4">
          <div className={SIDEBAR_HEADING}>LỌC BÀI ĐĂNG</div>
          {POST_FILTERS.map((f) => (
            <label key={f.label} className="flex items-center gap-[9px] px-2 py-1.5 rounded-lg cursor-pointer text-[13px] text-[#374151] hover:bg-[#f3f6ff]">
              <span className="text-[14px] w-5 text-center">{f.icon}</span><span>{f.label}</span>
            </label>
          ))}
          <CheckGroup title="Lọc bài viết" items={COMMENT_FILTERS} />
          <RadioGroup title="Sắp xếp theo" items={SORTS} />
          <RadioGroup title="Lọc tương tác" items={ENGAGE} />
        </div>

        {/* Danh sách bài viết THẬT */}
        <div className="flex-1 min-w-0 bg-white border border-[#e6e9f2] rounded-[14px] overflow-hidden">
          <div className="flex gap-3 px-[18px] py-[11px] bg-[#f8fafc] text-[11px] font-bold text-[#6b7280] tracking-[0.05em]">
            <span className="flex-1">NỘI DUNG BÀI VIẾT</span>
            <span className="w-[128px] flex-shrink-0">TƯƠNG TÁC</span>
            <span className="w-[148px] flex-shrink-0">NGÀY</span>
            <span className="w-[44px] flex-shrink-0 text-right">THAO TÁC</span>
          </div>
          {loading && <div className="px-4 py-9 text-center text-[#9ca3af] text-[13px]">Đang tải bài viết…</div>}
          {error && <div className="px-[18px] py-3 text-[13px] text-[#dc2626]">{error}</div>}
          {!loading && !error && shown.length === 0 && <div className="px-4 py-9 text-center text-[#9ca3af] text-[13px]">Chưa có bài viết (hoặc page thiếu quyền pages_read_engagement).</div>}
          {shown.map((p) => (
            <div key={p.id} className="flex gap-3 px-[18px] py-[13px] border-t border-[#f1f5f9] items-start">
              <div className="flex-1 min-w-0 flex gap-3">
                <button onClick={() => openExternal(p.permalink)} title="Mở bài viết"
                  className="w-[54px] h-[54px] rounded-lg bg-[#f3f4f6] grid place-items-center text-[19px] text-gray-300 flex-shrink-0 overflow-hidden cursor-pointer">
                  {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : '🖼️'}
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => openExternal(p.permalink)} title={p.permalink || 'Không có link'}
                    className="text-[13.5px] leading-[1.5] text-[#374151] text-left w-full hover:text-[#3c55e6] block overflow-hidden"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.message || <span className="text-gray-300 italic">(không có nội dung text)</span>}
                  </button>
                  <div className="flex items-center gap-[7px] mt-1">
                    <span className="font-mono text-[11px] text-[#9ca3af] truncate max-w-[190px]" title={p.id}>ID: {p.id}</span>
                    <button onClick={() => { void navigator.clipboard?.writeText(p.id); }} title="Sao chép ID" className="cursor-pointer text-[#9ca3af] text-[12px] hover:text-[#3c55e6] shrink-0">⧉</button>
                  </div>
                </div>
              </div>
              <div className="w-[128px] flex-shrink-0 flex gap-[9px] text-[12px] text-[#4b5563] pt-1 whitespace-nowrap">
                <span>👍 {p.likes}</span><span>💬 {p.comments}</span><span>↗ {p.shares}</span>
              </div>
              <div className="w-[148px] flex-shrink-0 text-[12.5px] text-[#6b7280] pt-1">{fmt(p.createdTime)}</div>
              <span className="w-[44px] flex-shrink-0 text-right pt-[3px]">{p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="text-[#3c55e6] text-[13px] font-bold hover:underline">Xem</a>}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

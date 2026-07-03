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

function FilterGroup({ title, items, type }: { title: string; items: string[]; type: 'check' | 'radio' }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-gray-400 uppercase mb-2">{title}</div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <label key={it} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type={type === 'check' ? 'checkbox' : 'radio'} name={title} className="accent-[#3b5bdb]" />
            {it}
          </label>
        ))}
      </div>
    </div>
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
    <div className="h-full overflow-y-auto p-6">
      {/* Thanh trên */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 mb-4 flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-800">Quản lý bài viết</h1>
        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#3b5bdb]">Graph API</span>
        <select value={ext} onChange={(e) => setExt(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          {pages.length === 0 && <option value="">(chưa có page)</option>}
          {pages.map((p) => <option key={p.id} value={p.externalId}>{p.name || p.externalId}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Tìm bài viết" className="w-[250px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Từ ngày" className="border border-gray-200 rounded-lg px-2 py-2 text-sm" />
        <span className="text-gray-400">→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Đến ngày" className="border border-gray-200 rounded-lg px-2 py-2 text-sm" />
        {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-[#3b5bdb] hover:underline">Xoá ngày</button>}
        <button onClick={() => void load()} className="ml-auto px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">⟳ Tải lại</button>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-4">
        {/* Bộ lọc trái (template) */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 h-fit">
          <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Lọc bài đăng</div>
          <div className="space-y-1.5 mb-5">
            {POST_FILTERS.map((f) => (
              <label key={f.label} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <span>{f.icon}</span> {f.label}
              </label>
            ))}
          </div>
          <FilterGroup title="Lọc bài viết" items={COMMENT_FILTERS} type="check" />
          <FilterGroup title="Sắp xếp theo" items={SORTS} type="radio" />
          <FilterGroup title="Lọc tương tác" items={ENGAGE} type="radio" />
        </div>

        {/* Danh sách bài viết THẬT */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_180px_90px] px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
            <span>Nội dung bài viết</span><span>Tương tác</span><span>Ngày</span><span className="text-right">Thao tác</span>
          </div>
          {loading && <div className="px-4 py-8 text-center text-gray-400 text-sm">Đang tải bài viết…</div>}
          {error && <div className="px-4 py-3 text-sm text-red-600">{error}</div>}
          {!loading && !error && shown.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Chưa có bài viết (hoặc page thiếu quyền pages_read_engagement).</div>}
          {shown.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_140px_180px_90px] items-center px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => p.permalink && window.open(p.permalink, '_blank')} title="Mở bài viết"
                  className="w-12 h-12 rounded-lg bg-gray-100 grid place-items-center text-gray-300 shrink-0 overflow-hidden cursor-pointer">
                  {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : '🖼️'}
                </button>
                <div className="min-w-0">
                  <button onClick={() => p.permalink && window.open(p.permalink, '_blank')} title={p.permalink || 'Không có link'}
                    className="text-sm text-gray-800 truncate block text-left w-full hover:text-[#3b5bdb] hover:underline">
                    {p.message || <span className="text-gray-300 italic">(không có nội dung text)</span>}
                  </button>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <span className="font-mono truncate max-w-[190px]" title={p.id}>ID: {p.id}</span>
                    <button onClick={() => { void navigator.clipboard?.writeText(p.id); }} title="Sao chép ID" className="hover:text-[#3b5bdb] shrink-0">⧉</button>
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-500 flex gap-2">👍 {p.likes} · 💬 {p.comments} · ↗ {p.shares}</span>
              <span className="text-xs text-gray-500">{fmt(p.createdTime)}</span>
              <span className="text-right">{p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="text-[#3b5bdb] text-sm hover:underline">Xem</a>}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

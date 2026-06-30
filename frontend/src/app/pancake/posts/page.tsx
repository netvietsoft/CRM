'use client';
export const dynamic = 'force-dynamic';

import { MockBadge } from '@/components/pancake/ui';

const POST_FILTERS = [
  { icon: '▶️', label: 'Video' },
  { icon: '🅰️', label: 'Bài viết' },
  { icon: '🎬', label: 'Đã Livestream' },
  { icon: '🔴', label: 'Đang Livestream' },
];
const COMMENT_FILTERS = ['Ẩn bình luận', 'Không ẩn bình luận', 'Bỏ qua bình luận', 'Không bỏ qua bình luận'];
const SORTS = ['Mới nhất', 'Nhiều bình luận', 'Ít bình luận', 'Nhiều số điện thoại', 'Ít số điện thoại'];
const ENGAGE = ['Nhiều tương tác', 'Ít tương tác', 'Nhiều chia sẻ', 'Ít chia sẻ'];

const POSTS = [
  { title: 'NEW IN | JUNA SET JUNA SET mang đậm gam màu quyền…', date: '30 tháng 6 năm 2026 · 18:45', by: 'Phương Ng…', cmt: null, react: null },
  { title: 'NEW IN | JUNA SET JUNA SET mang đậm gam màu quyền…', date: '30 tháng 6 năm 2026 · 18:44', by: 'Phương Ng…', cmt: null, react: null },
  { title: 'CHY added a new photo.', date: '23 tháng 6 năm 2026 · 11:59', by: 'Phạm Tony', cmt: 11, react: 2 },
  { title: 'NEW IN | Beryl set là tuyên ngôn của sự tự tin và khí chất…', date: '23 tháng 6 năm 2026 · 11:59', by: 'Phạm Tony', cmt: 187, react: 173 },
  { title: 'NEW IN | Mavil Set Mavil Set - ra mắt với chất đũi nhật ca…', date: '18 tháng 6 năm 2026 · 07:00', by: 'Phạm Tony', cmt: null, react: null },
  { title: '═Nami Jumpsuit ═ Mùa hè không thể không nhắc đến …', date: '16 tháng 6 năm 2026 · 22:15', by: 'Phạm Tony', cmt: null, react: null },
];

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

export default function PancakePosts() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 mb-4 flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">Quản lý bài viết</h1>
        <MockBadge />
        <input placeholder="🔍 Tìm kiếm bài viết" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <span className="text-gray-400">→</span>
        <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-4">
        {/* Bộ lọc trái */}
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

        {/* Danh sách bài viết */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_160px_120px] px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
            <span>Nội dung bài viết</span><span>Chủ đề</span><span>Người tạo</span><span className="text-right">Thao tác</span>
          </div>
          {POSTS.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_160px_120px] items-center px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-12 h-12 rounded-lg bg-gray-100 grid place-items-center text-gray-300 shrink-0">🖼️</span>
                <div className="min-w-0">
                  <div className="text-sm text-gray-800 truncate">{p.title}</div>
                  <div className="text-xs text-gray-400">{p.date}</div>
                  <div className="text-xs text-gray-400 flex gap-3 mt-0.5">
                    {p.cmt != null && <span>💬 {p.cmt}</span>}
                    {p.react != null && <span>❤️ {p.react}</span>}
                    <span>⧉ Sao chép ID</span>
                  </div>
                </div>
              </div>
              <span className="text-gray-300">+</span>
              <span className="text-sm text-gray-600 truncate">{p.by}</span>
              <span className="text-right text-gray-400">👁️ ⋯</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

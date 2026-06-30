'use client';
export const dynamic = 'force-dynamic';

const RAIL = ['💬', '🔍', '💭', '✉️', '★', '📞', '📵', '🕐', '📅', '🗂️', '👥'];
const TAG_COLORS = ['#9aa4b2', '#c4b5fd', '#93c5fd', '#86efac', '#67e8f9', '#fca5a5'];

// Mock danh sách hội thoại (template — sẽ nối API /messenger/conversations sau).
const CONVOS = [
  { name: 'Vũ Thị Nga', last: '.', time: '20:14', unread: 1, channel: '💬' },
  { name: 'Mai Diên', last: 'Bn', time: '20:13', unread: 1, channel: '💬' },
  { name: 'My Sói', last: 'Chị cho em xin cân nặng và chiều cao để em t…', time: '20:14', unread: 0, channel: '✉️' },
  { name: 'Le Hong', last: 'Chị cho em xin cân nặng và chiều cao để em tư v…', time: '20:12', unread: 0, channel: '✉️' },
  { name: 'Huyền Phạm', last: 'Chị cho em xin cân nặng và chiều cao để em tư v…', time: '20:12', unread: 0, channel: '✉️' },
  { name: 'Kim Hồng', last: 'Chị cho em xin cân nặng và chiều cao để em tư v…', time: '20:11', unread: 0, channel: '✉️' },
  { name: 'Hoang Phuong', last: 'Chị cho em xin cân nặng và chiều cao để em tư v…', time: '20:11', unread: 0, channel: '✉️' },
  { name: 'Nguyễn Hậu', last: '[3 Photos]', time: '20:11', unread: 0, channel: '✉️' },
  { name: 'Che Tuyetmai', last: 'Chị cho em xin cân nặng và chiều cao để em tư v…', time: '20:10', unread: 0, channel: '✉️' },
  { name: 'Nguyễn Du', last: 'Chị cho em xin cân nặng và chiều cao để em tư v…', time: '20:08', unread: 0, channel: '✉️' },
  { name: 'Phan Duyên Duyên', last: 'Chị cho em xin cân nặng và chiều cao để em tư v…', time: '20:06', unread: 0, channel: '✉️' },
];

export default function PancakeConversations() {
  return (
    <div className="h-full flex bg-white">
      {/* Icon rail */}
      <div className="w-12 bg-[#3b5bdb] flex flex-col items-center py-3 gap-3 text-white/90">
        {RAIL.map((ic, i) => (
          <button key={i} className={`w-9 h-9 rounded-lg grid place-items-center hover:bg-white/15 ${i === 0 ? 'bg-white/20' : ''}`}>{ic}</button>
        ))}
      </div>

      {/* Danh sách hội thoại */}
      <div className="w-[330px] border-r border-gray-200 flex flex-col">
        <div className="p-2 border-b border-gray-100 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5">
            <span className="text-gray-400">🔍</span>
            <input placeholder="Tìm kiếm" className="flex-1 text-sm outline-none" />
          </div>
        </div>
        <div className="px-2 py-1.5 border-b border-gray-100 flex items-center gap-1.5">
          {TAG_COLORS.map((c) => <span key={c} className="w-5 h-5 rounded" style={{ background: c }} />)}
          <button className="ml-auto w-7 h-7 rounded grid place-items-center text-gray-400 hover:bg-gray-100">☰</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {CONVOS.map((c, i) => (
            <button key={i} className="w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-blue-50/40 flex gap-3">
              <div className="relative shrink-0">
                <span className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-200 to-indigo-200 grid place-items-center text-sm font-semibold text-gray-600">{c.name.slice(0, 1)}</span>
                {c.unread > 0 && <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">{c.unread}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 truncate">{c.name}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{c.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 truncate">↩ {c.last}</span>
                  <span className="text-gray-300 shrink-0">{c.channel}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Khu chat trống */}
      <div className="flex-1 grid place-items-center bg-[#e7e1da] text-gray-500">
        <div className="flex items-center gap-2 text-lg">💬 Xin chọn 1 hội thoại từ danh sách bên trái</div>
      </div>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

/* /ccm/stats — TỔNG QUAN. Số liệu TIN NHẮN/HỘI THOẠI lấy THẬT từ GET /messenger/stats.
 * Bình luận trang + thông số trang (fan/reach) cần Graph API → hiện đánh dấu "cần Graph API". */

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface Stats {
  days: number;
  totals: { messagesIn: number; messagesOut: number; conversations: number; newContacts: number; unreplied: number; unread: number };
  byDay: { date: string; in: number; out: number }[];
  byStaff: { name: string; replies: number }[];
}

function StatCard({ icon, label, value, tone = 'gray' }: { icon: string; label: string; value: number | string; tone?: string }) {
  const tones: Record<string, string> = { blue: 'text-[#3b5bdb]', green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-500', gray: 'text-gray-800' };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="text-sm text-gray-500 flex items-center gap-1.5"><span>{icon}</span>{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</div>
    </div>
  );
}

// Biểu đồ cột IN/OUT theo ngày (SVG tự vẽ).
function DayChart({ data }: { data: Stats['byDay'] }) {
  if (!data.length) return <div className="text-sm text-gray-400 py-8 text-center">Chưa có dữ liệu trong kỳ.</div>;
  const max = Math.max(1, ...data.map((d) => Math.max(d.in, d.out)));
  const bw = 100 / data.length;
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-40">
        {data.map((d, i) => {
          const x = i * bw;
          const hIn = (d.in / max) * 36, hOut = (d.out / max) * 36;
          return (
            <g key={d.date}>
              <rect x={x + bw * 0.15} y={38 - hIn} width={bw * 0.32} height={hIn} fill="#3b5bdb" />
              <rect x={x + bw * 0.52} y={38 - hOut} width={bw * 0.32} height={hOut} fill="#9be7d8" />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        {data.map((d) => <span key={d.date}>{d.date.slice(5)}</span>)}
      </div>
    </div>
  );
}

export default function StatsOverview() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await apiClientClient.get<Stats>(`/messenger/stats?days=${days}`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Lỗi tải thống kê'); }
    finally { setLoading(false); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#3b5bdb]">số liệu thật</span>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value={1}>Hôm nay</option><option value={7}>7 ngày</option><option value={30}>30 ngày</option>
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon="📩" label="Tin nhắn đến" value={loading ? '…' : t?.messagesIn ?? 0} tone="blue" />
        <StatCard icon="↩️" label="Tin đã trả lời" value={loading ? '…' : t?.messagesOut ?? 0} tone="green" />
        <StatCard icon="💬" label="Hội thoại" value={loading ? '…' : t?.conversations ?? 0} />
        <StatCard icon="🧑" label="Khách mới" value={loading ? '…' : t?.newContacts ?? 0} />
        <StatCard icon="⏳" label="Chưa trả lời" value={loading ? '…' : t?.unreplied ?? 0} tone="amber" />
        <StatCard icon="🔴" label="Chưa đọc" value={loading ? '…' : t?.unread ?? 0} tone="red" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="font-semibold text-gray-800 mb-1">Tin nhắn theo ngày</div>
        <div className="flex items-center gap-6 text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#3b5bdb]" /> Tin đến</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#9be7d8]" /> Tin trả lời</span>
        </div>
        {loading ? <div className="text-sm text-gray-400 py-8 text-center">Đang tải…</div> : <DayChart data={data?.byDay || []} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="font-semibold text-gray-800 mb-3">Nhân viên trả lời nhiều nhất</div>
          {!loading && !data?.byStaff.length && <div className="text-sm text-gray-400">Chưa có dữ liệu.</div>}
          <div className="space-y-2">
            {(data?.byStaff || []).map((s, i) => (
              <div key={s.name + i} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-gray-400">{i + 1}.</span>
                <span className="flex-1 text-gray-700">{s.name}</span>
                <span className="font-medium text-[#3b5bdb]">{s.replies} tin</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cần Graph API — chưa theo dõi */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3"><span className="font-semibold text-gray-800">Bình luận & thông số trang</span><span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">cần Graph API</span></div>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between"><span>💬 Bình luận trang</span><span>— chưa theo dõi</span></div>
            <div className="flex justify-between"><span>👍 Người theo dõi (fan)</span><span>— cần Graph API</span></div>
            <div className="flex justify-between"><span>👀 Tiếp cận (reach)</span><span>— cần Graph API</span></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Các chỉ số này cần gọi Graph API của Page (comments/insights) — sẽ bổ sung khi nối module đó.</p>
        </div>
      </div>
    </div>
  );
}

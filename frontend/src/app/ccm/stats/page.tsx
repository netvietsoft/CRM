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

function StatCard({ label, value, sub, subColor }: { label: string; value: number | string; sub?: string; subColor?: string }) {
  return (
    <div className="bg-white border border-[#e6e9f2] rounded-[14px] p-[17px]">
      <div className="text-[12.5px] text-[#6b7280] mb-2">{label}</div>
      <div className="text-[24px] font-extrabold tracking-[-0.5px] text-gray-900">{value}</div>
      {sub && <div className="text-[12px] font-semibold mt-[5px]" style={{ color: subColor || '#6b7280' }}>{sub}</div>}
    </div>
  );
}

// Biểu đồ cột IN/OUT theo ngày (mỗi ngày 1 cột tin đến + 1 cột tin trả lời).
function DayChart({ data }: { data: Stats['byDay'] }) {
  if (!data.length) return <div className="text-[13px] text-[#9ca3af] py-8 text-center">Chưa có dữ liệu trong kỳ.</div>;
  const max = Math.max(1, ...data.map((d) => Math.max(d.in, d.out)));
  return (
    <div className="flex items-end gap-2.5 h-[130px] overflow-x-auto">
      {data.map((d) => (
        <div key={d.date} className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 h-full justify-end">
          <div className="text-[10.5px] text-[#6b7280] font-semibold">{d.in}</div>
          <div className="w-full flex items-end justify-center gap-[3px] flex-1">
            <div className="flex-1 max-w-[20px] rounded-t-[7px] rounded-b-[3px] bg-[#3c55e6]" style={{ height: `${Math.max(2, (d.in / max) * 100)}%` }} title={`Tin đến: ${d.in}`} />
            <div className="flex-1 max-w-[20px] rounded-t-[7px] rounded-b-[3px] bg-[#9be7d8]" style={{ height: `${Math.max(2, (d.out / max) * 100)}%` }} title={`Tin trả lời: ${d.out}`} />
          </div>
          <div className="text-[11px] text-[#9ca3af] whitespace-nowrap">{d.date.slice(5)}</div>
        </div>
      ))}
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
    <div className="h-full overflow-y-auto px-[30px] py-[26px]">
      <div className="flex items-center gap-3 mb-[18px]">
        <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-gray-900">Thống kê</h1>
        <span className="text-[11.5px] font-bold px-2.5 py-[3px] rounded-lg bg-[#e8ecff] text-[#3c55e6]">số liệu thật</span>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="ml-auto border border-[#e5e7eb] rounded-[10px] px-[13px] py-2 text-[13.5px] bg-white">
          <option value={1}>Hôm nay</option><option value={7}>7 ngày</option><option value={30}>30 ngày</option>
        </select>
      </div>

      {error && <div className="bg-[#fef2f2] text-[#dc2626] text-sm px-4 py-2 rounded-[10px] mb-5">{error}</div>}

      <div className="grid gap-3.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
        <StatCard label="📩 Tin nhắn đến" value={loading ? '…' : t?.messagesIn ?? 0} sub={`↩️ Đã trả lời: ${loading ? '…' : t?.messagesOut ?? 0}`} subColor="#047857" />
        <StatCard label="💬 Hội thoại" value={loading ? '…' : t?.conversations ?? 0} sub={`🧑 Khách mới: ${loading ? '…' : t?.newContacts ?? 0}`} subColor="#6b7280" />
        <StatCard label="⏳ Chưa trả lời" value={loading ? '…' : t?.unreplied ?? 0} subColor="#c2410c" sub="cần xử lý" />
        <StatCard label="🔴 Chưa đọc" value={loading ? '…' : t?.unread ?? 0} subColor="#dc2626" sub="tin chưa đọc" />
      </div>

      <div className="bg-white border border-[#e6e9f2] rounded-[14px] p-5 mb-5">
        <div className="text-[15px] font-bold text-gray-900 mb-1">Tin nhắn 7 ngày gần nhất</div>
        <div className="flex items-center gap-6 text-[11px] text-[#6b7280] mb-4">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#3c55e6]" /> Tin đến</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#9be7d8]" /> Tin trả lời</span>
        </div>
        {loading ? <div className="text-[13px] text-[#9ca3af] py-8 text-center">Đang tải…</div> : <DayChart data={data?.byDay || []} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-white border border-[#e6e9f2] rounded-[14px] p-5">
          <div className="text-[15px] font-bold text-gray-900 mb-3">Nhân viên trả lời nhiều nhất</div>
          {!loading && !data?.byStaff.length && <div className="text-[13px] text-[#9ca3af]">Chưa có dữ liệu.</div>}
          <div className="space-y-2">
            {(data?.byStaff || []).map((s, i) => (
              <div key={s.name + i} className="flex items-center gap-2 text-[13.5px]">
                <span className="w-5 text-[#9ca3af]">{i + 1}.</span>
                <span className="flex-1 text-[#374151]">{s.name}</span>
                <span className="font-bold text-[#3c55e6]">{s.replies} tin</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cần Graph API — chưa theo dõi */}
        <div className="bg-white border border-[#e6e9f2] rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-3"><span className="text-[15px] font-bold text-gray-900">Bình luận & thông số trang</span><span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#ffedd5] text-[#c2410c]">cần Graph API</span></div>
          <div className="space-y-2 text-[13.5px] text-[#9ca3af]">
            <div className="flex justify-between"><span>💬 Bình luận trang</span><span>— chưa theo dõi</span></div>
            <div className="flex justify-between"><span>👍 Người theo dõi (fan)</span><span>— cần Graph API</span></div>
            <div className="flex justify-between"><span>👀 Tiếp cận (reach)</span><span>— cần Graph API</span></div>
          </div>
          <p className="text-[12px] text-[#9ca3af] mt-3">Các chỉ số này cần gọi Graph API của Page (comments/insights) — sẽ bổ sung khi nối module đó.</p>
        </div>
      </div>
    </div>
  );
}

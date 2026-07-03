'use client';
export const dynamic = 'force-dynamic';

/* /ccm/stats/pages — THỐNG KÊ THEO TRANG (thật, từ GET /messenger/stats → byPage). */

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface PageStat { pageId: string; name: string; externalId: string; subscribed: boolean; conversations: number; in: number; out: number; unreplied: number; unread: number }
interface Stats { byPage: PageStat[] }

export default function StatsPages() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<PageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await apiClientClient.get<Stats>(`/messenger/stats?days=${days}`); setRows(r.byPage || []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Lỗi tải thống kê'); }
    finally { setLoading(false); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  const rate = (p: PageStat) => (p.in ? Math.round((p.out / p.in) * 100) : 0); // % tin đến đã có phản hồi

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Thống kê theo trang</h1>
        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#3b5bdb]">số liệu thật</span>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value={1}>Hôm nay</option><option value={7}>7 ngày</option><option value={30}>30 ngày</option>
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                {['Trang', 'Hội thoại', 'Tin đến', 'Tin trả lời', '% phản hồi', 'Chưa trả lời', 'Chưa đọc', 'Webhook'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Đang tải…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Chưa có trang nào (đăng ký page ở khung chat).</td></tr>}
              {rows.map((p) => (
                <tr key={p.pageId} className="hover:bg-gray-50">
                  <td className="px-3 py-2"><div className="font-medium text-gray-800">{p.name}</div><div className="text-[11px] text-gray-400">{p.externalId}</div></td>
                  <td className="px-3 py-2">{p.conversations}</td>
                  <td className="px-3 py-2 text-[#3b5bdb] font-medium">{p.in}</td>
                  <td className="px-3 py-2 text-green-600 font-medium">{p.out}</td>
                  <td className="px-3 py-2">{rate(p)}%</td>
                  <td className="px-3 py-2 text-amber-600">{p.unreplied}</td>
                  <td className="px-3 py-2 text-red-500">{p.unread}</td>
                  <td className="px-3 py-2">{p.subscribed ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">● Bật</span> : <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">tắt</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">Số liệu tin nhắn/hội thoại theo trang trong {days} ngày. Fan/reach theo trang cần Graph API (chưa theo dõi).</p>
    </div>
  );
}

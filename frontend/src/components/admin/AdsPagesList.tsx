'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface AdPage {
  id: string;
  externalId: string;
  name: string | null;
  category: string | null;
  tasks: string[] | null;
  fanCount: number | null;
  followersCount: number | null;
  link: string | null;
  verificationStatus: string | null;
  isPublished: boolean | null;
  businessExternalId: string | null;
  lastSyncedAt: string | null;
}

// 7 quyền (tasks) Meta trả cho page — hiển thị HẾT, có=xanh, không=xám.
const TASKS: Array<{ key: string; label: string; title: string }> = [
  { key: 'MANAGE', label: 'Quản lý', title: 'Quản trị toàn quyền' },
  { key: 'CREATE_CONTENT', label: 'Nội dung', title: 'Tạo nội dung / bài đăng' },
  { key: 'MODERATE', label: 'Kiểm duyệt', title: 'Kiểm duyệt, trả lời bình luận/tin nhắn' },
  { key: 'MESSAGING', label: 'Nhắn tin', title: 'Nhắn tin (inbox)' },
  { key: 'ADVERTISE', label: 'Quảng cáo', title: 'Tạo & chạy quảng cáo' },
  { key: 'ANALYZE', label: 'Insights', title: 'Xem thông tin chi tiết' },
  { key: 'VIEW_MONETIZATION_INSIGHTS', label: 'Kiếm tiền', title: 'Xem dữ liệu kiếm tiền' },
];

const num = (n: number | null) => (n == null ? '0' : new Intl.NumberFormat('vi-VN').format(n));
const fmtDateTime = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
};
const isVerified = (s: string | null) => !!s && s !== 'not_verified';

type SortKey = 'name' | 'category' | 'followers' | 'verification' | 'taskCount';
const COLUMNS: Array<{ key?: SortKey; label: string; right?: boolean }> = [
  { label: 'Stt' },
  { key: 'name', label: 'Fanpage' },
  { key: 'category', label: 'Hạng mục' },
  { key: 'followers', label: 'Người theo dõi', right: true },
  { key: 'verification', label: 'Xác minh' },
  { key: 'taskCount', label: 'Quyền' },
  { label: 'Link' },
];
const followersOf = (p: AdPage) => p.followersCount ?? p.fanCount ?? 0;
const sortValue = (p: AdPage, key: SortKey): number | string => {
  switch (key) {
    case 'name': return (p.name || '').toLowerCase();
    case 'category': return (p.category || '').toLowerCase();
    case 'followers': return followersOf(p);
    case 'verification': return isVerified(p.verificationStatus) ? 1 : 0;
    case 'taskCount': return p.tasks?.length ?? 0;
  }
};

/** Bảng Fanpage — list page đã kết nối + quyền (tasks). */
export default function AdsPagesList() {
  const [pages, setPages] = useState<AdPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const flash = (m: string, ms = 6000) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiClientClient.get<AdPage[]>('/ads/pages');
      setPages(Array.isArray(list) ? list : []);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Lỗi tải danh sách Fanpage');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    flash('Đang đồng bộ từ Meta…', 60_000);
    try {
      const r = await apiClientClient.post<{ queued?: boolean; configured: boolean; pages?: number }>('/ads/sync', {});
      if (!r?.configured) flash('Chưa cấu hình credentials Meta. Vào Hệ thống → Kết nối → thẻ Meta Ads.', 8000);
      else if (r.queued) flash('Đã đưa vào hàng đợi đồng bộ. Tải lại sau ít phút để xem kết quả.', 8000);
      else { flash(`Đồng bộ xong: ${r.pages ?? 0} fanpage.`, 6000); await load(); }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Lỗi đồng bộ');
    } finally { setSyncing(false); }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };
  const sortedPages = useMemo(() => {
    if (!sortKey) return pages;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...pages].sort((a, b) => {
      const va = sortValue(a, sortKey), vb = sortValue(b, sortKey);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'vi') * dir;
    });
  }, [pages, sortKey, sortDir]);

  const lastSync = pages.find((p) => p.lastSyncedAt)?.lastSyncedAt ?? null;
  const sortIcon = (key?: SortKey) => {
    if (!key) return null;
    const active = sortKey === key;
    return <span className={`ml-1 text-[10px] ${active ? 'text-white' : 'text-slate-400'}`}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fanpage</h1>
          <p className="text-sm text-gray-500">Meta · {pages.length} trang · Đồng bộ gần nhất: {fmtDateTime(lastSync)}</p>
        </div>
        <button onClick={sync} disabled={syncing} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {syncing ? 'Đang đồng bộ…' : '↻ Đồng bộ ngay'}
        </button>
      </div>

      {msg && <div className="mb-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2 text-sm text-blue-800">{msg}</div>}

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {COLUMNS.map((c) => (
                  <th
                    key={c.label}
                    onClick={c.key ? () => toggleSort(c.key!) : undefined}
                    className={`px-3 py-3 text-xs font-semibold uppercase whitespace-nowrap ${c.right ? 'text-right' : ''} ${c.key ? 'cursor-pointer select-none hover:bg-slate-700' : ''}`}
                  >
                    <span className={`inline-flex items-center ${c.right ? 'flex-row-reverse' : ''}`}>{c.label}{sortIcon(c.key)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-gray-400">Đang tải…</td></tr>
              ) : sortedPages.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-gray-400">Chưa có fanpage. Bấm “Đồng bộ ngay” (cần credentials Meta).</td></tr>
              ) : (
                sortedPages.map((p, idx) => {
                  const granted = new Set(p.tasks || []);
                  return (
                    <tr key={p.id} className={`${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'} hover:bg-blue-50/40`}>
                      <td className="px-3 py-3 text-gray-500 align-top">{idx + 1}</td>
                      <td className="px-3 py-3 max-w-[240px] align-top">
                        <div className="font-medium text-gray-800 truncate" title={p.name || ''}>{p.name || '—'}</div>
                        <div className="text-xs text-gray-400 font-mono">ID: {p.externalId}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top text-gray-600">{p.category || '—'}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap align-top">{num(followersOf(p))}</td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        {isVerified(p.verificationStatus)
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">✓ Đã xác minh</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Chưa</span>}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {p.tasks == null ? (
                          <span className="text-xs text-gray-400 italic">không có token</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[340px]">
                            {TASKS.map((t) => {
                              const on = granted.has(t.key);
                              return (
                                <span
                                  key={t.key}
                                  title={`${t.title}${on ? '' : ' (không có quyền)'}`}
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}
                                >
                                  {t.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        {p.link ? <a href={p.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>Mở ↗</a> : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

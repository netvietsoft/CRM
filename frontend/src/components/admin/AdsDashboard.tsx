'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatNumber, formatVnd } from '@/lib/format';

interface AdAccount {
  id: string;
  externalId: string;
  platform: string;
  name: string | null;
  currency: string | null;
  status: string | null;
  lastSyncedAt: string | null;
}
interface AdSummary {
  spend: number; impressions: number; reach: number; clicks: number; uniqueClicks: number; results: number;
  ctr: number; cpc: number; cpm: number; costPerResult: number;
  purchaseValue: number; roas: number; adsCostPct: number;
}
interface AdCampaignRow {
  id: string; externalId: string | null; name: string | null; status: string | null; objective: string | null;
  dailyBudget: number | null; lifetimeBudget: number | null;
  spend: number; impressions: number; reach: number; clicks: number; results: number;
  ctr: number; cpc: number; cpm: number; costPerResult: number;
  purchaseValue?: number; roas?: number; adsCostPct?: number; // giá trị mua + ROAS + % ads cost
  resultType?: string | null; // loại kết quả chủ đạo (purchase/messaging/lead…)
  metrics?: Record<string, number>; // tổng theo từng FB action_type (động)
}

// Nhãn tiếng Việt cho action_type của Facebook (fallback: tự rút gọn mã).
const ACTION_LABEL: Record<string, string> = {
  'offsite_conversion.fb_pixel_purchase': 'Lượt mua (pixel)',
  omni_purchase: 'Lượt mua', purchase: 'Lượt mua', 'onsite_conversion.purchase': 'Lượt mua (onsite)',
  onsite_web_purchase: 'Lượt mua (web)', onsite_app_purchase: 'Lượt mua (app)', onsite_web_app_purchase: 'Lượt mua (web/app)',
  'onsite_conversion.lead': 'Lead', lead: 'Lead', onsite_web_lead: 'Lead (web)', 'onsite_conversion.lead_grouped': 'Lead (gộp)',
  'onsite_conversion.messaging_conversation_started_7d': 'Tin nhắn bắt đầu',
  'onsite_conversion.total_messaging_connection': 'Kết nối tin nhắn',
  'onsite_conversion.messaging_first_reply': 'Tin nhắn trả lời đầu',
  'onsite_conversion.messaging_conversation_replied_7d': 'Tin nhắn được trả lời',
  link_click: 'Click link', landing_page_view: 'Xem trang đích',
  'onsite_conversion.initiate_checkout': 'Bắt đầu thanh toán', omni_initiated_checkout: 'Bắt đầu thanh toán', onsite_web_initiate_checkout: 'Bắt đầu thanh toán (web)',
  post_engagement: 'Tương tác bài viết', page_engagement: 'Tương tác trang',
  video_view: 'Lượt xem video', photo_view: 'Lượt xem ảnh',
  post_reaction: 'Cảm xúc', like: 'Lượt thích', comment: 'Bình luận', post: 'Chia sẻ bài', 'onsite_conversion.post_save': 'Lưu bài',
};
const actionLabel = (t: string) => ACTION_LABEL[t] || t.replace(/^onsite_conversion\./, '').replace(/_/g, ' ');

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const pct = (n: number) => `${(n || 0).toFixed(2)}%`;

// 'YYYY-MM-DD' theo giờ local (tránh lệch ngày do toISOString về UTC).
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Đầu tuần = Thứ 2.
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

const DATE_PRESETS: Array<{ key: string; label: string }> = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'thisWeek', label: 'Tuần này' },
  { key: 'lastWeek', label: 'Tuần trước' },
  { key: 'thisMonth', label: 'Tháng này' },
  { key: 'thisQuarter', label: 'Quý này' },
  { key: 'all', label: 'Tất cả' },
];

/** Trả [from, to] dạng 'YYYY-MM-DD' cho preset. */
const presetRange = (key: string): [string, string] => {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let f = t, e = t;
  switch (key) {
    case 'today': break;
    case 'yesterday': { const y = new Date(t); y.setDate(t.getDate() - 1); f = y; e = y; break; }
    case 'thisWeek': { f = startOfWeek(t); break; }
    case 'lastWeek': { const s = startOfWeek(t); f = new Date(s); f.setDate(s.getDate() - 7); e = new Date(s); e.setDate(s.getDate() - 1); break; }
    case 'thisMonth': { f = new Date(t.getFullYear(), t.getMonth(), 1); break; }
    case 'thisQuarter': { f = new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1); break; }
    case 'all': { f = new Date(2000, 0, 1); break; }
  }
  return [ymd(f), ymd(e)];
};
const fmtDateTime = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
};

const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-gray-100 text-gray-600',
  DELETED: 'bg-red-100 text-red-700',
};

// URL theo tài khoản: '' (rỗng) = tất cả → /admin/adsmeta/accall; ngược lại → /admin/adsmeta/<id>.
const accountHref = (id: string) => (id ? `/admin/adsmeta/${id}` : '/admin/adsmeta/accall');

/**
 * Dashboard Meta Ads dùng chung cho 2 route: accall (accountId='') và [accountId].
 * accountId quyết định phạm vi dữ liệu; đổi tài khoản ở dropdown sẽ điều hướng sang URL tương ứng.
 */
export default function AdsDashboard({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState<AdSummary | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaignRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m: string, ms = 5000) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); };

  const loadAccounts = useCallback(async () => {
    try {
      const list = await apiClientClient.get<AdAccount[]>('/ads/accounts');
      setAccounts(Array.isArray(list) ? list : []);
    } catch { setAccounts([]); }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to });
      if (accountId) qs.set('accountId', accountId);
      const [sum, camps] = await Promise.all([
        apiClientClient.get<AdSummary>(`/ads/summary?${qs.toString()}`),
        apiClientClient.get<AdCampaignRow[]>(`/ads/campaigns?${qs.toString()}`),
      ]);
      setSummary(sum);
      setCampaigns(Array.isArray(camps) ? camps : []);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Lỗi tải dữ liệu quảng cáo');
    } finally {
      setLoading(false);
    }
  }, [from, to, accountId]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  useEffect(() => { void loadData(); }, [loadData]);

  const sync = async () => {
    setSyncing(true);
    flash('Đang đồng bộ từ Meta Ads…', 60_000);
    try {
      const r = await apiClientClient.post<{ queued?: boolean; configured: boolean; accounts?: number; campaigns?: number; adSets?: number; ads?: number; insightRows?: number }>('/ads/sync', {});
      if (!r?.configured) {
        flash('Chưa cấu hình credentials Meta (token). Vào Hệ thống → Kết nối → thẻ Meta Ads.', 8000);
      } else if (r.queued) {
        flash('Đã đưa vào hàng đợi đồng bộ. Dữ liệu sẽ cập nhật sau ít phút — bấm tải lại để xem kết quả.', 8000);
      } else {
        flash(`Đồng bộ xong: ${r.accounts ?? 0} tài khoản, ${r.campaigns ?? 0} chiến dịch, ${r.adSets ?? 0} nhóm QC, ${r.ads ?? 0} quảng cáo, ${formatNumber(r.insightRows ?? 0)} dòng chỉ số.`, 8000);
        await loadAccounts();
        await loadData();
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Lỗi đồng bộ');
    } finally {
      setSyncing(false);
    }
  };

  const lastSync = accounts.find((a) => a.id === accountId)?.lastSyncedAt ?? accounts[0]?.lastSyncedAt ?? null;
  const currentAccountExtId = accounts.find((a) => a.id === accountId)?.externalId ?? null;

  const kpis: Array<{ label: string; value: string }> = summary
    ? [
        { label: 'Chi tiêu', value: formatVnd(summary.spend) },
        { label: 'Kết quả', value: formatNumber(summary.results) },
        { label: 'Tổng giá trị lượt mua', value: formatVnd(summary.purchaseValue) },
        { label: 'Avg ROAS', value: `${(summary.roas || 0).toFixed(2)}x` },
        { label: 'Avg Ads Cost', value: `${(summary.adsCostPct || 0).toFixed(1)}%` },
        { label: 'Avg CP/kết quả', value: formatVnd(summary.costPerResult) },
        { label: 'Hiển thị', value: formatNumber(summary.impressions) },
        { label: 'Click', value: formatNumber(summary.clicks) },
        { label: 'CTR', value: pct(summary.ctr) },
      ]
    : [];

  // ----- Cấu hình cột: base (cố định) + động (sinh từ FB action_type) -----
  type Column = { key: string; label: string; align: 'left' | 'right'; fmt?: (v: number) => string; accessor?: (r: AdCampaignRow) => number; dynamic?: boolean };
  const budgetOf = (r: AdCampaignRow) => r.dailyBudget ?? r.lifetimeBudget ?? 0;
  const BASE_COLUMNS: Column[] = [
    { key: 'name', label: 'Chiến dịch', align: 'left' },
    { key: 'status', label: 'Trạng thái', align: 'left' },
    { key: 'objective', label: 'Mục tiêu', align: 'left' },
    { key: 'spend', label: 'Chi tiêu', align: 'right', fmt: formatVnd },
    { key: 'impressions', label: 'Hiển thị', align: 'right', fmt: formatNumber },
    { key: 'reach', label: 'Tiếp cận', align: 'right', fmt: formatNumber },
    { key: 'clicks', label: 'Click', align: 'right', fmt: formatNumber },
    { key: 'ctr', label: 'CTR', align: 'right', fmt: pct },
    { key: 'cpc', label: 'CPC', align: 'right', fmt: formatVnd },
    { key: 'cpm', label: 'CPM', align: 'right', fmt: formatVnd },
    { key: 'results', label: 'Kết quả', align: 'right', fmt: formatNumber },
    { key: 'costPerResult', label: 'CP/kết quả', align: 'right', fmt: formatVnd },
    { key: 'purchaseValue', label: 'Giá trị mua', align: 'right', fmt: formatVnd },
    { key: 'roas', label: 'ROAS', align: 'right', fmt: (v) => `${(v || 0).toFixed(2)}x` },
    { key: 'adsCostPct', label: '% Ads Cost', align: 'right', fmt: (v) => `${(v || 0).toFixed(1)}%` },
    { key: 'budget', label: 'Ngân sách', align: 'right', fmt: formatVnd, accessor: budgetOf },
  ];
  // Cột hiện mặc định; phần còn lại (reach, budget, cột động) ẩn — bật qua nút "Cột".
  const DEFAULT_VISIBLE = ['name', 'status', 'objective', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'results', 'costPerResult', 'purchaseValue', 'roas', 'adsCostPct'];

  // Cột động: mọi action_type có trong dữ liệu chiến dịch.
  const metricKeys = useMemo(() => {
    const s = new Set<string>();
    for (const c of campaigns) if (c.metrics) for (const k of Object.keys(c.metrics)) if (c.metrics[k]) s.add(k);
    return [...s].sort();
  }, [campaigns]);
  const allColumns: Column[] = useMemo(() => [
    ...BASE_COLUMNS,
    ...metricKeys.map((k): Column => ({ key: `m:${k}`, label: actionLabel(k), align: 'right', fmt: formatNumber, accessor: (r) => r.metrics?.[k] ?? 0, dynamic: true })),
  ], [metricKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const colValue = (col: Column, r: AdCampaignRow): string | number =>
    col.accessor ? col.accessor(r) : (r[col.key as keyof AdCampaignRow] as string | number);

  const STORAGE_KEY = 'adsDash.cols.v1';
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (s?.visible) return new Set<string>(s.visible); } catch { /* ignore */ }
    }
    return new Set(DEFAULT_VISIBLE);
  });
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const toggleCol = (key: string) => setVisibleKeys((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Thứ tự cột (kéo–thả). 'name' luôn ghim đầu. Lưu localStorage để giữ sau F5.
  const [colOrder, setColOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (Array.isArray(s?.order)) return s.order as string[]; } catch { /* ignore */ }
    }
    return [];
  });
  const [dragKey, setDragKey] = useState<string | null>(null);

  // Đồng bộ colOrder với tập cột hiện có (giữ thứ tự user, nối thêm cột mới — vd cột động).
  useEffect(() => {
    setColOrder((prev) => {
      const allKeys = allColumns.map((c) => c.key);
      const kept = prev.filter((k) => allKeys.includes(k));
      const added = allKeys.filter((k) => !kept.includes(k));
      if (added.length === 0 && kept.length === prev.length) return prev;
      const next = [...kept, ...added];
      const ni = next.indexOf('name');
      if (ni > 0) { next.splice(ni, 1); next.unshift('name'); }
      return next;
    });
  }, [allColumns]);

  // Lưu bố cục cột.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: colOrder, visible: [...visibleKeys] })); } catch { /* ignore */ }
  }, [colOrder, visibleKeys]);

  const colByKey = new Map(allColumns.map((c) => [c.key, c]));
  const orderedKeys = colOrder.length ? colOrder : allColumns.map((c) => c.key);
  const visibleColumns = orderedKeys.map((k) => colByKey.get(k)).filter((c): c is Column => !!c && visibleKeys.has(c.key));

  // Kéo cột `from` thả trước cột `to`. Không di chuyển 'name' (ghim đầu).
  const moveCol = (from: string | null, to: string) => {
    if (!from || from === to || from === 'name' || to === 'name') return;
    setColOrder((prev) => {
      const base = (prev.length ? [...prev] : allColumns.map((c) => c.key));
      const fi = base.indexOf(from);
      if (fi < 0 || base.indexOf(to) < 0) return prev;
      base.splice(fi, 1);
      base.splice(base.indexOf(to), 0, from);
      const ni = base.indexOf('name');
      if (ni > 0) { base.splice(ni, 1); base.unshift('name'); }
      return base;
    });
  };

  // ----- Sắp xếp (client-side, chỉ cho cấp chiến dịch) -----
  const [sortKey, setSortKey] = useState<string>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'name' || key === 'status' || key === 'objective' ? 'asc' : 'desc'); }
  };
  const sortIcon = (key: string) => (key === sortKey ? (sortDir === 'asc' ? '▲' : '▼') : '⇅');

  const sortedCampaigns = useMemo(() => {
    const col = allColumns.find((c) => c.key === sortKey) ?? BASE_COLUMNS[3];
    const arr = [...campaigns];
    arr.sort((a, b) => {
      const av = colValue(col, a); const bv = colValue(col, b);
      const cmp = typeof av === 'number' || typeof bv === 'number'
        ? ((av as number) || 0) - ((bv as number) || 0)
        : String(av ?? '').localeCompare(String(bv ?? ''), 'vi');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [campaigns, sortKey, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Drill-down: chiến dịch → nhóm QC → quảng cáo -----
  const [expandedC, setExpandedC] = useState<Set<string>>(new Set());
  const [expandedS, setExpandedS] = useState<Set<string>>(new Set());
  const [adSetsByC, setAdSetsByC] = useState<Record<string, AdCampaignRow[] | 'loading'>>({});
  const [adsByS, setAdsByS] = useState<Record<string, AdCampaignRow[] | 'loading'>>({});
  const [rowMenu, setRowMenu] = useState<string | null>(null);

  // Đổi ngày/tài khoản → reset drill-down + cache.
  useEffect(() => { setExpandedC(new Set()); setExpandedS(new Set()); setAdSetsByC({}); setAdsByS({}); }, [from, to, accountId]);

  const fetchChildren = useCallback(async (path: string): Promise<AdCampaignRow[]> => {
    const qs = new URLSearchParams({ from, to });
    const r = await apiClientClient.get<AdCampaignRow[]>(`${path}?${qs.toString()}`);
    return Array.isArray(r) ? r : [];
  }, [from, to]);

  const toggleC = (id: string) => {
    const willExpand = !expandedC.has(id);
    setExpandedC((prev) => { const n = new Set(prev); willExpand ? n.add(id) : n.delete(id); return n; });
    if (willExpand && !adSetsByC[id]) {
      setAdSetsByC((p) => ({ ...p, [id]: 'loading' }));
      fetchChildren(`/ads/campaigns/${id}/adsets`).then((rows) => setAdSetsByC((p) => ({ ...p, [id]: rows }))).catch(() => setAdSetsByC((p) => ({ ...p, [id]: [] })));
    }
  };
  const toggleS = (id: string) => {
    const willExpand = !expandedS.has(id);
    setExpandedS((prev) => { const n = new Set(prev); willExpand ? n.add(id) : n.delete(id); return n; });
    if (willExpand && !adsByS[id]) {
      setAdsByS((p) => ({ ...p, [id]: 'loading' }));
      fetchChildren(`/ads/adsets/${id}/ads`).then((rows) => setAdsByS((p) => ({ ...p, [id]: rows }))).catch(() => setAdsByS((p) => ({ ...p, [id]: [] })));
    }
  };

  // Danh sách phẳng để render (chiến dịch + nhóm QC + quảng cáo đã mở).
  type FlatRow = { kind: 'campaign' | 'adset' | 'ad' | 'loading'; row?: AdCampaignRow; level: number; expandable?: boolean; expanded?: boolean; key: string };
  const flatRows = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = [];
    for (const c of sortedCampaigns) {
      const cEx = expandedC.has(c.id);
      out.push({ kind: 'campaign', row: c, level: 0, expandable: true, expanded: cEx, key: `c:${c.id}` });
      if (!cEx) continue;
      const sets = adSetsByC[c.id];
      if (sets === undefined || sets === 'loading') { out.push({ kind: 'loading', level: 1, key: `cl:${c.id}` }); continue; }
      for (const s of sets) {
        const sEx = expandedS.has(s.id);
        out.push({ kind: 'adset', row: s, level: 1, expandable: true, expanded: sEx, key: `s:${s.id}` });
        if (!sEx) continue;
        const ads = adsByS[s.id];
        if (ads === undefined || ads === 'loading') { out.push({ kind: 'loading', level: 2, key: `sl:${s.id}` }); continue; }
        for (const a of ads) out.push({ kind: 'ad', row: a, level: 2, expandable: false, key: `a:${a.id}` });
      }
    }
    return out;
  }, [sortedCampaigns, expandedC, expandedS, adSetsByC, adsByS]);

  const copyId = (externalId: string | null) => {
    if (!externalId) return;
    void navigator.clipboard.writeText(externalId);
    flash(`Đã copy ID: ${externalId}`, 2500);
    setRowMenu(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quảng cáo</h1>
          <p className="text-sm text-gray-500">Chiến dịch &amp; chỉ số tài khoản quảng cáo (Meta). Đồng bộ gần nhất: {fmtDateTime(lastSync)}</p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {syncing ? 'Đang đồng bộ…' : '↻ Đồng bộ ngay'}
        </button>
      </div>

      {msg && <div className="mb-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2 text-sm text-blue-800">{msg}</div>}

      {/* Bộ lọc */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-3">
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Tài khoản</span>
          <select value={accountId} onChange={(e) => router.push(accountHref(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-[220px]">
            <option value="">Tất cả tài khoản</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name || a.externalId}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Từ ngày</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Đến ngày</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </label>
        {/* Tìm kiếm nhanh theo khoảng ngày */}
        <div className="w-full flex flex-wrap items-center gap-2 pt-1">
          {DATE_PRESETS.map((p) => {
            const [pf, pe] = presetRange(p.key);
            const active = pf === from && pe === to;
            return (
              <button
                key={p.key}
                onClick={() => { setFrom(pf); setTo(pe); }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-[#375DED] text-white border-[#375DED]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >{p.label}</button>
            );
          })}
        </div>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
            <div className="text-[11px] text-gray-500 truncate" title={k.label}>{k.label}</div>
            <div className="mt-0.5 text-base font-bold text-gray-800 truncate" title={k.value}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Thanh công cụ: nút mở popup chọn cột */}
      <div className="mb-3 flex items-center justify-end">
        <button onClick={() => setColMenuOpen(true)} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">⚙ Cột ({visibleColumns.length}/{allColumns.length})</button>
      </div>

      {/* Popup chọn cột */}
      {colMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setColMenuOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-800">Hiển thị cột <span className="text-sm font-normal text-gray-400">({visibleColumns.length}/{allColumns.length})</span></h2>
              <button className="text-2xl leading-none text-gray-400 hover:text-gray-600" onClick={() => setColMenuOpen(false)}>✕</button>
            </div>

            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-2 text-sm">
              <button onClick={() => setVisibleKeys(new Set(allColumns.map((c) => c.key)))} className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Chọn tất cả</button>
              <button onClick={() => setVisibleKeys(new Set(DEFAULT_VISIBLE))} className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Mặc định</button>
              <button onClick={() => setVisibleKeys(new Set(['name']))} className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Bỏ chọn hết</button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold text-gray-400 uppercase">Cột cơ bản</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                  {allColumns.filter((c) => !c.dynamic && c.key !== 'name').map((c) => (
                    <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={visibleKeys.has(c.key)} onChange={() => toggleCol(c.key)} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {allColumns.some((c) => c.dynamic) && (
                <div>
                  <div className="mb-2 text-xs font-semibold text-gray-400 uppercase">Chỉ số Facebook (động)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                    {allColumns.filter((c) => c.dynamic).map((c) => (
                      <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" checked={visibleKeys.has(c.key)} onChange={() => toggleCol(c.key)} />
                        <span className="truncate" title={c.label}>{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-200 p-4">
              <button onClick={() => setColMenuOpen(false)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Xong</button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop đóng menu thao tác dòng */}
      {rowMenu && <div className="fixed inset-0 z-10" onClick={() => setRowMenu(null)} />}

      {/* Bảng campaign (drill-down: chiến dịch → nhóm QC → quảng cáo) */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#375DED] text-white">
                {visibleColumns.map((col) => {
                  const draggable = col.key !== 'name';
                  return (
                    <th
                      key={col.key}
                      draggable={draggable}
                      onDragStart={draggable ? () => setDragKey(col.key) : undefined}
                      onDragOver={draggable ? (e) => e.preventDefault() : undefined}
                      onDrop={draggable ? () => { moveCol(dragKey, col.key); setDragKey(null); } : undefined}
                      onDragEnd={() => setDragKey(null)}
                      onClick={() => toggleSort(col.key)}
                      title={draggable ? 'Kéo để đổi vị trí · Click để sắp xếp' : 'Click để sắp xếp'}
                      className={`px-4 py-3 whitespace-nowrap font-bold select-none hover:bg-[#2f51c9] ${draggable ? 'cursor-move' : 'cursor-pointer'} ${dragKey === col.key ? 'opacity-50' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        <span>{col.label}</span>
                        <span className={`text-[11px] ${col.key === sortKey ? 'opacity-100' : 'opacity-40'}`}>{sortIcon(col.key)}</span>
                      </span>
                    </th>
                  );
                })}
                <th className="px-2 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={visibleColumns.length + 1} className="px-4 py-10 text-center text-gray-400">Đang tải…</td></tr>
              ) : flatRows.length === 0 ? (
                <tr><td colSpan={visibleColumns.length + 1} className="px-4 py-10 text-center text-gray-400">Chưa có dữ liệu. Bấm “Đồng bộ ngay” (cần credentials Meta).</td></tr>
              ) : (() => {
                let cIdx = -1;
                return flatRows.map((fr) => {
                  if (fr.kind === 'loading') {
                    return (
                      <tr key={fr.key} className="bg-white">
                        <td colSpan={visibleColumns.length + 1} className="py-2 text-xs text-gray-400" style={{ paddingLeft: 16 + fr.level * 20 }}>Đang tải…</td>
                      </tr>
                    );
                  }
                  const r = fr.row!;
                  if (fr.kind === 'campaign') cIdx++;
                  const bg = fr.kind === 'campaign' ? (cIdx % 2 === 1 ? 'bg-[#F5F9FC]' : 'bg-white') : fr.kind === 'adset' ? 'bg-[#EEF3FF]' : 'bg-[#F8FAFF]';
                  return (
                    <tr key={fr.key} className={`${bg} hover:bg-[#EBEBEB] transition-colors`}>
                      {visibleColumns.map((col) => {
                        if (col.key === 'name') {
                          return (
                            <td key={col.key} className="px-4 py-3" style={{ paddingLeft: 16 + fr.level * 20 }}>
                              <div className="flex items-center gap-2 max-w-[320px]">
                                {fr.expandable ? (
                                  <button
                                    onClick={() => (fr.kind === 'campaign' ? toggleC(r.id) : toggleS(r.id))}
                                    className="w-4 shrink-0 text-gray-400 hover:text-gray-700"
                                  >{fr.expanded ? '▼' : '▶'}</button>
                                ) : <span className="w-4 shrink-0" />}
                                <span className={`truncate ${fr.kind === 'campaign' ? 'font-medium' : ''}`} title={r.name || ''}>{r.name || r.externalId}</span>
                              </div>
                            </td>
                          );
                        }
                        if (col.key === 'status') {
                          return (
                            <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[r.status || ''] || 'bg-gray-100 text-gray-600'}`}>{r.status || '—'}</span>
                            </td>
                          );
                        }
                        if (col.key === 'objective') {
                          return <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-600">{r.objective || '—'}</td>;
                        }
                        if (col.key === 'results') {
                          return (
                            <td key={col.key} className="px-4 py-3 whitespace-nowrap text-right">
                              <div>{formatNumber(r.results)}</div>
                              {r.resultType && <div className="text-[11px] text-gray-400">{actionLabel(r.resultType)}</div>}
                            </td>
                          );
                        }
                        const val = colValue(col, r) as number;
                        return (
                          <td key={col.key} className={`px-4 py-3 whitespace-nowrap text-right ${col.key === 'spend' ? 'font-semibold' : ''}`}>
                            {col.fmt ? col.fmt(val) : val}
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-right relative whitespace-nowrap">
                        <button onClick={() => setRowMenu(rowMenu === fr.key ? null : fr.key)} className="px-2 text-gray-400 hover:text-gray-700">⋯</button>
                        {rowMenu === fr.key && (
                          <div className="absolute right-2 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg text-left">
                            <button onClick={() => copyId(r.externalId)} className="block w-full px-3 py-2 text-sm hover:bg-gray-50">Sao chép ID</button>
                            <a
                              href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns${currentAccountExtId ? `?act=${currentAccountExtId}` : ''}`}
                              target="_blank" rel="noreferrer"
                              onClick={() => setRowMenu(null)}
                              className="block w-full px-3 py-2 text-sm hover:bg-gray-50"
                            >Mở Meta Ads Manager ↗</a>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

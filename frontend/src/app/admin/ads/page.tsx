'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
}
interface AdCampaignRow {
  id: string; externalId: string | null; name: string | null; status: string | null; objective: string | null;
  dailyBudget: number | null; lifetimeBudget: number | null;
  spend: number; impressions: number; reach: number; clicks: number; results: number;
  ctr: number; cpc: number; cpm: number; costPerResult: number;
}

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const pct = (n: number) => `${(n || 0).toFixed(2)}%`;
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

export default function AdsPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [accountId, setAccountId] = useState(searchParams.get('accountId') || '');

  // Đồng bộ accountId khi điều hướng từ sidebar (Quảng cáo → Meta Ads → BM → tài khoản).
  useEffect(() => { setAccountId(searchParams.get('accountId') || ''); }, [searchParams]);
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

  const kpis: Array<{ label: string; value: string }> = summary
    ? [
        { label: 'Chi tiêu', value: formatVnd(summary.spend) },
        { label: 'Hiển thị', value: formatNumber(summary.impressions) },
        { label: 'Tiếp cận', value: formatNumber(summary.reach) },
        { label: 'Click', value: formatNumber(summary.clicks) },
        { label: 'CTR', value: pct(summary.ctr) },
        { label: 'CPC', value: formatVnd(summary.cpc) },
        { label: 'CPM', value: formatVnd(summary.cpm) },
        { label: 'Kết quả', value: formatNumber(summary.results) },
        { label: 'Chi phí/kết quả', value: formatVnd(summary.costPerResult) },
      ]
    : [];

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
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-[220px]">
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
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className="mt-1 text-lg font-bold text-gray-800">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Bảng campaign */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold text-gray-500">
                <th className="px-4 py-3 whitespace-nowrap">Chiến dịch</th>
                <th className="px-4 py-3 whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-3 whitespace-nowrap">Mục tiêu</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Chi tiêu</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Hiển thị</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Click</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">CTR</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">CPC</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">CPM</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Kết quả</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">CP/kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">Đang tải…</td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">Chưa có dữ liệu. Bấm “Đồng bộ ngay” (cần credentials Meta).</td></tr>
              ) : (
                campaigns.map((c, idx) => (
                  <tr key={c.id} className={idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-3 max-w-[280px] truncate" title={c.name || ''}>{c.name || c.externalId}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[c.status || ''] || 'bg-gray-100 text-gray-600'}`}>{c.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{c.objective || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-semibold">{formatVnd(c.spend)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatNumber(c.impressions)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatNumber(c.clicks)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{pct(c.ctr)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatVnd(c.cpc)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatVnd(c.cpm)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatNumber(c.results)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatVnd(c.costPerResult)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

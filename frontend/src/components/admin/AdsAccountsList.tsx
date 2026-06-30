'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface AdAccount {
  id: string;
  externalId: string;
  name: string | null;
  currency: string | null;
  status: string | null;
  accountStatus: number | null;
  balance: number | null;
  spendCap: number | null;
  amountSpent: number | null;
  fundingDetails: { display_string?: string; type?: number; coupon?: unknown } | null;
  businessExternalId: string | null;
  businessName: string | null;
  lastSyncedAt: string | null;
}

// "Cách thanh toán": ưu tiên display_string của Meta (VISA *7741 / Mastercard *6882);
// có coupon mà không có thẻ → tín dụng quảng cáo.
const paymentLabel = (fd: AdAccount['fundingDetails']): string => {
  if (fd?.display_string) return fd.display_string;
  if (fd?.coupon) return 'Tín dụng quảng cáo';
  return '—';
};
const paymentIcon = (fd: AdAccount['fundingDetails']): string => {
  const s = (fd?.display_string || '').toLowerCase();
  if (s.includes('visa') || s.includes('master') || s.includes('amex') || s.includes('american')) return '💳';
  if (fd?.coupon) return '🎁';
  return '💳';
};

// Mã trạng thái tài khoản Meta (account_status) → nhãn + màu.
const ACC_STATUS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Live', cls: 'text-green-600' },
  2: { label: 'Vô hiệu', cls: 'text-red-600' },
  3: { label: 'Chưa thanh toán', cls: 'text-amber-600' },
  7: { label: 'Đang review', cls: 'text-amber-600' },
  8: { label: 'Chờ quyết toán', cls: 'text-amber-600' },
  9: { label: 'Gia hạn', cls: 'text-amber-600' },
  100: { label: 'Chờ đóng', cls: 'text-gray-500' },
  101: { label: 'Đã đóng', cls: 'text-gray-500' },
};

const num = (n: number | null) => (n == null ? '0' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n));
const stripAct = (id: string) => id.replace(/^act_/, '');
const fmtDateTime = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
};

// ----- Cấu hình cột + khoá sắp xếp -----
type SortKey = 'name' | 'status' | 'payment' | 'currency' | 'balance' | 'spendCap' | 'amountSpent' | 'type';
const COLUMNS: Array<{ key?: SortKey; label: string; right?: boolean }> = [
  { label: 'Stt' },
  { key: 'name', label: 'Tài khoản' },
  { key: 'status', label: 'Status' },
  { key: 'payment', label: 'Cách thanh toán' },
  { key: 'currency', label: 'Tiền tệ' },
  { key: 'balance', label: 'Dư nợ', right: true },
  { key: 'spendCap', label: 'Limit', right: true },
  { key: 'amountSpent', label: 'Đã tiêu', right: true },
  { key: 'type', label: 'Loại TK' },
  { label: 'Action' },
];
// Giá trị dùng để so sánh khi sắp xếp (số hoặc chuỗi).
const sortValue = (a: AdAccount, key: SortKey): number | string => {
  switch (key) {
    case 'name': return (a.name || '').toLowerCase();
    case 'status': return a.accountStatus ?? -1;
    case 'payment': return paymentLabel(a.fundingDetails).toLowerCase();
    case 'currency': return a.currency || '';
    case 'balance': return a.balance ?? 0;
    case 'spendCap': return a.spendCap ?? 0;
    case 'amountSpent': return a.amountSpent ?? 0;
    case 'type': return a.businessExternalId ? 1 : 0;
  }
};

/** Bảng "Tất cả tài khoản" — mỗi dòng 1 ad account; click mở dashboard tài khoản đó. */
export default function AdsAccountsList() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const flash = (m: string, ms = 6000) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiClientClient.get<AdAccount[]>('/ads/accounts');
      setAccounts(Array.isArray(list) ? list : []);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Lỗi tải danh sách tài khoản');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    flash('Đang đồng bộ từ Meta Ads…', 60_000);
    try {
      const r = await apiClientClient.post<{ queued?: boolean; configured: boolean; accounts?: number }>('/ads/sync', {});
      if (!r?.configured) flash('Chưa cấu hình credentials Meta. Vào Hệ thống → Kết nối → thẻ Meta Ads.', 8000);
      else if (r.queued) flash('Đã đưa vào hàng đợi đồng bộ. Tải lại sau ít phút để xem kết quả.', 8000);
      else { flash(`Đồng bộ xong: ${r.accounts ?? 0} tài khoản.`, 6000); await load(); }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Lỗi đồng bộ');
    } finally { setSyncing(false); }
  };

  // Click header: cùng cột → đảo chiều; cột mới → set cột đó (mặc định desc).
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedAccounts = useMemo(() => {
    if (!sortKey) return accounts;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...accounts].sort((a, b) => {
      const va = sortValue(a, sortKey), vb = sortValue(b, sortKey);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'vi') * dir;
    });
  }, [accounts, sortKey, sortDir]);

  const lastSync = accounts[0]?.lastSyncedAt ?? null;

  // Header tối, chữ trắng; cột sắp xếp được có icon (↕ mờ / ▲ / ▼) + click.
  const sortIcon = (key?: SortKey) => {
    if (!key) return null;
    const active = sortKey === key;
    return <span className={`ml-1 text-[10px] ${active ? 'text-white' : 'text-slate-400'}`}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tất cả tài khoản quảng cáo</h1>
          <p className="text-sm text-gray-500">Meta Ads · {accounts.length} tài khoản · Đồng bộ gần nhất: {fmtDateTime(lastSync)}</p>
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
              ) : sortedAccounts.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-gray-400">Chưa có tài khoản. Bấm “Đồng bộ ngay” (cần credentials Meta).</td></tr>
              ) : (
                sortedAccounts.map((a, idx) => {
                  const href = `/admin/adsmeta/${a.id}`;
                  const st = a.accountStatus != null ? ACC_STATUS[a.accountStatus] : undefined;
                  const isBm = !!a.businessExternalId;
                  return (
                    <tr key={a.id} onClick={() => router.push(href)} className={`${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'} hover:bg-blue-50/60 cursor-pointer`}>
                      <td className="px-3 py-3 text-gray-500 align-top">{idx + 1}</td>
                      <td className="px-3 py-3 max-w-[260px]">
                        <div className="font-medium text-gray-800 truncate" title={a.name || ''}>{a.name || '—'}</div>
                        <div className="text-xs text-gray-400 font-mono">ID: {stripAct(a.externalId)}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        <span className={`inline-flex items-center gap-1 font-medium ${st?.cls || 'text-gray-500'}`}>
                          <span className="text-[10px]">●</span>{st?.label || (a.accountStatus ?? '—')}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top text-gray-700" title={a.fundingDetails?.display_string || ''}>
                        <span className="mr-1">{paymentIcon(a.fundingDetails)}</span>{paymentLabel(a.fundingDetails)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">{a.currency || '—'}</td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap align-top">{num(a.balance)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap align-top">{a.spendCap && a.spendCap > 0 ? num(a.spendCap) : <span className="text-gray-400">No limit</span>}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap align-top">{num(a.amountSpent)}</td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isBm ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`} title={a.businessName || ''}>{isBm ? 'BM' : 'CN'}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Link href={href} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline" title="Xem chiến dịch & chỉ số">📊 Chi tiết</Link>
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

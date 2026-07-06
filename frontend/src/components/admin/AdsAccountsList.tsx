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
  1: { label: 'Live', cls: 'text-[#047857]' },
  2: { label: 'Vô hiệu', cls: 'text-[#dc2626]' },
  3: { label: 'Chưa thanh toán', cls: 'text-[#c2410c]' },
  7: { label: 'Đang review', cls: 'text-[#c2410c]' },
  8: { label: 'Chờ quyết toán', cls: 'text-[#c2410c]' },
  9: { label: 'Gia hạn', cls: 'text-[#c2410c]' },
  100: { label: 'Chờ đóng', cls: 'text-[#64748b]' },
  101: { label: 'Đã đóng', cls: 'text-[#64748b]' },
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
    <div className="p-6 bg-[#f7f8fb] min-h-full">
      {msg && <div className="mb-3.5 rounded-xl bg-[#eff6ff] border border-[#dbe6ff] px-4 py-2.5 text-[13px] text-[#1d4ed8]">{msg}</div>}

      <div className="rounded-[14px] border border-[#eceef2] bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-[18px]">
          <div>
            <div className="text-[19px] font-extrabold tracking-[-0.3px] text-[#111827]">Tất cả tài khoản quảng cáo</div>
            <div className="mt-0.5 text-[12.5px] text-[#6b7280]">Meta Ads · {accounts.length} tài khoản · Đồng bộ gần nhất: {fmtDateTime(lastSync)}</div>
          </div>
          <button onClick={sync} disabled={syncing} className="px-[18px] py-2.5 rounded-[10px] bg-[#2563eb] text-white text-[13px] font-bold hover:bg-[#1d4ed8] disabled:opacity-50">
            {syncing ? 'Đang đồng bộ…' : '↻ Đồng bộ ngay'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                {COLUMNS.map((c) => (
                  <th
                    key={c.label}
                    onClick={c.key ? () => toggleSort(c.key!) : undefined}
                    className={`px-3 py-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[#e2e8f0] whitespace-nowrap ${c.right ? 'text-right' : ''} ${c.key ? 'cursor-pointer select-none hover:bg-[#334155]' : ''}`}
                  >
                    <span className={`inline-flex items-center ${c.right ? 'flex-row-reverse' : ''}`}>{c.label}{sortIcon(c.key)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-[#9ca3af]">Đang tải…</td></tr>
              ) : sortedAccounts.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-[#9ca3af]">Chưa có tài khoản. Bấm “Đồng bộ ngay” (cần credentials Meta).</td></tr>
              ) : (
                sortedAccounts.map((a, idx) => {
                  const href = `/admin/adsmeta/${a.id}`;
                  const st = a.accountStatus != null ? ACC_STATUS[a.accountStatus] : undefined;
                  const isBm = !!a.businessExternalId;
                  return (
                    <tr key={a.id} onClick={() => router.push(href)} className={`border-t border-[#f3f4f6] ${idx % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'} hover:bg-[#eff6ff] cursor-pointer`}>
                      <td className="px-3 py-3 text-[#6b7280] align-top">{idx + 1}</td>
                      <td className="px-3 py-3 max-w-[260px]">
                        <div className="font-bold text-[#111827] truncate" title={a.name || ''}>{a.name || '—'}</div>
                        <div className="text-[11px] text-[#9ca3af] font-mono">ID: {stripAct(a.externalId)}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        <span className={`inline-flex items-center gap-1 font-semibold ${st?.cls || 'text-[#64748b]'}`}>
                          <span className="text-[10px]">●</span>{st?.label || (a.accountStatus ?? '—')}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top text-[#374151]" title={a.fundingDetails?.display_string || ''}>
                        <span className="mr-1">{paymentIcon(a.fundingDetails)}</span>{paymentLabel(a.fundingDetails)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top font-semibold text-[#374151]">{a.currency || '—'}</td>
                      <td className="px-3 py-3 text-right font-bold text-[#111827] whitespace-nowrap align-top">{num(a.balance)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap align-top text-[#374151]">{a.spendCap && a.spendCap > 0 ? num(a.spendCap) : <span className="text-[#9ca3af]">No limit</span>}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap align-top font-bold text-[#111827]">{num(a.amountSpent)}</td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${isBm ? 'bg-[#e0e7ff] text-[#4338ca]' : 'bg-[#f1f5f9] text-[#64748b]'}`} title={a.businessName || ''}>{isBm ? 'BM' : 'CN'}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <Link href={href} onClick={(e) => e.stopPropagation()} className="text-[#2563eb] font-bold hover:underline" title="Xem chiến dịch & chỉ số">📊 Chi tiết</Link>
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

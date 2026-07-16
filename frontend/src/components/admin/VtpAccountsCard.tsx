'use client';

// Quản lý TÀI KHOẢN ViettelPost PHỤ — chỉ ĐỒNG BỘ VỀ CRM (import lịch sử đơn + đối soát COD).
// Tạo đơn mới vẫn dùng tài khoản chính (env). Nhúng trong trang /admin/integrations/VIETTELPOST.
import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface AccRow {
  id: string;
  label: string;
  username: string;
  isActive: boolean;
  lastImportAt: string | null;
  webToken: { hasToken: boolean; expiresAt: string | null; expired: boolean };
}

const d = (s: string | null) => {
  if (!s) return '—';
  const x = new Date(s);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleString('vi-VN', { hour12: false });
};

export default function VtpAccountsCard() {
  const [rows, setRows] = useState<AccRow[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: '', username: '', password: '', webToken: '' });

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 8000); };
  const load = useCallback(async () => {
    try { setRows(await apiClientClient.get<AccRow[]>('/viettelpost/accounts')); } catch { /* chưa có quyền/route */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    if (!form.username.trim() || !form.password) { flash('Cần username + mật khẩu'); return; }
    setBusy(true);
    try {
      await apiClientClient.post('/viettelpost/accounts', form);
      setForm({ label: '', username: '', password: '', webToken: '' });
      setShowAdd(false);
      await load();
      flash('✅ Đã kết nối tài khoản (đăng nhập VTP thành công).');
    } catch (e) { flash(e instanceof Error ? e.message : 'Kết nối thất bại'); }
    finally { setBusy(false); }
  };

  const pasteToken = async (id: string) => {
    const token = window.prompt('Dán WEB TOKEN của tài khoản này\n(đăng nhập viettelpost.vn → F12 → Network → copy header "token"):');
    if (!token?.trim()) return;
    try {
      const r = await apiClientClient.post<{ expiresAt: string | null }>(`/viettelpost/accounts/${id}/web-token`, { token });
      await load();
      flash(`✅ Đã lưu token (hạn ${d(r.expiresAt)}).`);
    } catch (e) { flash(e instanceof Error ? e.message : 'Lưu token thất bại'); }
  };

  const runImport = async (id: string, label: string) => {
    if (!window.confirm(`Import lịch sử đơn 180 ngày của "${label}" về CRM?\nChạy nền vài phút — theo dõi ở trang Khách hàng Viettel.`)) return;
    try {
      await apiClientClient.post(`/viettelpost/accounts/${id}/import-history`, {});
      flash('⏳ Đang import nền — vài phút sau vào Khách hàng Viettel xem kết quả.');
    } catch (e) { flash(e instanceof Error ? e.message : 'Import thất bại'); }
  };

  const del = async (id: string, label: string) => {
    if (!window.confirm(`Xoá kết nối "${label}"?\nĐơn đã import về CRM vẫn giữ nguyên.`)) return;
    try { await apiClientClient.delete(`/viettelpost/accounts/${id}`); await load(); flash('Đã xoá kết nối.'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Xoá thất bại'); }
  };

  const inp = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm';

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-gray-800">Tài khoản ViettelPost phụ (đồng bộ về CRM)</p>
        <button type="button" onClick={() => setShowAdd(v => !v)} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition">
          {showAdd ? 'Đóng' : '＋ Thêm tài khoản'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Kéo lịch sử đơn + khách + trạng thái đối soát COD của các tài khoản khác về chung 1 CRM.
        Tạo đơn mới vẫn dùng tài khoản chính. Web token hết hạn ~7 ngày → dán lại khi hết.
      </p>

      {showAdd && (
        <div className="mb-3 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inp} placeholder="Tên hiển thị (vd: Shop 2)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          <input className={inp} placeholder="Username VTP (SĐT đăng nhập)" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <input className={inp} type="password" placeholder="Mật khẩu VTP (lưu mã hoá)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <input className={inp} placeholder="Web token (tuỳ chọn — dán sau cũng được)" value={form.webToken} onChange={e => setForm({ ...form, webToken: e.target.value })} />
          <div className="sm:col-span-2">
            <button type="button" onClick={() => void add()} disabled={busy} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 transition">
              {busy ? 'Đang kiểm tra đăng nhập…' : 'Kết nối'}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Chưa có tài khoản phụ nào.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(a => (
            <div key={a.id} className="flex items-center gap-3 flex-wrap p-3 rounded-xl border border-gray-200 bg-white">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-900">{a.label} <span className="font-mono font-normal text-gray-500">· {a.username}</span></div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Token: {a.webToken.hasToken ? (a.webToken.expired ? <span className="text-red-600 font-semibold">hết hạn — dán lại</span> : <span className="text-emerald-600 font-semibold">còn hạn đến {d(a.webToken.expiresAt)}</span>) : <span className="text-amber-600 font-semibold">chưa dán</span>}
                  {' · '}Import gần nhất: {d(a.lastImportAt)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => void pasteToken(a.id)} className="px-2.5 py-1.5 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-semibold transition">🔑 Dán token</button>
                <button type="button" onClick={() => void runImport(a.id, a.label)} className="px-2.5 py-1.5 text-xs rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-semibold transition">⬇ Import lịch sử</button>
                <button type="button" onClick={() => void del(a.id, a.label)} className="px-2.5 py-1.5 text-xs rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-semibold transition">Xoá</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="mt-2 text-sm text-indigo-700">{msg}</div>}
    </div>
  );
}

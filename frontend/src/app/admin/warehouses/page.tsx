'use client';
export const dynamic = 'force-dynamic';

// Danh sách Kho — thêm/sửa kho (tên + địa chỉ), click kho để xem bảng sản phẩm trong kho.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

export default function WarehousesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await apiClientClient.get<Warehouse[]>('/warehouses')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không tải được danh sách kho'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) { setError('Cần tên kho'); return; }
    setSaving(true); setError('');
    try {
      await apiClientClient.post('/warehouses', form);
      setForm({ name: '', address: '' });
      setShowAdd(false);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Tạo kho thất bại'); }
    finally { setSaving(false); }
  };

  const remove = async (w: Warehouse) => {
    if (!window.confirm(`Xóa kho "${w.name}"?`)) return;
    try { await apiClientClient.delete(`/warehouses/${w.id}`); await load(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Xóa thất bại'); }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827]">🏬 Danh sách Kho</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">Quản lý kho hàng — click vào kho để xem sản phẩm, nhập/tồn, lịch sử chuyển kho.</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="rounded-[10px] bg-[#2563eb] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1d4ed8]">
          {showAdd ? 'Đóng' : '＋ Thêm Kho'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-5 rounded-[14px] border border-[#dbeafe] bg-[#eff6ff]/60 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#374151]">Tên kho *</label>
              <input className="w-full rounded-[10px] border border-[#c7ced9] bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-[#2563eb]" placeholder="VD: Kho Cầu Giấy" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#374151]">Địa chỉ</label>
              <input className="w-full rounded-[10px] border border-[#c7ced9] bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-[#2563eb]" placeholder="VD: 72 Trần Đăng Ninh, Cầu Giấy, Hà Nội" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <button onClick={() => void create()} disabled={saving} className="mt-3 rounded-[10px] bg-[#16a34a] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#15803d] disabled:opacity-50">
            {saving ? 'Đang lưu…' : '💾 Lưu kho'}
          </button>
        </div>
      )}

      {error && <div className="mb-4 rounded-[10px] border border-[#fecaca] bg-[#fee2e2] p-3 text-[13px] text-[#dc2626]">{error}</div>}

      {loading ? (
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-10 text-center text-[13px] text-[#9ca3af]">Đang tải…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-10 text-center">
          <div className="mb-2 text-4xl">🏬</div>
          <div className="text-[15px] font-bold text-[#111827]">Chưa có kho nào</div>
          <div className="text-[13px] text-[#6b7280]">Bấm "＋ Thêm Kho" để tạo kho đầu tiên (VD: Kho Cầu Giấy).</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map(w => (
            <div key={w.id} onClick={() => router.push(`/admin/warehouses/${w.id}`)}
              className="group cursor-pointer rounded-[14px] border border-[#eceef2] bg-white p-5 transition-all hover:border-[#2563eb] hover:shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-[#eff6ff] text-xl">🏬</div>
                <button onClick={(e) => { e.stopPropagation(); void remove(w); }} title="Xóa kho" className="rounded-lg p-1.5 text-[#d1d5db] opacity-0 transition-all hover:bg-[#fee2e2] hover:text-[#dc2626] group-hover:opacity-100">🗑</button>
              </div>
              <div className="text-[15px] font-bold text-[#111827]">{w.name}</div>
              <div className="mt-0.5 min-h-[18px] text-[12.5px] text-[#6b7280]">{w.address || '—'}</div>
              <div className="mt-3 inline-flex items-center rounded-full bg-[#dbeafe] px-2.5 py-1 text-[11px] font-bold text-[#1d4ed8]">
                {new Intl.NumberFormat('vi-VN').format(w.productCount)} sản phẩm
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

// Chi tiết 1 kho: STT · Tên SP · Nhập kho · Tồn kho · Chuyển kho (SL) · Kho đến · Kho đi (kèm thời gian).
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface TransferInfo { from?: string; to?: string; quantity: number; at: string }
interface Row {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  isActive: boolean;
  imported: number;
  stock: number;
  transferredQty: number;
  lastIn: TransferInfo | null;
  lastOut: TransferInfo | null;
}
interface Detail {
  warehouse: { id: string; name: string; address: string | null };
  products: Row[];
}

// Thời gian 2 dòng: phút:giờ trên, ngày/tháng/năm dưới.
function TimeCell({ t }: { t: TransferInfo | null; }) {
  if (!t) return <span className="text-[#d1d5db]">—</span>;
  const d = new Date(t.at);
  const who = t.from ?? t.to ?? '';
  return (
    <div className="leading-tight">
      <div className="font-semibold text-[#111827]">{who} <span className="font-mono text-[11px] text-[#6b7280]">×{new Intl.NumberFormat('vi-VN').format(t.quantity)}</span></div>
      <div className="text-[11px] text-[#9ca3af]">{d.toLocaleTimeString('vi-VN', { hour12: false })} {d.toLocaleDateString('vi-VN')}</div>
    </div>
  );
}

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await apiClientClient.get<Detail>(`/warehouses/${id}/products`)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không tải được kho'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const num = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <button onClick={() => router.push('/admin/warehouses')} className="mb-2 rounded-[9px] bg-[#f3f4f6] px-3.5 py-2 text-[13px] font-bold text-[#374151] transition hover:bg-[#e5e7eb]">← Danh sách Kho</button>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827]">🏬 {data?.warehouse.name || 'Kho'}</h1>
          {data?.warehouse.address && <p className="mt-1 text-[13px] text-[#6b7280]">{data.warehouse.address}</p>}
        </div>
        <button onClick={() => void load()} className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]">⟳ Tải lại</button>
      </div>

      {error && <div className="mb-4 rounded-[10px] border border-[#fecaca] bg-[#fee2e2] p-3 text-[13px] text-[#dc2626]">{error}</div>}

      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="w-[52px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">STT</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Tên sản phẩm</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]" title="Số lượng đã nhập kho (tồn + đã bán)">Nhập kho</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]" title="Còn lại hiện tại">Tồn kho</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]" title="Tổng số lượng đã chuyển kho">Chuyển kho</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]" title="Lần chuyển ĐẾN kho này gần nhất">Kho đến</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]" title="Lần chuyển ĐI khỏi kho này gần nhất">Kho đi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#9ca3af]">Đang tải…</td></tr>
              ) : !data || data.products.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#9ca3af]">Kho trống — gán sản phẩm vào kho ở form tạo/sửa sản phẩm, hoặc dùng nút Chuyển kho ở trang Sản phẩm.</td></tr>
              ) : (
                data.products.map((r, i) => (
                  <tr key={r.id} onClick={() => router.push(`/admin/products/${r.id}`)}
                    className={`cursor-pointer border-t border-[#f3f4f6] transition-colors hover:bg-[#eff6ff] ${i % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-[#6b7280]">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#111827]">{r.name}{!r.isActive && <span className="ml-1.5 rounded-md bg-[#fee2e2] px-1.5 py-0.5 text-[10px] font-bold text-[#dc2626]">Ngừng bán</span>}</div>
                      <div className="font-mono text-[11px] text-[#9ca3af]">{r.sku || '—'}</div>
                    </td>
                    <td className="px-3 py-3 text-right text-[#4b5563]">{num(r.imported)}</td>
                    <td className={`px-3 py-3 text-right font-bold ${r.stock <= 0 ? 'text-[#dc2626]' : 'text-[#111827]'}`}>{num(r.stock)}</td>
                    <td className="px-3 py-3 text-right text-[#4b5563]">{r.transferredQty > 0 ? num(r.transferredQty) : <span className="text-[#d1d5db]">—</span>}</td>
                    <td className="px-3 py-3"><TimeCell t={r.lastIn} /></td>
                    <td className="px-3 py-3"><TimeCell t={r.lastOut} /></td>
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface AdAccount { id: string; name: string | null; }
interface AdMapRow {
  campaignExternalId: string;
  campaignName: string | null;
  status: string | null;
  productId: string | null;
  productName: string | null;
}
interface ProductOption { id: string; name: string; sku?: string | null; }
interface AdminProductsResponse { data: ProductOption[]; }

export default function AdMappingClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [rows, setRows] = useState<AdMapRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      apiClientClient.get<AdAccount[]>('/ads/accounts'),
      apiClientClient.get<AdminProductsResponse>('/products/admin', { params: { limit: 1000 } }),
    ])
      .then(([accs, prodRes]) => {
        const list = Array.isArray(accs) ? accs : [];
        setAccounts(list);
        setProducts(prodRes.data || []);
        if (list.length) setAccountId(list[0].id);
      })
      .catch(() => setMsg('Lỗi tải tài khoản/sản phẩm'));
  }, []);

  const loadRows = useCallback(async (accId: string) => {
    if (!accId) return;
    setLoading(true);
    try {
      const list = await apiClientClient.get<AdMapRow[]>('/analytics/ad-map', { params: { accountId: accId } });
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setMsg('Lỗi tải danh sách campaign');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRows(accountId); }, [accountId, loadRows]);

  const saveMap = async (extId: string, productId: string) => {
    setSavingId(extId);
    setMsg('');
    try {
      await apiClientClient.put('/analytics/ad-map', {
        platform: 'META',
        level: 'campaign',
        adEntityExternalId: extId,
        productId: productId || null,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.campaignExternalId === extId
            ? { ...r, productId: productId || null, productName: products.find((p) => p.id === productId)?.name ?? null }
            : r,
        ),
      );
    } catch {
      setMsg('Lỗi lưu map');
    } finally {
      setSavingId(null);
    }
  };

  const productOptions = [
    { value: '', label: '— Không gán —' },
    ...products.map((p) => ({ value: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name })),
  ];

  return (
    <div className="py-2">
      <div className="mb-[18px]">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px] text-[#111827]">Gán quảng cáo ↔ Sản phẩm</h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">Map chiến dịch Meta với sản phẩm để tính đúng Lãi/Lỗ</p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-[13px] text-[#6b7280]">Tài khoản ads:</span>
        <Select
          className="w-72"
          value={accountId}
          onChange={setAccountId}
          placeholder="Chọn tài khoản"
          triggerClassName="rounded-[10px] border-[#e5e7eb] text-[13px]"
          options={accounts.map((a) => ({ value: a.id, label: a.name || a.id }))}
        />
        {msg && <span className="text-[13px] text-[#dc2626]">{msg}</span>}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Chiến dịch Meta</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Trạng thái QC</th>
                <th className="min-w-[240px] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Sản phẩm được gán</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6b7280]">Đang tải…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#6b7280]">Chưa có chiến dịch (đồng bộ Meta trước).</td></tr>
              ) : (
                rows.map((r, idx) => {
                  const mapped = !!r.productId;
                  return (
                    <tr key={r.campaignExternalId} className={`border-t border-[#f3f4f6] hover:bg-[#eff6ff] ${idx % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#111827]">{r.campaignName || r.campaignExternalId}</td>
                      <td className="px-3 py-3 text-[#6b7280]">{r.status || '—'}</td>
                      <td className="px-3 py-3">
                        <Select
                          className="w-full"
                          size="sm"
                          value={r.productId || ''}
                          onChange={(v) => saveMap(r.campaignExternalId, v)}
                          placeholder={savingId === r.campaignExternalId ? 'Đang lưu…' : '— Không gán —'}
                          triggerClassName="rounded-[9px] border-[#e5e7eb] text-[12.5px]"
                          options={productOptions}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                          style={mapped ? { background: '#d1fae5', color: '#047857' } : { background: '#fef3c7', color: '#92400e' }}
                        >
                          {mapped ? 'Đã gán' : 'Chưa gán'}
                        </span>
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

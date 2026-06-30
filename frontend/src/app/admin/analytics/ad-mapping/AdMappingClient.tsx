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
      <h1 className="mb-1 text-2xl font-bold text-gray-800">Gán quảng cáo ↔ Sản phẩm</h1>
      <p className="mb-4 text-sm text-gray-500">Gán mỗi chiến dịch Meta cho 1 sản phẩm để phân tích lãi/lỗ tính được tiền quảng cáo.</p>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-gray-600">Tài khoản ads:</span>
        <Select
          className="w-72"
          value={accountId}
          onChange={setAccountId}
          placeholder="Chọn tài khoản"
          options={accounts.map((a) => ({ value: a.id, label: a.name || a.id }))}
        />
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3">Chiến dịch</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="w-80 px-4 py-3">Sản phẩm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Chưa có chiến dịch (đồng bộ Meta trước).</td></tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.campaignExternalId} className={`${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'} hover:bg-blue-50/40`}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{r.campaignName || r.campaignExternalId}</span>
                    {!r.productId && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">chưa gán</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.status || '—'}</td>
                  <td className="px-4 py-3">
                    <Select
                      className="w-72"
                      size="sm"
                      value={r.productId || ''}
                      onChange={(v) => saveMap(r.campaignExternalId, v)}
                      placeholder={savingId === r.campaignExternalId ? 'Đang lưu…' : '— Không gán —'}
                      options={productOptions}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

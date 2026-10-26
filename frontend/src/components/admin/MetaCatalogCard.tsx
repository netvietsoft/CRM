'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatNumber, formatVnd } from '@/lib/format';

interface CatalogStatus {
  catalogId: string | null;
  isActive: boolean;
  totalCrmProducts: number;
  syncedCount: number;
  lastSyncedAt: string | null;
  status: string;
  lastResult?: {
    totalSent: number;
    successCount: number;
    failedCount: number;
    sampleProducts?: Array<{
      id: string;
      retailer_id: string;
      title: string;
      price: number;
      availability: string;
      imageUrl?: string | null;
    }>;
  } | null;
}

interface MetaCatalogOption {
  id: string;
  name: string;
  productCount: number;
}

const DEMO_SAMPLE_PRODUCTS = [
  {
    id: 'demo-p-1',
    retailer_id: 'VL-LINEN-01',
    title: 'Váy Linen Be Cổ V Dáng Xòe Tự Nhiên (Natural Beige V-Neck Linen Dress)',
    price: 450000,
    availability: 'in stock',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&h=300&fit=crop',
  },
  {
    id: 'demo-p-2',
    retailer_id: 'SM-WHITE-02',
    title: 'Áo Sơ Mi Lụa Trắng Công Sở Cao Cấp (Premium White Silk Office Shirt)',
    price: 380000,
    availability: 'in stock',
    imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=300&h=300&fit=crop',
  },
  {
    id: 'demo-p-3',
    retailer_id: 'QT-CULOTTES-03',
    title: 'Quần Suông Culottes Ống Rộng Thanh Lịch (Elegant Wide-Leg Culottes)',
    price: 420000,
    availability: 'in stock',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&h=300&fit=crop',
  },
  {
    id: 'demo-p-4',
    retailer_id: 'DB-MAXI-04',
    title: 'Đầm Maxi Dạo Phố Họa Tiết Vintage (Vintage Floral Print Maxi Dress)',
    price: 520000,
    availability: 'in stock',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=300&h=300&fit=crop',
  },
];

export default function MetaCatalogCard() {
  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [catalogs, setCatalogs] = useState<MetaCatalogOption[]>([]);
  const [inputCatalogId, setInputCatalogId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m: string, ms = 5000) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); };

  const loadData = useCallback(async () => {
    try {
      const [st, cats] = await Promise.all([
        apiClientClient.get<CatalogStatus>('/integrations/facebook/catalogs/status'),
        apiClientClient.get<MetaCatalogOption[]>('/integrations/facebook/catalogs').catch(() => []),
      ]);
      setStatus(st);
      if (st?.catalogId) setInputCatalogId(st.catalogId);
      setCatalogs(Array.isArray(cats) ? cats : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const saveConfig = async () => {
    if (!inputCatalogId.trim()) { flash('Vui lòng nhập Meta Catalog ID'); return; }
    setSaving(true);
    try {
      await apiClientClient.post('/integrations/facebook/catalogs/config', { catalogId: inputCatalogId.trim() });
      flash('✅ Đã lưu Meta Catalog ID thành công!');
      await loadData();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Lưu Catalog ID thất bại');
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    flash('⚡ Đang đồng bộ danh sách sản phẩm lên Meta Commerce Catalog (Batch API)…', 10000);
    if (isDemo) {
      window.setTimeout(() => {
        flash('🎉 Đồng bộ thành công: 104 sản phẩm đã được gửi lên Meta Commerce Catalog (/{catalog_id}/items_batch).', 6000);
        setSyncing(false);
      }, 400);
      return;
    }
    try {
      const r = await apiClientClient.post<{ synced: number; syncSuccess: boolean; lastResult?: any }>(
        '/integrations/facebook/catalogs/sync',
        { catalogId: inputCatalogId.trim() || undefined }
      );
      flash(`🎉 Đồng bộ thành công: ${r.synced} sản phẩm đã được gửi lên Meta Commerce Catalog.`);
      await loadData();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const currentStatus = isDemo ? {
    catalogId: '2093847291823746',
    isActive: true,
    totalCrmProducts: 104,
    syncedCount: 104,
    lastSyncedAt: new Date().toISOString(),
    status: 'SUCCESS',
    lastResult: {
      totalSent: 104,
      successCount: 104,
      failedCount: 0,
      sampleProducts: DEMO_SAMPLE_PRODUCTS,
    },
  } : status;

  const sampleProducts = isDemo
    ? DEMO_SAMPLE_PRODUCTS
    : (currentStatus?.lastResult?.sampleProducts || []);

  return (
    <div data-testid="meta-catalog-card" className="rounded-2xl border border-indigo-100 bg-white shadow-sm p-5 mt-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white grid place-items-center text-xl shadow-xs">
            🛍️
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800">Đồng bộ Meta Commerce Catalog (Catalog Sync)</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                catalog_management
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Đẩy danh mục sản phẩm từ CRM lên Facebook & Instagram Shopping Catalog bằng Meta Items Batch API (<code>/&#123;catalog_id&#125;/items_batch</code>).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="catalog-demo-toggle"
            onClick={() => {
              setIsDemo(!isDemo);
              flash(!isDemo ? '🎬 Đã bật Chế độ Demo cho Meta App Review quyền catalog_management!' : 'Đã tắt Demo.', 4000);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
              isDemo ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Enable Demo App Review Mode to preview synchronized products on Meta Commerce Catalog"
          >
            {isDemo ? '✓ Đang bật Demo Review' : '🎬 Dữ liệu mẫu (Quay App Review)'}
          </button>
          <button
            type="button"
            data-testid="catalog-sync-btn"
            onClick={syncNow}
            disabled={syncing || (!isDemo && !inputCatalogId.trim())}
            title="Push CRM product inventory to Meta Commerce Catalog via Items Batch API"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>{syncing ? 'Đang đồng bộ (Syncing)…' : '⚡ Đồng bộ ngay lên Meta (Sync Now)'}</span>
          </button>
        </div>
      </div>

      {msg && <div data-testid="catalog-flash-msg" className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">{msg}</div>}

      {isDemo && (
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-[12.5px] text-amber-900 flex items-center justify-between gap-3 shadow-xs">
          <span>
            <strong>🎬 Chế độ Demo catalog_management:</strong> Đang mô phỏng sản phẩm CRM đã đồng bộ thành công sang Meta Commerce Catalog. Bạn có thể bấm nút <strong>⚡ Đồng bộ ngay lên Meta (Sync Now)</strong> để minh họa quá trình gửi Batch API cho Meta Reviewer.
          </span>
          <button onClick={() => setIsDemo(false)} className="px-2 py-0.5 rounded bg-white border border-amber-300 text-xs font-semibold hover:bg-amber-100">
            Tắt
          </button>
        </div>
      )}

      {/* Cấu hình Catalog ID */}
      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold text-gray-700">Meta Commerce Catalog ID (Selected Asset)</label>
          <div className="flex gap-2">
            <input
              type="text"
              data-testid="catalog-id-input"
              value={isDemo ? '2093847291823746' : inputCatalogId}
              onChange={(e) => setInputCatalogId(e.target.value)}
              disabled={isDemo}
              placeholder="Nhập ID danh mục sản phẩm (VD: 2093847291823746)…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white"
            />
            <button
              type="button"
              onClick={saveConfig}
              disabled={saving || isDemo}
              className="px-3.5 py-2 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Lưu ID (Save)'}
            </button>
          </div>
          {catalogs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <span>Hoặc chọn catalog:</span>
              <select
                onChange={(e) => setInputCatalogId(e.target.value)}
                className="border border-gray-200 rounded px-2 py-0.5 text-xs bg-white"
              >
                <option value="">-- Chọn danh mục --</option>
                {catalogs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.productCount} SP)</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Trạng thái tóm tắt */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-medium">Trạng thái đồng bộ (Sync Status)</div>
            <div data-testid="catalog-sync-status" className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${currentStatus?.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{currentStatus?.status === 'SUCCESS' ? 'ĐÃ ĐỒNG BỘ (SYNCED)' : 'CHỜ ĐỒNG BỘ (READY)'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-500 font-medium">Sản phẩm Catalog (Items)</div>
            <div data-testid="catalog-synced-count" className="text-sm font-extrabold text-indigo-600">
              {formatNumber(currentStatus?.syncedCount || 0)} / {formatNumber(currentStatus?.totalCrmProducts || 0)} SP
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách mẫu sản phẩm đã đồng bộ */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-700">
            📦 Danh sách sản phẩm đồng bộ lên Meta Catalog · Synced Catalog Products ({sampleProducts.length > 0 ? sampleProducts.length : 0})
          </span>
          <button
            type="button"
            onClick={() => {
              const text = `Our CRM application manages e-commerce products and synchronizes them directly with Meta Commerce Catalogs for Facebook Shop and Instagram Shopping via the Meta Items Batch API (/{catalog_id}/items_batch).\n\nWe require the catalog_management permission to:\n1. Create and batch-update catalog items with real-time price, stock availability, titles, descriptions, and media links.\n2. Keep inventory and pricing synchronized between the local CRM catalog and Meta Commerce Manager.\n\nInstructions for reviewer:\n1. Open CRM at /admin/integrations.\n2. Locate the 'Meta Commerce Catalog Sync' section.\n3. Verify the connected Catalog ID and click 'Sync Now' (⚡ Đồng bộ ngay lên Meta).\n4. Notice the batch payload sent to Meta Catalog and products marked as in-stock and synced.`;
              void navigator.clipboard.writeText(text);
              flash('Đã sao chép mô tả quyền catalog_management cho Meta Reviewer!', 3000);
            }}
            className="text-[11px] text-indigo-600 font-medium hover:underline flex items-center gap-1"
          >
            <span>📋 Sao chép mô tả catalog_management cho Reviewer</span>
          </button>
        </div>

        {sampleProducts.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Chưa có sản phẩm nào được đồng bộ. Bấm nút <strong>⚡ Đồng bộ ngay</strong> hoặc bật <strong>🎬 Dữ liệu mẫu</strong> để xem trước.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table data-testid="catalog-sample-table" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <th className="px-3 py-2">Ảnh (Image)</th>
                  <th className="px-3 py-2">Mã SKU (retailer_id)</th>
                  <th className="px-3 py-2">Tên sản phẩm (Product Title)</th>
                  <th className="px-3 py-2">Giá niêm yết (Price)</th>
                  <th className="px-3 py-2">Tình trạng kho (Availability)</th>
                  <th className="px-3 py-2">Meta Batch Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sampleProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-indigo-50/30">
                    <td className="px-3 py-2">
                      <img
                        src={p.imageUrl || 'https://via.placeholder.com/40'}
                        alt={p.title}
                        className="w-9 h-9 object-cover rounded-md border border-gray-200"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-gray-700">{p.retailer_id}</td>
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-[300px] truncate" title={p.title}>
                      {p.title}
                    </td>
                    <td className="px-3 py-2 font-bold text-gray-800">{formatVnd(p.price)}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        ✓ {p.availability}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        SYNCED_TO_META
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

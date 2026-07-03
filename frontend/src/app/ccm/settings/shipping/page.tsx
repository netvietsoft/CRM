'use client';
export const dynamic = 'force-dynamic';

/* ============================================================================
 * /ccm/settings/shipping — CẤU HÌNH ĐƠN VỊ VẬN CHUYỂN (ĐVVC)
 * • Viettel Post: TÍCH HỢP THẬT — cấu hình qua ENV (VIETTELPOST_*). Trang chỉ HIỂN THỊ
 *   read-only thông tin người gửi + trạng thái kết nối (GET /viettelpost/config).
 * • 17 hãng còn lại: TEMPLATE (chưa có API) — toggle mock "Chưa tích hợp".
 * Khi nào làm bước đẩy đa hãng mới thêm bảng carrier-config + token vào DB.
 * ========================================================================== */

import { useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface VtConfig {
  provider: string; connected: boolean; apiUrl: string | null;
  sender: { name: string; phone: string; address: string; provinceId: number | null; districtId: number | null; wardId: number | null };
}

// Các hãng VTP list trong ảnh Pancake — chỉ Viettel Post tích hợp thật.
const OTHER_CARRIERS = [
  'GHN', 'J&T Express', 'SPX Express', 'GHTK', 'Ninja Van', 'Best Inc', 'Vnpost',
  'EMS', 'Tiki', 'LEX', 'GHSV', 'SuperShip', 'Grab Express', 'Ahamove', 'SNAPPY', 'Nhất Tín Express', 'Kerry',
];

export default function ShippingSettings() {
  const [cfg, setCfg] = useState<VtConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try { setCfg(await apiClientClient.get<VtConfig>('/viettelpost/config')); }
      catch (e) { setError(e instanceof Error ? e.message : 'Không tải được cấu hình'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Vận chuyển (ĐVVC)</h1>
      <p className="text-sm text-gray-500 mb-5">Các đơn tạo trong CCM được đẩy sang đơn vị vận chuyển. Hiện tích hợp <b>Viettel Post</b>.</p>

      {/* Viettel Post — thật */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm">VTP</div>
          <div>
            <div className="font-semibold text-gray-800">Viettel Post</div>
            <div className="text-xs text-gray-400">Cấu hình qua biến môi trường (ENV) — chỉ đọc</div>
          </div>
          <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${cfg?.connected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {loading ? 'Đang kiểm tra…' : cfg?.connected ? '● Đã kết nối' : '○ Chưa cấu hình'}
          </span>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}

        {cfg && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Người gửi" value={cfg.sender.name || '—'} />
            <Row label="SĐT gửi" value={cfg.sender.phone || '—'} />
            <Row label="Địa chỉ gửi" value={cfg.sender.address || '—'} full />
            <Row label="Tỉnh/Huyện/Xã (ID)" value={[cfg.sender.provinceId, cfg.sender.districtId, cfg.sender.wardId].filter(Boolean).join(' / ') || '—'} />
            <Row label="API" value={cfg.apiUrl || '—'} />
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">Để đổi thông tin người gửi / tài khoản VTP, sửa các biến <code className="bg-gray-100 px-1 rounded">VIETTELPOST_*</code> trong file <code className="bg-gray-100 px-1 rounded">.env</code> của backend rồi khởi động lại.</p>
      </div>

      {/* Các hãng khác — template */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-800">Đơn vị vận chuyển khác</div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">template · chưa tích hợp</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OTHER_CARRIERS.map((c) => (
            <div key={c} className="flex items-center gap-3 border border-gray-100 rounded-xl px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center text-xs">🚚</div>
              <span className="text-sm text-gray-700">{c}</span>
              <span className="ml-auto text-xs text-gray-300">Chưa tích hợp</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-gray-800">{value}</div>
    </div>
  );
}

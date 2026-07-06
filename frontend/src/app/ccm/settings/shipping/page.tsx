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
    <div>
      <h1 className="text-2xl font-extrabold tracking-[-0.4px]">Vận chuyển (ĐVVC)</h1>
      <p className="mt-[7px] mb-[18px] text-[13.5px] text-[#6b7280]">Các đơn tạo trong CCM được đẩy sang đơn vị vận chuyển. Hiện tích hợp <b>Viettel Post</b>.</p>

      {/* Viettel Post — thật */}
      <div className="bg-white rounded-2xl border border-[#e6e9f2] p-[22px] max-w-[940px] mb-4">
        <div className="flex items-center gap-[14px] mb-[18px] flex-wrap">
          <div className="w-[52px] h-[52px] rounded-[13px] bg-[#dc2626] text-white flex items-center justify-center font-extrabold text-[14px]">VTP</div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[17px] font-extrabold">Viettel Post</div>
            <div className="text-[13px] text-[#6b7280]">Cấu hình qua biến môi trường (ENV) — chỉ đọc</div>
          </div>
          <span className={`px-[13px] py-[5px] rounded-full text-[12px] font-bold ${cfg?.connected ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
            {loading ? 'Đang kiểm tra…' : cfg?.connected ? '● Đã kết nối' : '○ Chưa cấu hình'}
          </span>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}

        {cfg && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[14px] border-t border-[#f1f5f9] pt-4">
            <Row label="Người gửi" value={cfg.sender.name || '—'} />
            <Row label="SĐT gửi" value={cfg.sender.phone || '—'} />
            <Row label="Địa chỉ gửi" value={cfg.sender.address || '—'} />
            <Row label="Tỉnh/Huyện/Xã (ID)" value={[cfg.sender.provinceId, cfg.sender.districtId, cfg.sender.wardId].filter(Boolean).join(' / ') || '—'} />
            <Row label="API" value={cfg.apiUrl || '—'} mono />
          </div>
        )}
        <p className="text-[12.5px] text-[#94a3b8] mt-[14px]">Để đổi thông tin người gửi / tài khoản VTP, sửa các biến <code className="font-mono bg-[#f3f4f6] px-1.5 py-px rounded-[5px]">VIETTELPOST_*</code> trong file <code className="font-mono bg-[#f3f4f6] px-1.5 py-px rounded-[5px]">.env</code> của backend rồi khởi động lại.</p>
      </div>

      {/* Các hãng khác — template */}
      <div className="bg-white rounded-2xl border border-[#e6e9f2] p-[22px] max-w-[940px]">
        <div className="flex items-center justify-between gap-2.5 mb-4 flex-wrap">
          <span className="text-[16px] font-extrabold">Đơn vị vận chuyển khác</span>
          <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e]">template · chưa tích hợp</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
          {OTHER_CARRIERS.map((c) => (
            <div key={c} className="flex items-center gap-2.5 border border-[#eef0f6] rounded-[11px] px-[14px] py-3 hover:bg-[#f8fafc]">
              <span className="w-[26px] h-[26px] rounded-[7px] bg-[#fee2e2] text-[#dc2626] flex items-center justify-center text-[13px]">🚚</span>
              <span className="flex-1 text-[13.5px] font-semibold">{c}</span>
              <span className="text-[12px] text-[#9ca3af]">Chưa tích hợp</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[12px] text-[#94a3b8] mb-[3px]">{label}</div>
      <div className={`text-[#111827] ${mono ? 'text-[13px] font-semibold font-mono' : 'text-[14px] font-bold'}`}>{value}</div>
    </div>
  );
}

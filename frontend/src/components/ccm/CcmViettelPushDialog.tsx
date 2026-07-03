'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

/* ============================================================================
 * CcmViettelPushDialog — ĐẨY 1 ĐƠN CRM SANG VIETTEL POST (Task D)
 * Dùng ở: /ccm/orders (nút "Đẩy VTP" mỗi dòng) và OrderCard trong CcmCustomerPanel.
 *
 * Vì đơn CRM lưu địa chỉ FREE-TEXT còn VTP cần ID tỉnh/huyện/xã, dialog cho chọn
 * lại địa chỉ VTP + tra cước rồi mới đẩy. Tái dùng 100% API sẵn có:
 *   GET  /viettelpost/address/provinces        → {PROVINCE_ID, PROVINCE_NAME}
 *   GET  /viettelpost/address/districts?provinceId=
 *   GET  /viettelpost/address/wards?districtId=
 *   GET  /viettelpost/address/provinces-new     (địa danh mới: Tỉnh → Phường/Xã)
 *   GET  /viettelpost/address/wards-new?provinceId=
 *   POST /viettelpost/price   {RECEIVER_PROVINCE, RECEIVER_DISTRICT, PRODUCT_WEIGHT, PRODUCT_PRICE, MONEY_COLLECTION}
 *                             → [{MA_DV_CHINH, TEN_DICHVU, GIA_CUOC, THOI_GIAN}]
 *   POST /viettelpost/orders  (buildPayload)  → {trackingCode, fee, error?}
 * Liên kết CRM↔VTP: orderReference = orderCode (VTP lưu 1 dòng viettel_customers theo mã này).
 * ========================================================================== */

const fmtVnd = (n: number) => (n || 0).toLocaleString('vi-VN') + ' đ';

export interface PushableOrder {
  id: string;
  orderCode: string;
  totalAmount: number;
  paymentMethod: string | null;
  shippingName: string;
  shippingPhone: string;
  items: { name: string; quantity: number }[];
}

interface Province { PROVINCE_ID: number; PROVINCE_NAME: string }
interface District { DISTRICT_ID: number; DISTRICT_NAME: string }
interface Ward { WARDS_ID: number; WARDS_NAME: string }
interface Service { MA_DV_CHINH: string; TEN_DICHVU: string; GIA_CUOC: number; THOI_GIAN?: string }
interface VtItem { name: string; quantity: number; weight: string; price: string }

const normProvince = (p: any): Province => ({ PROVINCE_ID: p.PROVINCE_ID ?? p.id ?? p.ID, PROVINCE_NAME: p.PROVINCE_NAME ?? p.name ?? p.NAME ?? '' });
const normWard = (w: any): Ward => ({ WARDS_ID: w.WARDS_ID ?? w.WARD_ID ?? w.id ?? w.ID, WARDS_NAME: w.WARDS_NAME ?? w.WARD_NAME ?? w.name ?? w.NAME ?? '' });

export default function CcmViettelPushDialog({ order, onClose, onPushed }: { order: PushableOrder; onClose: () => void; onPushed?: () => void }) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [useNewAddress, setUseNewAddress] = useState(false);

  const [fullname, setFullname] = useState(order.shippingName || '');
  const [phone, setPhone] = useState(order.shippingPhone || '');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');

  // Hàng hoá: prefill từ đơn CRM (cân nặng mặc định 500g/món, giá trị để 0 — sửa được).
  const [items, setItems] = useState<VtItem[]>(
    order.items.length ? order.items.map((it) => ({ name: it.name, quantity: it.quantity, weight: '500', price: '' })) : [{ name: 'Hàng hoá', quantity: 1, weight: '500', price: '' }],
  );
  const [dim, setDim] = useState({ length: '', width: '', height: '' });
  const [cod, setCod] = useState(order.paymentMethod === 'COD' ? String(order.totalAmount || 0) : '0');
  const [orderService, setOrderService] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const [loadingSvc, setLoadingSvc] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ trackingCode?: string; fee?: number } | null>(null);

  const totalWeight = useMemo(() => items.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.quantity) || 1), 0), [items]);
  const totalValue = useMemo(() => items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0), [items]);

  // Nạp tỉnh theo chế độ địa danh.
  useEffect(() => {
    const ep = useNewAddress ? '/viettelpost/address/provinces-new' : '/viettelpost/address/provinces';
    void apiClientClient.get<any[]>(ep).then((l) => setProvinces((Array.isArray(l) ? l : []).map(normProvince))).catch(() => setProvinces([]));
  }, [useNewAddress]);

  const loadWardsNew = async (id: string) => setWards((await apiClientClient.get<any[]>(`/viettelpost/address/wards-new?provinceId=${id}`).catch(() => [])).map(normWard));
  const loadDistricts = async (id: string) => setDistricts(await apiClientClient.get<District[]>(`/viettelpost/address/districts?provinceId=${id}`).catch(() => []));
  const loadWards = async (id: string) => setWards(await apiClientClient.get<Ward[]>(`/viettelpost/address/wards?districtId=${id}`).catch(() => []));

  const onProvince = async (id: string) => {
    setProvince(id); setDistrict(''); setWard(''); setDistricts([]); setWards([]); setServices([]); setOrderService('');
    if (!id) return;
    if (useNewAddress) await loadWardsNew(id); else await loadDistricts(id);
  };
  const onDistrict = async (id: string) => { setDistrict(id); setWard(''); setWards([]); setServices([]); setOrderService(''); if (id) await loadWards(id); };
  const toggleNew = () => { setUseNewAddress((v) => !v); setProvince(''); setDistrict(''); setWard(''); setDistricts([]); setWards([]); setServices([]); setOrderService(''); };

  const setItem = (i: number, k: keyof VtItem, v: string) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: k === 'quantity' ? (Number(v) || 1) : v } : it)));

  const getServices = useCallback(async () => {
    setError(''); setServices([]); setLoadingSvc(true);
    try {
      if (!province || (!useNewAddress && !district)) { setError(useNewAddress ? 'Chọn Tỉnh người nhận trước.' : 'Chọn Tỉnh/Huyện người nhận trước.'); return; }
      const list = await apiClientClient.post<Service[]>('/viettelpost/price', {
        RECEIVER_PROVINCE: Number(province),
        RECEIVER_DISTRICT: useNewAddress ? 0 : Number(district),
        PRODUCT_WEIGHT: totalWeight || 500, PRODUCT_PRICE: totalValue, MONEY_COLLECTION: Number(cod) || 0,
      });
      setServices(Array.isArray(list) ? list : []);
      if (!list?.length) setError('Không có dịch vụ khả dụng cho tuyến này.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Lấy dịch vụ thất bại'); }
    finally { setLoadingSvc(false); }
  }, [province, district, useNewAddress, totalWeight, totalValue, cod]);

  const push = async () => {
    setError('');
    if (!fullname.trim() || !phone.trim() || !address.trim() || !province) { setError('Nhập đủ người nhận (tên, SĐT, địa chỉ, tỉnh).'); return; }
    if (useNewAddress ? !ward : !district) { setError(useNewAddress ? 'Chọn Phường/Xã.' : 'Chọn Quận/Huyện.'); return; }
    if (!orderService) { setError('Chọn dịch vụ (bấm "Lấy dịch vụ & cước").'); return; }
    setPushing(true);
    try {
      const res = await apiClientClient.post<{ trackingCode?: string; fee?: number; error?: string }>('/viettelpost/orders', {
        receiverFullname: fullname.trim(), receiverPhone: phone.trim(), receiverAddress: address.trim(),
        receiverProvince: Number(province) || 0,
        receiverDistrict: useNewAddress ? 0 : (Number(district) || 0),
        receiverWard: ward ? Number(ward) : undefined,
        useNewAddress,
        productType: 'HH',
        items: items.map((it) => ({ name: it.name || 'Hàng hoá', quantity: Number(it.quantity) || 1, weight: Number(it.weight) || 0, price: Number(it.price) || 0 })),
        productLength: Number(dim.length) || 0, productWidth: Number(dim.width) || 0, productHeight: Number(dim.height) || 0,
        orderReference: order.orderCode,
        cod: Number(cod) || 0, orderPayment: 3, orderService, orderNote: orderNote.trim() || undefined,
      });
      if (res.error) { setError('ViettelPost: ' + res.error); return; }
      // Ghi mã vận đơn ngược vào đơn CRM (metadata.carrier) để card hiện badge VTP + mã.
      if (res.trackingCode) {
        try { await apiClientClient.patch(`/orders/${order.id}/carrier-info`, { carrier: 'VTP', trackingCode: res.trackingCode }); } catch { /* không chặn nếu ghi thất bại */ }
      }
      setResult(res);
      onPushed?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Đẩy đơn thất bại'); }
    finally { setPushing(false); }
  };

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb]';
  const lbl = 'block text-xs text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800">🚚 Đẩy đơn {order.orderCode} sang Viettel Post</h2>
          <button title="Đóng" onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        {result?.trackingCode ? (
          /* Kết quả thành công */
          <div className="p-8 text-center space-y-3">
            <div className="text-5xl">✅</div>
            <h3 className="text-lg font-bold text-gray-900">Đã tạo vận đơn Viettel Post</h3>
            <p className="text-gray-600">Mã vận đơn: <span className="font-mono font-bold text-[#3b5bdb]">{result.trackingCode}</span></p>
            {result.fee ? <p className="text-gray-600">Cước dự kiến: {fmtVnd(result.fee)}</p> : null}
            <button onClick={onClose} className="mt-2 px-5 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium">Đóng</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

            {/* Người nhận */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-400 uppercase">Người nhận</div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
                  <span>Địa danh mới</span>
                  <button type="button" role="switch" aria-checked={useNewAddress} onClick={toggleNew}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useNewAddress ? 'bg-[#3b5bdb]' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useNewAddress ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl}>Họ tên *</label><input className={inp} value={fullname} onChange={(e) => setFullname(e.target.value)} /></div>
                <div><label className={lbl}>SĐT *</label><input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              </div>
              <div className={`grid gap-2 ${useNewAddress ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <div>
                  <label className={lbl}>Tỉnh/TP *</label>
                  <select className={inp} value={province} onChange={(e) => void onProvince(e.target.value)}>
                    <option value="">— chọn —</option>
                    {provinces.map((p) => <option key={p.PROVINCE_ID} value={p.PROVINCE_ID}>{p.PROVINCE_NAME}</option>)}
                  </select>
                </div>
                {!useNewAddress && (
                  <div>
                    <label className={lbl}>Quận/Huyện *</label>
                    <select className={inp} value={district} onChange={(e) => void onDistrict(e.target.value)} disabled={!districts.length}>
                      <option value="">— chọn —</option>
                      {districts.map((d) => <option key={d.DISTRICT_ID} value={d.DISTRICT_ID}>{d.DISTRICT_NAME}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className={lbl}>Phường/Xã {useNewAddress ? '*' : ''}</label>
                  <select className={inp} value={ward} onChange={(e) => { setWard(e.target.value); setServices([]); setOrderService(''); }} disabled={!wards.length}>
                    <option value="">— chọn —</option>
                    {wards.map((w) => <option key={w.WARDS_ID} value={w.WARDS_ID}>{w.WARDS_NAME}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Địa chỉ chi tiết (số nhà, đường…) *</label><input className={inp} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="VD: 72 Trần Đăng Ninh" /></div>
            </div>

            {/* Hàng hoá */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase">Hàng hoá</div>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className={`${inp} col-span-6`} placeholder={`Tên hàng ${i + 1}`} value={it.name} onChange={(e) => setItem(i, 'name', e.target.value)} />
                  <input className={`${inp} col-span-2`} type="number" title="Số lượng" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} />
                  <input className={`${inp} col-span-2`} type="number" title="Trọng lượng (g)" value={it.weight} onChange={(e) => setItem(i, 'weight', e.target.value)} />
                  <input className={`${inp} col-span-2`} type="number" title="Giá trị (đ)" placeholder="Giá trị" value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} />
                </div>
              ))}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tổng khối lượng: <b className="text-gray-800">{totalWeight} g</b></span>
                <span>Tổng giá trị: <b className="text-gray-800">{fmtVnd(totalValue)}</b></span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input className={inp} type="number" placeholder="Dài (cm)" value={dim.length} onChange={(e) => setDim({ ...dim, length: e.target.value })} />
                <input className={inp} type="number" placeholder="Rộng (cm)" value={dim.width} onChange={(e) => setDim({ ...dim, width: e.target.value })} />
                <input className={inp} type="number" placeholder="Cao (cm)" value={dim.height} onChange={(e) => setDim({ ...dim, height: e.target.value })} />
              </div>
            </div>

            {/* Tiền + dịch vụ */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase">Tiền thu hộ & dịch vụ</div>
              <div><label className={lbl}>COD (tiền thu hộ, đ)</label><input className={inp} type="number" value={cod} onChange={(e) => setCod(e.target.value)} /></div>
              <div className="flex items-center gap-2">
                <button onClick={() => void getServices()} disabled={loadingSvc} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm disabled:opacity-50">{loadingSvc ? 'Đang lấy…' : '↻ Lấy dịch vụ & cước'}</button>
                {services.length > 0 && <span className="text-xs text-gray-400">{services.length} dịch vụ</span>}
              </div>
              {services.length > 0 && (
                <select className={inp} value={orderService} onChange={(e) => setOrderService(e.target.value)}>
                  <option value="">— chọn dịch vụ —</option>
                  {services.map((s) => <option key={s.MA_DV_CHINH} value={s.MA_DV_CHINH}>{s.TEN_DICHVU} — {fmtVnd(s.GIA_CUOC)}{s.THOI_GIAN ? ` (${s.THOI_GIAN})` : ''}</option>)}
                </select>
              )}
              <textarea rows={2} className={inp} placeholder="Ghi chú vận đơn…" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} />
            </div>

            {/* Nút */}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} type="button" className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Huỷ</button>
              <button onClick={() => void push()} disabled={pushing} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">{pushing ? 'Đang đẩy…' : '🚀 Đẩy sang Viettel Post'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

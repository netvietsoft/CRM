'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface Province { PROVINCE_ID: number; PROVINCE_NAME: string }
interface District { DISTRICT_ID: number; DISTRICT_NAME: string }
interface Ward { WARDS_ID: number; WARDS_NAME: string }
interface Service { MA_DV_CHINH: string; TEN_DICHVU: string; GIA_CUOC: number; THOI_GIAN?: string }
interface Item { name: string; quantity: string; weight: string; price: string }

const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';

// Tính chất hàng hóa đặc biệt → mã dịch vụ cộng thêm VTP
const SPECIAL: Array<{ code: string; label: string }> = [
  { code: 'XMG', label: 'Thu tiền xem hàng' },
  { code: 'HGC', label: 'Giá trị cao' },
  { code: 'HDV', label: 'Dễ vỡ' },
  { code: 'HNK', label: 'Nguyên khối' },
  { code: 'HQK', label: 'Quá khổ' },
  { code: 'HCL', label: 'Chất lỏng' },
  { code: 'HPN', label: 'Từ tính, Pin' },
];

export default function CreateViettelOrderPage() {
  const router = useRouter();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingSvc, setLoadingSvc] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ trackingCode?: string; fee?: number } | null>(null);

  // Người gửi (mặc định CHY SHOP — sửa được; địa điểm cố định theo cấu hình)
  const [sender, setSender] = useState({ name: 'CHY SHOP', phone: '0966500911', address: '72 Trần Đăng Ninh' });
  // Người nhận
  const [r, setR] = useState({ fullname: '', phone: '', address: '', province: '', district: '', ward: '' });
  const setRv = (k: string, v: string) => setR(p => ({ ...p, [k]: v }));
  // Hàng hóa
  const [productType, setProductType] = useState<'HH' | 'TaiLieu'>('HH');
  const [items, setItems] = useState<Item[]>([{ name: '', quantity: '1', weight: '500', price: '' }]);
  const [dim, setDim] = useState({ length: '', width: '', height: '' });
  const [orderReference, setOrderReference] = useState('');
  const [special, setSpecial] = useState<Record<string, boolean>>({ XMG: true });
  // Tiền / dịch vụ
  const [cod, setCod] = useState('');
  const [orderPayment, setOrderPayment] = useState('3');
  const [orderNote, setOrderNote] = useState('');
  const [orderService, setOrderService] = useState('');

  useEffect(() => {
    void apiClientClient.get<Province[]>('/viettelpost/address/provinces').then(setProvinces).catch(() => {});
  }, []);

  const onProvince = useCallback(async (id: string) => {
    setR(p => ({ ...p, province: id, district: '', ward: '' })); setDistricts([]); setWards([]); setServices([]);
    if (id) setDistricts(await apiClientClient.get<District[]>(`/viettelpost/address/districts?provinceId=${id}`).catch(() => []));
  }, []);
  const onDistrict = useCallback(async (id: string) => {
    setR(p => ({ ...p, district: id, ward: '' })); setWards([]); setServices([]);
    if (id) setWards(await apiClientClient.get<Ward[]>(`/viettelpost/address/wards?districtId=${id}`).catch(() => []));
  }, []);

  const totalWeight = items.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.quantity) || 1), 0);
  const totalValue = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const setItem = (i: number, k: keyof Item, v: string) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems(arr => [...arr, { name: '', quantity: '1', weight: '500', price: '' }]);
  const delItem = (i: number) => setItems(arr => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr);

  const getServices = async () => {
    setError(''); setServices([]); setLoadingSvc(true);
    try {
      if (!r.province || !r.district) { setError('Chọn Tỉnh/Huyện người nhận trước.'); return; }
      const list = await apiClientClient.post<Service[]>('/viettelpost/price', {
        RECEIVER_PROVINCE: Number(r.province), RECEIVER_DISTRICT: Number(r.district),
        PRODUCT_WEIGHT: totalWeight || 500, PRODUCT_PRICE: totalValue, MONEY_COLLECTION: Number(cod) || 0,
      });
      setServices(Array.isArray(list) ? list : []);
      if (!list?.length) setError('Không có dịch vụ khả dụng cho tuyến này.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Lấy dịch vụ thất bại'); }
    finally { setLoadingSvc(false); }
  };

  const create = async () => {
    setError(''); setResult(null);
    if (!r.fullname || !r.phone || !r.address || !r.province || !r.district) { setError('Nhập đủ người nhận (tên, SĐT, địa chỉ, tỉnh, huyện).'); return; }
    if (!orderService) { setError('Chọn dịch vụ vận chuyển (bấm "Lấy dịch vụ").'); return; }
    setCreating(true);
    try {
      const res = await apiClientClient.post<{ trackingCode?: string; fee?: number; error?: string }>('/viettelpost/orders', {
        senderFullname: sender.name, senderPhone: sender.phone, senderAddress: sender.address,
        receiverFullname: r.fullname, receiverPhone: r.phone, receiverAddress: r.address,
        receiverProvince: Number(r.province), receiverDistrict: Number(r.district),
        receiverWard: r.ward ? Number(r.ward) : undefined,
        productType,
        items: items.map(it => ({ name: it.name || 'Hàng hóa', quantity: Number(it.quantity) || 1, weight: Number(it.weight) || 0, price: Number(it.price) || 0 })),
        productLength: Number(dim.length) || 0, productWidth: Number(dim.width) || 0, productHeight: Number(dim.height) || 0,
        orderReference: orderReference || undefined,
        cod: Number(cod) || 0, orderPayment: Number(orderPayment) || 3, orderService,
        serviceAdd: SPECIAL.filter(s => special[s.code]).map(s => s.code),
        orderNote,
      });
      if (res.error) { setError('ViettelPost: ' + res.error); return; }
      setResult(res);
    } catch (err) { setError(err instanceof Error ? err.message : 'Tạo đơn thất bại'); }
    finally { setCreating(false); }
  };

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500';
  const lbl = 'block text-xs text-gray-500 mb-1';
  const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4';
  const h2 = 'font-bold text-gray-800 flex items-center gap-2';

  if (result?.trackingCode) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-gray-900">Tạo đơn ViettelPost thành công</h1>
        <p className="text-gray-600">Mã vận đơn: <span className="font-mono font-bold text-indigo-600">{result.trackingCode}</span></p>
        {result.fee ? <p className="text-gray-600">Cước dự kiến: {money(result.fee)}</p> : null}
        <div className="flex gap-3 justify-center pt-2">
          <button onClick={() => { setResult(null); setR({ fullname: '', phone: '', address: '', province: '', district: '', ward: '' }); setItems([{ name: '', quantity: '1', weight: '500', price: '' }]); setCod(''); }} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm">Tạo đơn khác</button>
          <button onClick={() => router.push(`/admin/viettel-customers/${encodeURIComponent(result.trackingCode!)}`)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Xem chi tiết</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">←</button>
        <h1 className="text-xl font-bold text-gray-900">➕ Tạo đơn ViettelPost</h1>
        <span className="text-xs text-red-500 ml-auto">(*) trường bắt buộc</span>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ===== CỘT TRÁI ===== */}
        <div className="space-y-5">
          {/* Người gửi */}
          <div className={card}>
            <h2 className={h2}>🧍 Người gửi</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Tên người gửi</label><input className={inp} value={sender.name} onChange={e => setSender({ ...sender, name: e.target.value })} /></div>
              <div><label className={lbl}>SĐT</label><input className={inp} value={sender.phone} onChange={e => setSender({ ...sender, phone: e.target.value })} /></div>
            </div>
            <div><label className={lbl}>Địa chỉ gửi</label><input className={inp} value={sender.address} onChange={e => setSender({ ...sender, address: e.target.value })} /></div>
            <p className="text-xs text-gray-400">Khu vực gửi: Hà Nội · Cầu Giấy · Dịch Vọng (theo cấu hình tài khoản).</p>
          </div>

          {/* Người nhận */}
          <div className={card}>
            <h2 className={h2}>📍 Người nhận</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>SĐT *</label><input className={inp} value={r.phone} onChange={e => setRv('phone', e.target.value)} /></div>
              <div><label className={lbl}>Họ tên *</label><input className={inp} value={r.fullname} onChange={e => setRv('fullname', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Tỉnh/TP *</label>
                <select className={inp} value={r.province} onChange={e => void onProvince(e.target.value)}>
                  <option value="">— chọn —</option>
                  {provinces.map(p => <option key={p.PROVINCE_ID} value={p.PROVINCE_ID}>{p.PROVINCE_NAME}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Quận/Huyện *</label>
                <select className={inp} value={r.district} onChange={e => void onDistrict(e.target.value)} disabled={!districts.length}>
                  <option value="">— chọn —</option>
                  {districts.map(d => <option key={d.DISTRICT_ID} value={d.DISTRICT_ID}>{d.DISTRICT_NAME}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Phường/Xã</label>
                <select className={inp} value={r.ward} onChange={e => setRv('ward', e.target.value)} disabled={!wards.length}>
                  <option value="">— chọn —</option>
                  {wards.map(w => <option key={w.WARDS_ID} value={w.WARDS_ID}>{w.WARDS_NAME}</option>)}
                </select>
              </div>
            </div>
            <div><label className={lbl}>Địa chỉ chi tiết (số nhà, đường…) *</label><input className={inp} value={r.address} onChange={e => setRv('address', e.target.value)} /></div>
          </div>

          {/* Dịch vụ */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <h2 className={h2}>🚚 Chọn dịch vụ</h2>
              <button onClick={() => void getServices()} disabled={loadingSvc} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm disabled:opacity-50">{loadingSvc ? 'Đang lấy...' : '↻ Lấy dịch vụ & cước'}</button>
            </div>
            {services.length > 0 ? (
              <select className={inp} value={orderService} onChange={e => setOrderService(e.target.value)}>
                <option value="">— chọn dịch vụ —</option>
                {services.map(s => <option key={s.MA_DV_CHINH} value={s.MA_DV_CHINH}>{s.TEN_DICHVU} — {money(s.GIA_CUOC)}{s.THOI_GIAN ? ` (${s.THOI_GIAN})` : ''}</option>)}
              </select>
            ) : <p className="text-sm text-gray-400">Chọn tỉnh/huyện + cân nặng rồi bấm "Lấy dịch vụ".</p>}
          </div>
        </div>

        {/* ===== CỘT PHẢI ===== */}
        <div className="space-y-5">
          {/* Hàng hóa */}
          <div className={card}>
            <h2 className={h2}>📦 Thông tin hàng hóa</h2>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={productType === 'HH'} onChange={() => setProductType('HH')} /> Bưu kiện</label>
              <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={productType === 'TaiLieu'} onChange={() => setProductType('TaiLieu')} /> Tài liệu</label>
            </div>
            {/* Danh sách hàng */}
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className={`${inp} col-span-5`} placeholder={`Tên hàng ${i + 1}`} value={it.name} onChange={e => setItem(i, 'name', e.target.value)} />
                  <input className={`${inp} col-span-2`} type="number" placeholder="SL" title="Số lượng" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                  <input className={`${inp} col-span-2`} type="number" placeholder="g" title="Trọng lượng (g)" value={it.weight} onChange={e => setItem(i, 'weight', e.target.value)} />
                  <input className={`${inp} col-span-2`} type="number" placeholder="Giá trị" title="Giá trị (đ)" value={it.price} onChange={e => setItem(i, 'price', e.target.value)} />
                  <button onClick={() => delItem(i)} className="col-span-1 text-red-500 hover:text-red-700 text-lg" title="Xóa">✕</button>
                </div>
              ))}
              <button onClick={addItem} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold">+ Thêm hàng hóa</button>
            </div>
            <div className="flex justify-between text-sm text-gray-600 border-t border-gray-100 pt-2">
              <span>Tổng khối lượng: <b className="text-gray-900">{totalWeight} g</b></span>
              <span>Tổng giá trị: <b className="text-gray-900">{money(totalValue)}</b></span>
            </div>
            {/* Tính chất đặc biệt */}
            <div>
              <span className={lbl}>Tính chất đặc biệt</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-1 text-sm">
                {SPECIAL.map(s => (
                  <label key={s.code} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!!special[s.code]} onChange={e => setSpecial(p => ({ ...p, [s.code]: e.target.checked }))} /> {s.label}
                  </label>
                ))}
              </div>
            </div>
            {/* Kích thước + mã đơn */}
            <div className="grid grid-cols-3 gap-2">
              <input className={inp} type="number" placeholder="Dài (cm)" value={dim.length} onChange={e => setDim({ ...dim, length: e.target.value })} />
              <input className={inp} type="number" placeholder="Rộng (cm)" value={dim.width} onChange={e => setDim({ ...dim, width: e.target.value })} />
              <input className={inp} type="number" placeholder="Cao (cm)" value={dim.height} onChange={e => setDim({ ...dim, height: e.target.value })} />
            </div>
            <div><label className={lbl}>Mã đơn hàng (tự tạo, tùy chọn)</label><input className={inp} value={orderReference} onChange={e => setOrderReference(e.target.value)} /></div>
          </div>

          {/* Tiền thu hộ */}
          <div className={card}>
            <h2 className={h2}>💰 Tiền thu hộ & cước</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>COD (tiền thu hộ, đ)</label><input className={inp} type="number" value={cod} onChange={e => setCod(e.target.value)} /></div>
              <div>
                <span className={lbl}>Người trả cước</span>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={orderPayment === '3'} onChange={() => setOrderPayment('3')} /> Người gửi</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={orderPayment === '2'} onChange={() => setOrderPayment('2')} /> Người nhận</label>
                </div>
              </div>
            </div>
            <div><label className={lbl}>Ghi chú</label><textarea rows={2} className={inp} value={orderNote} onChange={e => setOrderNote(e.target.value)} /></div>
          </div>
        </div>
      </div>

      <button onClick={() => void create()} disabled={creating} className="w-full lg:w-auto lg:px-10 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50">
        {creating ? 'Đang tạo đơn trên ViettelPost...' : '🚀 Tạo đơn & đẩy sang ViettelPost'}
      </button>
    </div>
  );
}

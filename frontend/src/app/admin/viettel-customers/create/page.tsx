'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface Province { PROVINCE_ID: number; PROVINCE_NAME: string }
interface District { DISTRICT_ID: number; DISTRICT_NAME: string }
interface Ward { WARDS_ID: number; WARDS_NAME: string }
interface Service { MA_DV_CHINH: string; TEN_DICHVU: string; GIA_CUOC: number; THOI_GIAN?: string }

const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';

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

  const [f, setF] = useState({
    receiverFullname: '', receiverPhone: '', receiverAddress: '',
    receiverProvince: '', receiverDistrict: '', receiverWard: '',
    productName: '', productPrice: '', productWeight: '500', productQuantity: '1',
    cod: '', orderService: '', orderNote: '',
    orderPayment: '3', xemHang: true,
  });
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    void apiClientClient.get<Province[]>('/viettelpost/address/provinces').then(setProvinces).catch(() => {});
  }, []);

  const onProvince = useCallback(async (id: string) => {
    setF(p => ({ ...p, receiverProvince: id, receiverDistrict: '', receiverWard: '' }));
    setDistricts([]); setWards([]); setServices([]);
    if (id) setDistricts(await apiClientClient.get<District[]>(`/viettelpost/address/districts?provinceId=${id}`).catch(() => []));
  }, []);

  const onDistrict = useCallback(async (id: string) => {
    setF(p => ({ ...p, receiverDistrict: id, receiverWard: '' }));
    setWards([]); setServices([]);
    if (id) setWards(await apiClientClient.get<Ward[]>(`/viettelpost/address/wards?districtId=${id}`).catch(() => []));
  }, []);

  const getServices = async () => {
    setError(''); setServices([]); setLoadingSvc(true);
    try {
      if (!f.receiverProvince || !f.receiverDistrict) { setError('Chọn Tỉnh/Huyện người nhận trước.'); return; }
      const list = await apiClientClient.post<Service[]>('/viettelpost/price', {
        RECEIVER_PROVINCE: Number(f.receiverProvince),
        RECEIVER_DISTRICT: Number(f.receiverDistrict),
        PRODUCT_WEIGHT: Number(f.productWeight) || 500,
        PRODUCT_PRICE: Number(f.productPrice) || 0,
        MONEY_COLLECTION: Number(f.cod) || 0,
      });
      setServices(Array.isArray(list) ? list : []);
      if (!list?.length) setError('Không có dịch vụ khả dụng cho tuyến này.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lấy dịch vụ thất bại');
    } finally { setLoadingSvc(false); }
  };

  const create = async () => {
    setError(''); setResult(null);
    if (!f.receiverFullname || !f.receiverPhone || !f.receiverAddress || !f.receiverProvince || !f.receiverDistrict) {
      setError('Nhập đủ người nhận (tên, SĐT, địa chỉ, tỉnh, huyện).'); return;
    }
    if (!f.orderService) { setError('Chọn dịch vụ vận chuyển (bấm "Lấy dịch vụ").'); return; }
    setCreating(true);
    try {
      const res = await apiClientClient.post<{ trackingCode?: string; fee?: number; error?: string }>('/viettelpost/orders', {
        receiverFullname: f.receiverFullname,
        receiverPhone: f.receiverPhone,
        receiverAddress: f.receiverAddress,
        receiverProvince: Number(f.receiverProvince),
        receiverDistrict: Number(f.receiverDistrict),
        receiverWard: f.receiverWard ? Number(f.receiverWard) : undefined,
        productName: f.productName || 'Hàng hóa',
        productPrice: Number(f.productPrice) || 0,
        productWeight: Number(f.productWeight) || 500,
        productQuantity: Number(f.productQuantity) || 1,
        cod: Number(f.cod) || 0,
        orderService: f.orderService,
        orderServiceAdd: f.xemHang ? 'XMG' : '',
        orderPayment: Number(f.orderPayment) || 3,
        orderNote: f.orderNote,
      });
      if (res.error) { setError('ViettelPost: ' + res.error); return; }
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo đơn thất bại');
    } finally { setCreating(false); }
  };

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500';
  const lbl = 'block text-xs text-gray-500 mb-1';

  if (result?.trackingCode) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-gray-900">Tạo đơn ViettelPost thành công</h1>
        <p className="text-gray-600">Mã vận đơn: <span className="font-mono font-bold text-indigo-600">{result.trackingCode}</span></p>
        {result.fee ? <p className="text-gray-600">Cước dự kiến: {money(result.fee)}</p> : null}
        <div className="flex gap-3 justify-center pt-2">
          <button onClick={() => { setResult(null); setF({ ...f, receiverFullname: '', receiverPhone: '', receiverAddress: '', cod: '', productName: '' }); }} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm">Tạo đơn khác</button>
          <button onClick={() => router.push(`/admin/viettel-customers/${encodeURIComponent(result.trackingCode!)}`)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Xem chi tiết</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">←</button>
        <h1 className="text-xl font-bold text-gray-900">➕ Tạo đơn &amp; đẩy sang ViettelPost</h1>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      {/* Người nhận + Hàng hóa & COD cùng 1 hàng (2 cột) */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-800">Người nhận</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Họ tên *</label><input className={input} value={f.receiverFullname} onChange={e => set('receiverFullname', e.target.value)} /></div>
          <div><label className={lbl}>SĐT *</label><input className={input} value={f.receiverPhone} onChange={e => set('receiverPhone', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Tỉnh/TP *</label>
            <select className={input} value={f.receiverProvince} onChange={e => void onProvince(e.target.value)}>
              <option value="">— chọn —</option>
              {provinces.map(p => <option key={p.PROVINCE_ID} value={p.PROVINCE_ID}>{p.PROVINCE_NAME}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Quận/Huyện *</label>
            <select className={input} value={f.receiverDistrict} onChange={e => void onDistrict(e.target.value)} disabled={!districts.length}>
              <option value="">— chọn —</option>
              {districts.map(d => <option key={d.DISTRICT_ID} value={d.DISTRICT_ID}>{d.DISTRICT_NAME}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Phường/Xã</label>
            <select className={input} value={f.receiverWard} onChange={e => set('receiverWard', e.target.value)} disabled={!wards.length}>
              <option value="">— chọn —</option>
              {wards.map(w => <option key={w.WARDS_ID} value={w.WARDS_ID}>{w.WARDS_NAME}</option>)}
            </select>
          </div>
        </div>
        <div><label className={lbl}>Địa chỉ chi tiết (số nhà, đường) *</label><input className={input} value={f.receiverAddress} onChange={e => set('receiverAddress', e.target.value)} /></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-800">Hàng hóa &amp; COD</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Tên sản phẩm</label><input className={input} value={f.productName} onChange={e => set('productName', e.target.value)} /></div>
          <div><label className={lbl}>Giá trị hàng (đ)</label><input type="number" className={input} value={f.productPrice} onChange={e => set('productPrice', e.target.value)} /></div>
          <div><label className={lbl}>Cân nặng (g) *</label><input type="number" className={input} value={f.productWeight} onChange={e => set('productWeight', e.target.value)} /></div>
          <div><label className={lbl}>Số lượng</label><input type="number" className={input} value={f.productQuantity} onChange={e => set('productQuantity', e.target.value)} /></div>
          <div><label className={lbl}>COD (tiền thu hộ, đ)</label><input type="number" className={input} value={f.cod} onChange={e => set('cod', e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className={lbl}>Người trả cước</span>
            <div className="flex items-center gap-4 mt-1 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="pay" checked={f.orderPayment === '3'} onChange={() => set('orderPayment', '3')} /> Người gửi</label>
              <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="pay" checked={f.orderPayment === '2'} onChange={() => set('orderPayment', '2')} /> Người nhận</label>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm mt-4">
            <input type="checkbox" checked={f.xemHang} onChange={e => setF(p => ({ ...p, xemHang: e.target.checked }))} />
            Cho khách xem hàng (XMG)
          </label>
        </div>
        <div><label className={lbl}>Ghi chú</label><input className={input} value={f.orderNote} onChange={e => set('orderNote', e.target.value)} /></div>
      </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Dịch vụ vận chuyển</h2>
          <button onClick={() => void getServices()} disabled={loadingSvc} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm disabled:opacity-50">
            {loadingSvc ? 'Đang lấy...' : '↻ Lấy dịch vụ & cước'}
          </button>
        </div>
        {services.length > 0 ? (
          <select className={input} value={f.orderService} onChange={e => set('orderService', e.target.value)}>
            <option value="">— chọn dịch vụ —</option>
            {services.map(s => <option key={s.MA_DV_CHINH} value={s.MA_DV_CHINH}>{s.TEN_DICHVU} — {money(s.GIA_CUOC)}{s.THOI_GIAN ? ` (${s.THOI_GIAN})` : ''}</option>)}
          </select>
        ) : <p className="text-sm text-gray-400">Chọn tỉnh/huyện + cân nặng rồi bấm "Lấy dịch vụ".</p>}
      </div>

      <button onClick={() => void create()} disabled={creating} className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50">
        {creating ? 'Đang tạo đơn trên ViettelPost...' : '🚀 Tạo đơn & đẩy sang ViettelPost'}
      </button>
    </div>
  );
}

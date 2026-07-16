'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVnd } from '@/lib/format';

interface Province { PROVINCE_ID: number; PROVINCE_NAME: string }
interface District { DISTRICT_ID: number; DISTRICT_NAME: string }
interface Ward { WARDS_ID: number; WARDS_NAME: string }
interface Service { MA_DV_CHINH: string; TEN_DICHVU: string; GIA_CUOC: number; THOI_GIAN?: string }
interface Item { name: string; quantity: string; weight: string; price: string }

const money = formatVnd;

// Ghi chú mặc định cho đơn (yêu cầu nghiệp vụ).
const DEFAULT_NOTE =
  'Tuyệt đối không cho thử hàng, chỉ được mở hàng và kiểm tra hàng - Bưu tá quay video khi khách mở hàng, tránh bị mất hàng vì khách lấy do nhiều sản phẩm';

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

// Chuẩn hoá tỉnh/xã (hệ mới có thể trả key khác → nhận diện linh hoạt).
const normProvince = (p: any): Province => ({ PROVINCE_ID: p.PROVINCE_ID ?? p.id ?? p.ID, PROVINCE_NAME: p.PROVINCE_NAME ?? p.name ?? p.NAME ?? '' });
const normWard = (w: any): Ward => ({ WARDS_ID: w.WARDS_ID ?? w.WARD_ID ?? w.id ?? w.ID, WARDS_NAME: w.WARDS_NAME ?? w.WARD_NAME ?? w.name ?? w.NAME ?? '' });

const emptyR = { fullname: '', phone: '', address: '', province: '', district: '', ward: '' };

export default function CreateViettelOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDraft = searchParams.get('draft');

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingSvc, setLoadingSvc] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [result, setResult] = useState<{ trackingCode?: string; fee?: number } | null>(null);
  const [draftCode, setDraftCode] = useState<string | null>(initialDraft);

  // Địa danh mới (2 cấp: Tỉnh → Phường/Xã, bỏ Huyện)
  const [useNewAddress, setUseNewAddress] = useState(false);

  // Người gửi (mặc định CHY SHOP — sửa được; địa điểm cố định theo cấu hình)
  const [sender, setSender] = useState({ name: 'CHY SHOP', phone: '0966500911', address: '72 Trần Đăng Ninh' });
  // Người nhận
  const [r, setR] = useState({ ...emptyR });
  const setRv = (k: string, v: string) => setR(p => ({ ...p, [k]: v }));
  // Hàng hóa
  const [productType, setProductType] = useState<'HH' | 'TaiLieu'>('HH');
  const [items, setItems] = useState<Item[]>([{ name: '', quantity: '1', weight: '500', price: '' }]);
  const [dim, setDim] = useState({ length: '', width: '', height: '' });
  const [orderReference, setOrderReference] = useState('');
  const [special, setSpecial] = useState<Record<string, boolean>>({ XMG: true });
  // Tiền / dịch vụ
  const [cod, setCod] = useState('');
  const [codTouched, setCodTouched] = useState(false); // user đã sửa tay COD → ngừng tự bám tổng giá trị
  const [orderPayment, setOrderPayment] = useState('3');
  const [orderNote, setOrderNote] = useState(DEFAULT_NOTE);
  const [orderService, setOrderService] = useState('');

  const flashToast = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 3000); };

  // Mã đơn gợi ý = CHYSHOP + (tổng đơn VTP + 1) — lấy từ backend.
  const loadNextRef = useCallback(async () => {
    try {
      const res = await apiClientClient.get<{ orderReference: string }>('/viettelpost/next-order-ref');
      if (res?.orderReference) setOrderReference(res.orderReference);
    } catch { /* để trống nếu lỗi */ }
  }, []);

  // Prefill mã đơn cho đơn MỚI (không phải khi mở nháp đã có mã).
  useEffect(() => { if (!initialDraft) void loadNextRef(); }, [initialDraft, loadNextRef]);

  // Tải danh sách tỉnh theo chế độ địa danh (cũ/mới). KHÔNG reset lựa chọn ở đây.
  useEffect(() => {
    const ep = useNewAddress ? '/viettelpost/address/provinces-new' : '/viettelpost/address/provinces';
    void apiClientClient.get<any[]>(ep).then(list => setProvinces((Array.isArray(list) ? list : []).map(normProvince))).catch(() => setProvinces([]));
  }, [useNewAddress]);

  const loadWardsNew = async (id: string) =>
    setWards((await apiClientClient.get<any[]>(`/viettelpost/address/wards-new?provinceId=${id}`).catch(() => [])).map(normWard));
  const loadDistricts = async (id: string) =>
    setDistricts(await apiClientClient.get<District[]>(`/viettelpost/address/districts?provinceId=${id}`).catch(() => []));
  const loadWards = async (id: string) =>
    setWards(await apiClientClient.get<Ward[]>(`/viettelpost/address/wards?districtId=${id}`).catch(() => []));

  const onProvince = async (id: string) => {
    setR(p => ({ ...p, province: id, district: '', ward: '' })); setDistricts([]); setWards([]); setServices([]);
    if (!id) return;
    if (useNewAddress) await loadWardsNew(id); else await loadDistricts(id);
  };
  const onDistrict = async (id: string) => {
    setR(p => ({ ...p, district: id, ward: '' })); setWards([]); setServices([]);
    if (id) await loadWards(id);
  };

  // Bật/tắt địa danh mới → reset lựa chọn địa chỉ.
  const toggleNewAddress = () => {
    setUseNewAddress(v => !v);
    setR(p => ({ ...p, province: '', district: '', ward: '' }));
    setDistricts([]); setWards([]); setServices([]);
  };

  // ===== Nạp lại 1 NHÁP đã lưu (?draft=DRAFT-...) =====
  const hydrate = useCallback(async (dto: any) => {
    setSender({ name: dto.senderFullname || 'CHY SHOP', phone: dto.senderPhone || '', address: dto.senderAddress || '' });
    const useNew = !!dto.useNewAddress;
    setUseNewAddress(useNew);
    const prov = dto.receiverProvince ? String(dto.receiverProvince) : '';
    const dist = dto.receiverDistrict ? String(dto.receiverDistrict) : '';
    const ward = dto.receiverWard ? String(dto.receiverWard) : '';
    setR({
      fullname: dto.receiverFullname || '', phone: dto.receiverPhone || '', address: dto.receiverAddress || '',
      province: prov, district: dist, ward,
    });
    if (prov) {
      if (useNew) await loadWardsNew(prov);
      else { await loadDistricts(prov); if (dist) await loadWards(dist); }
    }
    setProductType(dto.productType === 'TaiLieu' ? 'TaiLieu' : 'HH');
    const its: Item[] = Array.isArray(dto.items) && dto.items.length
      ? dto.items.map((it: any) => ({ name: it.name || '', quantity: String(it.quantity ?? '1'), weight: String(it.weight ?? '500'), price: it.price ? String(it.price) : '' }))
      : [{ name: '', quantity: '1', weight: '500', price: '' }];
    setItems(its);
    setDim({ length: dto.productLength ? String(dto.productLength) : '', width: dto.productWidth ? String(dto.productWidth) : '', height: dto.productHeight ? String(dto.productHeight) : '' });
    setOrderReference(dto.orderReference || '');
    const sp: Record<string, boolean> = {};
    (Array.isArray(dto.serviceAdd) ? dto.serviceAdd : []).forEach((c: string) => { sp[c] = true; });
    setSpecial(sp);
    setCod(dto.cod ? String(dto.cod) : '');
    setCodTouched(true); // giữ COD đã lưu của nháp, không tự ghi đè
    setOrderPayment(dto.orderPayment ? String(dto.orderPayment) : '3');
    setOrderNote(dto.orderNote ?? DEFAULT_NOTE);
    setOrderService(dto.orderService || '');
  }, []);

  useEffect(() => {
    if (!initialDraft) return;
    void (async () => {
      try {
        const vc = await apiClientClient.get<any>(`/viettelpost/customers/${encodeURIComponent(initialDraft)}`);
        const dto = vc?.detailPayload?.dto;
        if (dto) await hydrate(dto);
      } catch { /* nháp không tồn tại → giữ form trống */ }
    })();
  }, [initialDraft, hydrate]);

  const totalWeight = items.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.quantity) || 1), 0);
  const totalValue = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);

  // COD tự bám theo Tổng giá trị hàng (đến khi user sửa tay).
  useEffect(() => {
    if (!codTouched) setCod(totalValue ? String(totalValue) : '');
  }, [totalValue, codTouched]);
  const setItem = (i: number, k: keyof Item, v: string) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems(arr => [...arr, { name: '', quantity: '1', weight: '500', price: '' }]);
  const delItem = (i: number) => setItems(arr => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr);

  // Gói toàn bộ form thành payload phẳng (dùng cho cả tạo đơn lẫn lưu nháp).
  const buildPayload = () => ({
    senderFullname: sender.name, senderPhone: sender.phone, senderAddress: sender.address,
    receiverFullname: r.fullname, receiverPhone: r.phone, receiverAddress: r.address,
    receiverProvince: Number(r.province) || 0,
    receiverDistrict: useNewAddress ? 0 : (Number(r.district) || 0),
    receiverWard: r.ward ? Number(r.ward) : undefined,
    useNewAddress,
    productType,
    items: items.map(it => ({ name: it.name || 'Hàng hóa', quantity: Number(it.quantity) || 1, weight: Number(it.weight) || 0, price: Number(it.price) || 0 })),
    productLength: Number(dim.length) || 0, productWidth: Number(dim.width) || 0, productHeight: Number(dim.height) || 0,
    orderReference: orderReference || undefined,
    cod: Number(cod) || 0, orderPayment: Number(orderPayment) || 3, orderService,
    serviceAdd: SPECIAL.filter(s => special[s.code]).map(s => s.code),
    orderNote,
  });

  const getServices = async () => {
    setError(''); setServices([]); setLoadingSvc(true);
    try {
      if (!r.province || (!useNewAddress && !r.district)) { setError(useNewAddress ? 'Chọn Tỉnh người nhận trước.' : 'Chọn Tỉnh/Huyện người nhận trước.'); return; }
      const list = await apiClientClient.post<Service[]>('/viettelpost/price', {
        RECEIVER_PROVINCE: Number(r.province),
        RECEIVER_DISTRICT: useNewAddress ? 0 : Number(r.district),
        PRODUCT_WEIGHT: totalWeight || 500, PRODUCT_PRICE: totalValue, MONEY_COLLECTION: Number(cod) || 0,
      });
      setServices(Array.isArray(list) ? list : []);
      if (!list?.length) setError('Không có dịch vụ khả dụng cho tuyến này.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Lấy dịch vụ thất bại'); }
    finally { setLoadingSvc(false); }
  };

  // Kiểm tra người nhận theo chế độ địa danh.
  const validateReceiver = (): string => {
    if (!r.fullname || !r.phone || !r.address || !r.province) return 'Nhập đủ người nhận (tên, SĐT, địa chỉ, tỉnh).';
    if (useNewAddress) { if (!r.ward) return 'Chọn Phường/Xã (địa danh mới).'; }
    else if (!r.district) return 'Chọn Quận/Huyện người nhận.';
    return '';
  };

  const create = async () => {
    setError(''); setResult(null);
    const v = validateReceiver();
    if (v) { setError(v); return; }
    if (!orderService) { setError('Chọn dịch vụ vận chuyển (bấm "Lấy dịch vụ").'); return; }
    setCreating(true);
    try {
      const res = await apiClientClient.post<{ trackingCode?: string; fee?: number; error?: string }>('/viettelpost/orders', {
        ...buildPayload(),
        draftCode: draftCode || undefined,
      });
      if (res.error) { setError('ViettelPost: ' + res.error); return; }
      setResult(res);
      setDraftCode(null); // nháp đã được backend dọn
    } catch (err) { setError(err instanceof Error ? err.message : 'Tạo đơn thất bại'); }
    finally { setCreating(false); }
  };

  const saveDraft = async () => {
    setError(''); setSavingDraft(true);
    try {
      const res = await apiClientClient.post<{ draftCode: string }>('/viettelpost/drafts', {
        ...buildPayload(),
        draftCode: draftCode || undefined,
      });
      setDraftCode(res.draftCode);
      flashToast('Đã lưu nháp: ' + res.draftCode);
    } catch (err) { setError(err instanceof Error ? err.message : 'Lưu nháp thất bại'); }
    finally { setSavingDraft(false); }
  };

  const discardOrDeleteDraft = async () => {
    if (draftCode) {
      if (!window.confirm('Xoá nháp này?')) return;
      try { await apiClientClient.delete(`/viettelpost/drafts/${encodeURIComponent(draftCode)}`); } catch { /* ignore */ }
      router.push('/admin/viettel-customers');
    } else {
      if (!window.confirm('Bỏ form và quay lại danh sách?')) return;
      router.push('/admin/viettel-customers');
    }
  };

  // Hủy đơn ĐÃ ĐẨY trên VTP (UpdateOrder TYPE=4) — từ màn hình kết quả.
  const cancelOnVtp = async () => {
    if (!result?.trackingCode) return;
    if (!window.confirm(`Hủy đơn ${result.trackingCode} trên ViettelPost?`)) return;
    setCancelling(true); setError('');
    try {
      const res = await apiClientClient.post<{ ok: boolean; message: string }>(
        `/viettelpost/customers/${encodeURIComponent(result.trackingCode)}/update-status`, { type: 4 },
      );
      setCancelled(true);
      flashToast('Hủy đơn: ' + res.message);
    } catch (err) { setError(err instanceof Error ? err.message : 'Hủy đơn thất bại'); }
    finally { setCancelling(false); }
  };

  const resetForm = () => {
    setResult(null); setCancelled(false); setDraftCode(null);
    setR({ ...emptyR }); setItems([{ name: '', quantity: '1', weight: '500', price: '' }]);
    setCod(''); setCodTouched(false); setOrderService(''); setServices([]); setOrderNote(DEFAULT_NOTE);
    void loadNextRef();
  };

  const inp = 'w-full border border-[#c7ced9] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] bg-white transition-colors';
  const lbl = 'block text-xs text-[#6b7280] font-semibold mb-1.5';
  const card = 'bg-white rounded-[14px] border border-[#eceef2] p-[22px] space-y-4';
  const h2 = 'text-[15px] font-extrabold text-[#111827] flex items-center gap-2';

  if (result?.trackingCode) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-white rounded-[16px] border border-[#eceef2] p-8 text-center space-y-4">
        <div className="text-5xl">{cancelled ? '🚫' : '✅'}</div>
        <h1 className="text-xl font-extrabold text-[#111827]">{cancelled ? 'Đã hủy đơn ViettelPost' : 'Tạo đơn ViettelPost thành công'}</h1>
        <p className="text-[#4b5563]">Mã vận đơn: <span className="font-mono font-bold text-[#2563eb]">{result.trackingCode}</span></p>
        {result.fee ? <p className="text-[#4b5563]">Cước dự kiến: {money(result.fee)}</p> : null}
        {error && <div className="p-3 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] text-[#dc2626] text-sm">{error}</div>}
        <div className="flex gap-3 justify-center flex-wrap pt-2">
          <button onClick={resetForm} className="px-4 py-2.5 rounded-[10px] bg-[#f3f4f6] hover:bg-[#e5e7eb] text-sm font-semibold transition">Tạo đơn khác</button>
          {!cancelled && (
            <button onClick={() => void cancelOnVtp()} disabled={cancelling} className="px-4 py-2.5 rounded-[10px] bg-[#dc2626] hover:brightness-95 text-white text-sm font-semibold disabled:opacity-50 transition">
              {cancelling ? 'Đang hủy...' : '🚫 Hủy đơn'}
            </button>
          )}
          <button onClick={() => router.push(`/admin/viettel-customers/${encodeURIComponent(result.trackingCode!)}`)} className="px-4 py-2.5 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold transition">Xem chi tiết</button>
        </div>
        {toast && <div className="text-sm text-[#047857]">✓ {toast}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="px-3.5 py-2 rounded-[9px] bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[13px] font-bold text-[#374151] transition">←</button>
        <h1 className="text-[21px] font-extrabold tracking-[-0.3px] text-[#111827]">➕ {draftCode ? 'Sửa nháp đơn ViettelPost' : 'Tạo đơn ViettelPost'}</h1>
        {draftCode && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e]">Nháp</span>}
        <span className="text-xs text-[#dc2626] font-semibold ml-auto">(*) trường bắt buộc</span>
      </div>

      {error && <div className="p-3 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] text-[#dc2626] text-[13px]">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4 items-start">
        {/* ===== CỘT TRÁI ===== */}
        <div className="flex flex-col gap-4">
          {/* Người gửi */}
          <div className={card}>
            <h2 className={h2}>👤 Người gửi</h2>
            <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
              <div><label className={lbl}>Tên người gửi</label><input className={inp} value={sender.name} onChange={e => setSender({ ...sender, name: e.target.value })} /></div>
              <div><label className={lbl}>SĐT</label><input className={inp} value={sender.phone} onChange={e => setSender({ ...sender, phone: e.target.value })} /></div>
            </div>
            <div><label className={lbl}>Địa chỉ gửi</label><input className={inp} value={sender.address} onChange={e => setSender({ ...sender, address: e.target.value })} /></div>
            <p className="text-xs text-[#9ca3af]">Khu vực gửi: Hà Nội · Cầu Giấy · Dịch Vọng (theo cấu hình tài khoản).</p>
          </div>

          {/* Người nhận */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <h2 className={h2}>📍 Người nhận</h2>
              {/* Toggle địa danh mới — switch 34×20, knob 16 */}
              <label className="flex items-center gap-2 cursor-pointer text-[12.5px] text-[#6b7280] select-none">
                <span>Địa danh mới</span>
                <button type="button" role="switch" aria-checked={useNewAddress} onClick={toggleNewAddress}
                  className={`relative inline-flex h-5 w-[34px] items-center rounded-full transition-colors ${useNewAddress ? 'bg-[#2563eb]' : 'bg-[#d1d5db]'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useNewAddress ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>
            {useNewAddress && <p className="text-xs text-[#d97706] -mt-2 font-semibold">Hệ địa giới mới (sau 1/7/2025): chỉ chọn Tỉnh → Phường/Xã.</p>}
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className={lbl}>SĐT <span className="text-[#dc2626]">*</span></label><input className={inp} value={r.phone} onChange={e => setRv('phone', e.target.value)} /></div>
              <div><label className={lbl}>Họ tên <span className="text-[#dc2626]">*</span></label><input className={inp} value={r.fullname} onChange={e => setRv('fullname', e.target.value)} /></div>
            </div>
            <div className={`grid gap-2.5 ${useNewAddress ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <div>
                <label className={lbl}>Tỉnh/TP <span className="text-[#dc2626]">*</span></label>
                <select className={inp} value={r.province} onChange={e => void onProvince(e.target.value)}>
                  <option value="">— chọn —</option>
                  {provinces.map(p => <option key={p.PROVINCE_ID} value={p.PROVINCE_ID}>{p.PROVINCE_NAME}</option>)}
                </select>
              </div>
              {!useNewAddress && (
                <div>
                  <label className={lbl}>Quận/Huyện <span className="text-[#dc2626]">*</span></label>
                  <select className={inp} value={r.district} onChange={e => void onDistrict(e.target.value)} disabled={!districts.length}>
                    <option value="">— chọn —</option>
                    {districts.map(d => <option key={d.DISTRICT_ID} value={d.DISTRICT_ID}>{d.DISTRICT_NAME}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={lbl}>Phường/Xã {useNewAddress ? <span className="text-[#dc2626]">*</span> : ''}</label>
                <select className={inp} value={r.ward} onChange={e => setRv('ward', e.target.value)} disabled={!wards.length}>
                  <option value="">— chọn —</option>
                  {wards.map(w => <option key={w.WARDS_ID} value={w.WARDS_ID}>{w.WARDS_NAME}</option>)}
                </select>
              </div>
            </div>
            <div><label className={lbl}>Địa chỉ chi tiết (số nhà, đường…) <span className="text-[#dc2626]">*</span></label><input className={inp} value={r.address} onChange={e => setRv('address', e.target.value)} /></div>
          </div>

          {/* Dịch vụ */}
          <div className={card}>
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <h2 className={h2}>🚚 Chọn dịch vụ</h2>
              <button onClick={() => void getServices()} disabled={loadingSvc} className="px-3.5 py-2 rounded-[9px] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[12.5px] font-bold text-[#374151] disabled:opacity-50 transition">{loadingSvc ? 'Đang lấy...' : '↻ Lấy dịch vụ & cước'}</button>
            </div>
            {services.length > 0 ? (
              <select className={inp} value={orderService} onChange={e => setOrderService(e.target.value)}>
                <option value="">— chọn dịch vụ —</option>
                {services.map(s => <option key={s.MA_DV_CHINH} value={s.MA_DV_CHINH}>{s.TEN_DICHVU} — {money(s.GIA_CUOC)}{s.THOI_GIAN ? ` (${s.THOI_GIAN})` : ''}</option>)}
              </select>
            ) : <p className="text-[13px] text-[#9ca3af]">Chọn tỉnh/huyện + cân nặng rồi bấm "Lấy dịch vụ".</p>}
          </div>
        </div>

        {/* ===== CỘT PHẢI ===== */}
        <div className="flex flex-col gap-4">
          {/* Hàng hóa */}
          <div className={card}>
            <h2 className={h2}>📦 Thông tin hàng hóa</h2>
            <div className="flex items-center gap-4 text-[13px] font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" className="accent-[#2563eb]" checked={productType === 'HH'} onChange={() => setProductType('HH')} /> Bưu kiện</label>
              <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" className="accent-[#2563eb]" checked={productType === 'TaiLieu'} onChange={() => setProductType('TaiLieu')} /> Tài liệu</label>
            </div>
            {/* Danh sách hàng */}
            <div className="space-y-2">
              {items.map((it, i) => {
                // Bỏ w-full của class chung — w-full đè width cố định làm ô Tên hàng bị bóp dí thành sliver.
                const rowInp = inp.replace('w-full ', '');
                return (
                <div key={i} className="flex gap-1.5 items-center">
                  {/* Tên hàng flex-4 + spacer flex-1 cuối dòng = ô tên chiếm 80% không gian co giãn (thu 20% theo yêu cầu). */}
                  <input className={`${rowInp} flex-[4] min-w-0`} placeholder={`Tên hàng ${i + 1}`} value={it.name} onChange={e => setItem(i, 'name', e.target.value)} />
                  <input className={`${rowInp} w-[52px] shrink-0 px-1.5 text-center`} type="number" placeholder="SL" title="Số lượng" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                  <input className={`${rowInp} w-[70px] shrink-0 px-1.5 text-right`} type="number" placeholder="g" title="Trọng lượng (g)" value={it.weight} onChange={e => setItem(i, 'weight', e.target.value)} />
                  <input className={`${rowInp} w-[90px] shrink-0 px-2 text-right`} type="number" placeholder="Giá trị" title="Giá trị (đ)" value={it.price} onChange={e => setItem(i, 'price', e.target.value)} />
                  <button onClick={() => delItem(i)} className="text-[#dc2626] hover:brightness-90 text-lg font-bold shrink-0" title="Xóa">✕</button>
                  <span className="flex-1" />
                </div>
                );
              })}
              <button onClick={addItem} className="text-[#2563eb] hover:text-[#1d4ed8] text-[12.5px] font-bold">+ Thêm hàng hóa</button>
            </div>
            <div className="flex justify-between text-[13px] text-[#4b5563] border-t border-[#f3f4f6] pt-2.5">
              <span>Tổng khối lượng: <b className="text-[#111827]">{totalWeight} g</b></span>
              <span>Tổng giá trị: <b className="text-[#111827]">{money(totalValue)}</b></span>
            </div>
            {/* Tính chất đặc biệt */}
            <div>
              <span className="block text-xs font-bold text-[#6b7280] mb-2">Tính chất đặc biệt</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-[12.5px] font-semibold">
                {SPECIAL.map(s => (
                  <label key={s.code} className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" className="accent-[#2563eb]" checked={!!special[s.code]} onChange={e => setSpecial(p => ({ ...p, [s.code]: e.target.checked }))} /> {s.label}
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
            <div><label className={lbl}>Mã đơn hàng (tự sinh: CHYSHOP + số đơn, sửa được)</label><input className={`${inp} font-mono`} value={orderReference} onChange={e => setOrderReference(e.target.value)} /></div>
          </div>

          {/* Tiền thu hộ */}
          <div className={card}>
            <h2 className={h2}>💰 Tiền thu hộ & cước</h2>
            <div className="grid grid-cols-[1.3fr_1fr] gap-3">
              <div><label className={lbl}>COD (tiền thu hộ, đ) — mặc định = tổng giá trị</label><input className={`${inp} text-right`} type="number" placeholder={String(totalValue || '')} value={cod} onChange={e => { setCod(e.target.value); setCodTouched(true); }} /></div>
              <div>
                <span className={lbl}>Người trả cước</span>
                <div className="flex items-center gap-3 pt-1.5 text-[13px] font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" className="accent-[#2563eb]" checked={orderPayment === '3'} onChange={() => setOrderPayment('3')} /> Người gửi</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" className="accent-[#2563eb]" checked={orderPayment === '2'} onChange={() => setOrderPayment('2')} /> Người nhận</label>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#6b7280]">Ghi chú</label>
                <button type="button" onClick={() => setOrderNote(DEFAULT_NOTE)} className="text-[11.5px] text-[#2563eb] hover:text-[#1d4ed8] font-bold">↺ Ghi chú mặc định</button>
              </div>
              <textarea rows={3} className={`${inp} resize-y mt-1.5`} value={orderNote} onChange={e => setOrderNote(e.target.value)} />
            </div>
          </div>

          {/* ===== BỘ NÚT HÀNH ĐỘNG ===== */}
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => void create()} disabled={creating || savingDraft} className="flex-[2] min-w-[220px] px-4 py-3 rounded-[11px] bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-sm disabled:opacity-50 transition">
              {creating ? 'Đang tạo đơn trên ViettelPost...' : '🚀 Tạo đơn & đẩy sang ViettelPost'}
            </button>
            <button onClick={() => void saveDraft()} disabled={savingDraft || creating} className="flex-1 min-w-[120px] px-4 py-3 rounded-[11px] bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] font-bold text-[13.5px] disabled:opacity-50 transition">
              {savingDraft ? 'Đang lưu...' : draftCode ? '💾 Lưu nháp' : '📝 Lưu nháp'}
            </button>
            <button onClick={() => void discardOrDeleteDraft()} disabled={creating || savingDraft} className="px-[18px] py-3 rounded-[11px] bg-white border border-[#fecaca] hover:bg-[#fef2f2] text-[#dc2626] font-bold text-[13.5px] disabled:opacity-50 transition">
              {draftCode ? '🗑 Xoá nháp' : '✕ Hủy'}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] bg-[#0f172a] text-white text-sm shadow-lg">✓ {toast}</div>
      )}
    </div>
  );
}

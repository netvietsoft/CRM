'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndSymbol } from '@/lib/format';
import { vtpStatusCls, vtpStatusLabel } from '@/lib/vtpStatus';

interface VC {
  id: string;
  trackingCode: string;
  orderReference: string | null;
  status: number | null;
  statusName: string | null;
  statusDate: string | null;
  receiverFullname: string | null;
  receiverPhone: string | null;
  receiverAddress: string | null;
  receiverProvinceId: number | null;
  receiverDistrictId: number | null;
  receiverWardId: number | null;
  productName: string | null;
  cod: number;
  moneyTotalFee: number | null;
  moneyTotalVat: number | null;
  moneyFeeCod: number | null;
  productWeight: number | null;
  orderService: string | null;
  orderServiceAdd: string | null;
  orderPayment: number | null;
  expectedDeliveryDate: string | null;
  note: string | null;
  orderNote: string | null;
  locationCurrently: string | null;
  employeeName: string | null;
  employeePhone: string | null;
  isReturning: boolean;
  reasonCode: string | null;
  courierHistory: Array<{ status: number | null; statusName: string | null; note: string | null; location: string | null; at: string | null }> | null;
  rawPayload: unknown;
  detailPayload: unknown;
  createdAt: string;
  updatedAt: string;
}

const money = formatVndSymbol;
const date = (s: string | null) => { if (!s) return '—'; const d = new Date(s); return Number.isNaN(d.getTime()) ? s : d.toLocaleString('vi-VN', { hour12: false }); };

// `normal` = chữ thường (cho khối văn bản dài: địa chỉ, ghi chú, mô tả — in đậm cả đoạn khó đọc).
function Field({ label, children, normal }: { label: string; children: React.ReactNode; normal?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-[#9ca3af]">{label}</dt>
      <dd className={`mt-0.5 text-sm ${normal ? 'font-normal text-[#374151]' : 'font-bold text-[#111827]'} break-words`}>{children}</dd>
    </div>
  );
}

export default function ViettelCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = decodeURIComponent(String(params.code || ''));
  const [vc, setVc] = useState<VC | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  // form sửa
  const [form, setForm] = useState({ receiverFullname: '', receiverPhone: '', receiverAddress: '', orderNote: '', cod: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await apiClientClient.get<VC>(`/viettelpost/customers/${encodeURIComponent(code)}`);
      setVc(d);
      setForm({
        receiverFullname: d.receiverFullname || '',
        receiverPhone: d.receiverPhone || '',
        receiverAddress: d.receiverAddress || '',
        orderNote: d.orderNote || '',
        cod: String(d.cod ?? ''),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được');
    } finally { setLoading(false); }
  }, [code]);

  useEffect(() => { void load(); }, [load]);

  const copy = (label: string, v: string | null) => {
    if (!v) return;
    void navigator.clipboard.writeText(v);
    setToast(`Đã copy ${label}: ${v}`);
    window.setTimeout(() => setToast(''), 2200);
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await apiClientClient.post<{ local: string; vtp: { pushed: boolean; message: string } }>(
        `/viettelpost/customers/${encodeURIComponent(code)}`,
        { ...form, cod: form.cod === '' ? undefined : Number(form.cod) },
      );
      await load();
      setToast(`Đã lưu CRM. ViettelPost: ${res.vtp.message}`);
      window.setTimeout(() => setToast(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally { setSaving(false); }
  };

  const doAction = async (type: number, label: string) => {
    if (!window.confirm(`Xác nhận: "${label}" cho đơn ${code}?`)) return;
    setSaving(true); setError('');
    try {
      const res = await apiClientClient.post<{ ok: boolean; message: string }>(
        `/viettelpost/customers/${encodeURIComponent(code)}/update-status`,
        { type },
      );
      await load();
      setToast(`${label}: ${res.message}`);
      window.setTimeout(() => setToast(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-[#9ca3af]">Đang tải...</div>;
  if (error && !vc) return <div className="p-8 text-center text-[#dc2626]">{error}</div>;
  if (!vc) return null;

  const st = vc.status;
  const editable = st == null || st < 200;
  // Hành động hợp lệ theo trạng thái (UpdateOrder TYPE)
  const actions: Array<{ type: number; label: string; cls: string }> = [];
  if (editable) {
    actions.push({ type: 1, label: 'Duyệt đơn', cls: 'bg-[#2563eb] hover:bg-[#1d4ed8]' });
    actions.push({ type: 4, label: 'Hủy đơn', cls: 'bg-[#dc2626] hover:brightness-95' });
  }
  if (st === 505) {
    actions.push({ type: 2, label: 'Duyệt hoàn', cls: 'bg-[#c2410c] hover:brightness-95' });
    actions.push({ type: 3, label: 'Phát tiếp', cls: 'bg-[#16a34a] hover:bg-[#15803d]' });
  }
  if (st === 107) {
    actions.push({ type: 5, label: 'Gửi lại đơn', cls: 'bg-[#2563eb] hover:bg-[#1d4ed8]' });
    actions.push({ type: 11, label: 'Xóa đơn đã hủy', cls: 'bg-[#4b5563] hover:brightness-95' });
  }

  const inputCls = 'w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] bg-white transition-colors';

  // Toàn bộ field từ order/detail-v2 (đã lưu sẵn). Đọc trực tiếp, fallback về cột phẳng.
  const dp = (vc.detailPayload || {}) as Record<string, unknown>;
  const s = (v: unknown) => (v === null || v === undefined || v === '' ? '' : String(v));
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : money(Number(v) || 0));
  const PAY: Record<string, string> = { '1': 'Không thu tiền', '2': 'Thu hộ tiền hàng (COD)', '3': 'Thu hộ tiền cước', '4': 'Thu hộ tiền hàng + cước' };
  const senderAddr = [s(dp.SENDER_ADDRESS), s(dp.SENDER_WARD), s(dp.SENDER_DISTRICT), s(dp.SENDER_PROVINCE)].filter(Boolean).join(', ');
  const receiverAddr = s(dp.RECEIVER_ADDRESS) || vc.receiverAddress || '';

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <button onClick={() => router.back()} className="px-3.5 py-2 rounded-[9px] bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[13px] font-bold text-[#374151] transition">← Quay lại</button>
        <h1 className="text-[21px] font-extrabold tracking-[-0.3px] text-[#111827] flex items-center gap-2">
          📦 Đơn ViettelPost
          <button onClick={() => copy('mã vận đơn', vc.trackingCode)} title="Copy mã vận đơn" className="font-mono text-[#2563eb] hover:underline">{vc.trackingCode} ⧉</button>
        </h1>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${vtpStatusCls(vc.status)}`}>{vtpStatusLabel(vc.status, vc.statusName)}</span>
        <span className="text-[13px] text-[#6b7280]">cập nhật {date(vc.statusDate || vc.updatedAt)}</span>
        {/* Hành động ViettelPost (UpdateOrder) — hiện theo trạng thái đơn */}
        {actions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {actions.map(a => (
              <button key={a.type} onClick={() => void doAction(a.type, a.label)} disabled={saving}
                className={`px-3.5 py-2 rounded-[9px] text-white text-[13px] font-semibold disabled:opacity-50 transition ${a.cls}`}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="p-3 mb-4 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] text-[#dc2626] text-[13px]">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch mb-4">
        {/* Người gửi */}
        <div className="bg-white border border-[#eceef2] rounded-[14px] p-[22px]">
          <h2 className="text-base font-extrabold text-[#111827] mb-4">Người gửi</h2>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            <Field label="Tên">{s(dp.SENDER_FULLNAME) || '—'}</Field>
            <Field label="Điện thoại"><span className="font-mono">{s(dp.SENDER_PHONE) || '—'}</span></Field>
            <div className="col-span-2"><Field label="Địa chỉ" normal>{senderAddr || '—'}</Field></div>
          </dl>
        </div>

        {/* Người nhận */}
        <div className="bg-white border border-[#eceef2] rounded-[14px] p-[22px]">
          <h2 className="text-base font-extrabold text-[#111827] mb-4">Người nhận</h2>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            <Field label="Tên">{s(dp.RECEIVER_FULLNAME) || vc.receiverFullname || '—'}</Field>
            <Field label="Điện thoại"><span className="font-mono">{s(dp.RECEIVER_PHONE) || vc.receiverPhone || '—'}</span></Field>
            <div className="col-span-2"><Field label="Địa chỉ" normal>{receiverAddr || '—'}</Field></div>
          </dl>
        </div>

        {/* Thông tin hàng hóa */}
        <div className="bg-white border border-[#eceef2] rounded-[14px] p-[22px]">
          <h2 className="text-base font-extrabold text-[#111827] mb-4">Thông tin hàng hóa</h2>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            <div className="col-span-2"><Field label="Tên hàng">{s(dp.PRODUCT_NAME) || vc.productName || '—'}</Field></div>
            <Field label="Số lượng">{s(dp.PRODUCT_QUANTITY) || '—'}</Field>
            <Field label="Khối lượng">{dp.PRODUCT_WEIGHT ? `${dp.PRODUCT_WEIGHT} g` : (vc.productWeight ? `${vc.productWeight} g` : '—')}</Field>
            <Field label="Giá trị">{num(dp.PRODUCT_PRICE)}</Field>
            <Field label="Loại hàng">{s(dp.PRODUCT_TYPE) || '—'}</Field>
            <Field label="Kích thước (cm)">{[dp.PRODUCT_LENGTH, dp.PRODUCT_WIDTH, dp.PRODUCT_HEIGHT].every(x => x != null) ? `${dp.PRODUCT_LENGTH}×${dp.PRODUCT_WIDTH}×${dp.PRODUCT_HEIGHT}` : '—'}</Field>
            <Field label="Trọng lượng quy đổi">{dp.PRODUCT_EX_WEIGHT ? `${dp.PRODUCT_EX_WEIGHT} g` : '—'}</Field>
            {s(dp.PRODUCT_DESCRIPTION) && <div className="col-span-2"><Field label="Mô tả" normal>{s(dp.PRODUCT_DESCRIPTION)}</Field></div>}
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start mb-4">
        {/* Cột 1: Phí & thu hộ, phía dưới là Hành trình đơn (cùng cột, cùng bề rộng) */}
        <div className="space-y-4">
          {/* Phí & thu hộ */}
          <div className="bg-white border border-[#eceef2] rounded-[14px] p-[22px]">
            <h2 className="text-base font-extrabold text-[#111827] mb-4">Phí &amp; thu hộ</h2>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            <Field label="Tiền thu hộ (COD)">{num(dp.MONEY_COLLECTION ?? vc.cod)}</Field>
            <Field label="Tổng cước">{num(dp.MONEY_TOTAL)}</Field>
            <Field label="Phí chính">{num(dp.MONEY_TOTALFEE)}</Field>
            <Field label="VAT">{num(dp.MONEY_TOTALVAT)}</Field>
            <Field label="Phí thu hộ (COD)">{num(dp.MONEY_FEECOD)}</Field>
            <Field label="Phí dịch vụ cộng thêm">{num(dp.MONEY_FEEVAS)}</Field>
            <Field label="Phí bảo hiểm">{num(dp.MONEY_FEEINSURRANCE)}</Field>
            <Field label="Phí khác">{num(dp.MONEY_FEEOTHER)}</Field>
            <div className="col-span-2"><Field label="Hình thức thu">{PAY[s(dp.ORDER_PAYMENT)] || s(dp.ORDER_PAYMENT) || '—'}</Field></div>
          </dl>
          </div>

          {/* Hành trình đơn — ngay dưới Phí & thu hộ, cùng cột & bề rộng */}
          <div className="bg-white border border-[#eceef2] rounded-[14px] p-[22px]">
            <h2 className="text-base font-extrabold text-[#111827] mb-4">Hành trình đơn ({vc.courierHistory?.length || 0})</h2>
            <ol className="space-y-3">
              {(vc.courierHistory || []).slice().reverse().map((h, i) => (
                <li key={i} className="text-[13px] border-l-2 border-[#e5e7eb] pl-3 relative">
                  <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#2563eb]" />
                  <div className="font-bold text-[#111827]">{vtpStatusLabel(h.status, h.statusName)}</div>
                  <div className="text-[11.5px] text-[#9ca3af]">{date(h.at)}</div>
                  {h.note && <div className="text-[#6b7280] mt-0.5">{h.note}</div>}
                </li>
              ))}
              {(!vc.courierHistory || vc.courierHistory.length === 0) && <li className="text-[#9ca3af] text-[13px]">Chưa có hành trình.</li>}
            </ol>
          </div>
        </div>

        {/* Dịch vụ & mốc thời gian */}
        <div className="bg-white border border-[#eceef2] rounded-[14px] p-[22px]">
          <h2 className="text-base font-extrabold text-[#111827] mb-4">Dịch vụ &amp; thời gian</h2>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            <Field label="Dịch vụ">{s(dp.ORDER_SERVICE) || vc.orderService || '—'}</Field>
            <Field label="Dịch vụ cộng thêm">{s(dp.ORDER_SERVICE_ADD) || vc.orderServiceAdd || '—'}</Field>
            <Field label="Mã tham chiếu"><span className="font-mono">{s(dp.ORDER_REFERENCE) || vc.orderReference || '—'}</span></Field>
            <Field label="Ngày tạo">{date(s(dp.ORDER_SYSTEMDATE) || null)}</Field>
            <Field label="Ngày nhận hàng">{date(s(dp.ORDER_ACCEPTDATE) || null)}</Field>
            <Field label="Giao dự kiến">{s(dp.DELIVERY_DATE) || vc.expectedDeliveryDate || '—'}</Field>
            <Field label="Giao thành công">{date(s(dp.ORDER_SUCCESSDATE) || null)}</Field>
            <Field label="Bưu tá">{vc.employeeName ? `${vc.employeeName}${vc.employeePhone ? ' · ' + vc.employeePhone : ''}` : '—'}</Field>
            <div className="col-span-2"><Field label="Vị trí hiện tại">{vc.locationCurrently || '—'}</Field></div>
            <div className="col-span-2"><Field label="Ghi chú đơn" normal>{s(dp.ORDER_NOTE) || vc.orderNote || '—'}</Field></div>
            <Field label="Hoàn / Lý do lỗi">{vc.isReturning ? 'Có' : 'Không'}{vc.reasonCode ? ` · ${vc.reasonCode}` : ''}</Field>
          </dl>
        </div>

        {/* Sửa & cập nhật — cùng hàng với Phí & thu hộ (đổi chỗ với Hành trình) */}
        <div className="bg-white border border-[#eceef2] rounded-[14px] p-[22px]">
          <h2 className="text-base font-extrabold text-[#111827] mb-1.5">Sửa &amp; cập nhật</h2>
          {editable
            ? <div className="text-xs text-[#047857] font-semibold mb-3.5">Đơn chưa lấy hàng — sửa được trên VTP</div>
            : <div className="text-xs text-[#d97706] font-semibold mb-3.5">Đã vào khai thác — chỉ lưu CRM, VTP không cho sửa</div>}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[12.5px] font-bold text-[#111827] mb-1.5">Tên người nhận</label>
              <input className={inputCls} value={form.receiverFullname} onChange={e => setForm({ ...form, receiverFullname: e.target.value })} />
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[#111827] mb-1.5">SĐT người nhận</label>
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1 font-mono`} value={form.receiverPhone} onChange={e => setForm({ ...form, receiverPhone: e.target.value })} />
                <button type="button" onClick={() => copy('SĐT', form.receiverPhone)} className="px-3 rounded-[10px] bg-[#f3f4f6] hover:bg-[#e5e7eb] text-sm transition">📋</button>
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[#111827] mb-1.5">Địa chỉ nhận</label>
              <input className={inputCls} value={form.receiverAddress} onChange={e => setForm({ ...form, receiverAddress: e.target.value })} />
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[#111827] mb-1.5">COD</label>
              <input type="number" className={inputCls} value={form.cod} onChange={e => setForm({ ...form, cod: e.target.value })} />
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[#111827] mb-1.5">Ghi chú đơn</label>
              <textarea rows={3} className={`${inputCls} resize-y`} value={form.orderNote} onChange={e => setForm({ ...form, orderNote: e.target.value })} />
            </div>
            <button onClick={() => void save()} disabled={saving} className="w-full px-4 py-3 rounded-[11px] bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm disabled:opacity-50 transition mt-1">
              {saving ? 'Đang lưu...' : editable ? 'Lưu & đẩy lên ViettelPost' : 'Lưu vào CRM'}
            </button>
          </div>
        </div>
      </div>

      {/* Payload gốc */}
      <details className="bg-white border border-[#eceef2] rounded-[14px] px-[22px] py-4">
        <summary className="text-sm font-extrabold text-[#111827] cursor-pointer">Dữ liệu gốc (webhook + detail-v2)</summary>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <div>
            <div className="text-xs font-semibold text-[#6b7280] mb-1">Webhook payload</div>
            <pre className="text-[11.5px] leading-[1.6] bg-[#0f172a] text-[#a5f3fc] rounded-[10px] p-3.5 max-h-72 overflow-auto font-mono">{JSON.stringify(vc.rawPayload, null, 1)}</pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#6b7280] mb-1">order/detail-v2</div>
            <pre className="text-[11.5px] leading-[1.6] bg-[#0f172a] text-[#a5f3fc] rounded-[10px] p-3.5 max-h-72 overflow-auto font-mono">{JSON.stringify(vc.detailPayload, null, 1)}</pre>
          </div>
        </div>
      </details>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] bg-[#0f172a] text-white text-[13px] shadow-lg">✓ {toast}</div>
      )}
    </div>
  );
}

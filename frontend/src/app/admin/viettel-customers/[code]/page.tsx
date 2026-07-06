'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndSymbol } from '@/lib/format';

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[#9ca3af]">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-[#111827] break-words">{children}</dd>
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

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <button onClick={() => router.back()} className="px-3.5 py-2 rounded-[9px] bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[13px] font-bold text-[#374151] transition">← Quay lại</button>
        <h1 className="text-[21px] font-extrabold tracking-[-0.3px] text-[#111827] flex items-center gap-2">
          📦 Đơn ViettelPost
          <button onClick={() => copy('mã vận đơn', vc.trackingCode)} title="Copy mã vận đơn" className="font-mono text-[#2563eb] hover:underline">{vc.trackingCode} ⧉</button>
        </h1>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${editable ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#dbeafe] text-[#1d4ed8]'}`}>{vc.status ?? '—'} {vc.statusName || ''}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 items-start mb-4">
        {/* Thông tin (chỉ đọc) */}
        <div className="bg-white border border-[#eceef2] rounded-[14px] p-[22px]">
          <h2 className="text-base font-extrabold text-[#111827] mb-4">Thông tin đơn</h2>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            <Field label="Mã tham chiếu"><span className="font-mono">{vc.orderReference || '—'}</span></Field>
            <Field label="Sản phẩm">{vc.productName || '—'}</Field>
            <Field label="COD">{money(vc.cod)}</Field>
            <Field label="Cước (phí+VAT)">{money((vc.moneyTotalFee || 0) + (vc.moneyTotalVat || 0))}</Field>
            <Field label="Dịch vụ">{vc.orderService || '—'} {vc.orderServiceAdd || ''}</Field>
            <Field label="Cân nặng">{vc.productWeight ? `${vc.productWeight} g` : '—'}</Field>
            <Field label="Giao dự kiến">{vc.expectedDeliveryDate || '—'}</Field>
            <Field label="Bưu tá">{vc.employeeName ? `${vc.employeeName}${vc.employeePhone ? ' · ' + vc.employeePhone : ''}` : '—'}</Field>
            <div className="col-span-2"><Field label="Vị trí hiện tại">{vc.locationCurrently || '—'}</Field></div>
            <Field label="Hoàn / Lý do lỗi">{vc.isReturning ? 'Có' : 'Không'}{vc.reasonCode ? ` · ${vc.reasonCode}` : ''}</Field>
          </dl>
        </div>

        {/* Form sửa */}
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

      {/* Hành trình */}
      <div className="bg-white border border-[#eceef2] rounded-[14px] px-[22px] py-5 mb-3.5">
        <h2 className="text-[15px] font-extrabold text-[#111827] mb-3">Hành trình ({vc.courierHistory?.length || 0})</h2>
        <ol className="space-y-2">
          {(vc.courierHistory || []).slice().reverse().map((h, i) => (
            <li key={i} className="flex gap-3.5 text-[13px] flex-wrap">
              <span className="text-[#9ca3af] whitespace-nowrap">{date(h.at)}</span>
              <span className="font-bold text-[#111827]">{h.status ?? ''} {h.statusName || ''}</span>
              {h.note && <span className="text-[#6b7280]">— {h.note}</span>}
            </li>
          ))}
          {(!vc.courierHistory || vc.courierHistory.length === 0) && <li className="text-[#9ca3af] text-[13px]">Chưa có hành trình.</li>}
        </ol>
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

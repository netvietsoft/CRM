'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';

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

const money = (n: number | null) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);
const date = (s: string | null) => { if (!s) return '—'; const d = new Date(s); return Number.isNaN(d.getTime()) ? s : d.toLocaleString('vi-VN', { hour12: false }); };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900 break-words">{children}</dd>
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

  if (loading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;
  if (error && !vc) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!vc) return null;

  const editable = vc.status == null || vc.status < 200;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">← Quay lại</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              📦 Đơn ViettelPost
              <button onClick={() => copy('mã vận đơn', vc.trackingCode)} title="Copy mã vận đơn" className="font-mono text-indigo-600 hover:underline">{vc.trackingCode} 📋</button>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${editable ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{vc.status ?? '—'} {vc.statusName || ''}</span>
              <span className="ml-2">cập nhật {date(vc.statusDate || vc.updatedAt)}</span>
            </p>
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Thông tin (chỉ đọc) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-800">Thông tin đơn</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Mã tham chiếu">{vc.orderReference || '—'}</Field>
            <Field label="Sản phẩm">{vc.productName || '—'}</Field>
            <Field label="COD">{money(vc.cod)}</Field>
            <Field label="Cước (phí+VAT)">{money((vc.moneyTotalFee || 0) + (vc.moneyTotalVat || 0))}</Field>
            <Field label="Dịch vụ">{vc.orderService || '—'} {vc.orderServiceAdd || ''}</Field>
            <Field label="Cân nặng">{vc.productWeight ? `${vc.productWeight} g` : '—'}</Field>
            <Field label="Giao dự kiến">{vc.expectedDeliveryDate || '—'}</Field>
            <Field label="Bưu tá">{vc.employeeName ? `${vc.employeeName}${vc.employeePhone ? ' · ' + vc.employeePhone : ''}` : '—'}</Field>
            <Field label="Vị trí hiện tại">{vc.locationCurrently || '—'}</Field>
            <Field label="Hoàn / Lý do lỗi">{vc.isReturning ? 'Có' : 'Không'}{vc.reasonCode ? ` · ${vc.reasonCode}` : ''}</Field>
          </dl>
        </div>

        {/* Form sửa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Sửa &amp; cập nhật</h2>
            {editable
              ? <span className="text-xs text-green-600">Đơn chưa lấy hàng — sửa được trên VTP</span>
              : <span className="text-xs text-amber-600">Đã vào khai thác — chỉ lưu CRM, VTP không cho sửa</span>}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tên người nhận</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.receiverFullname} onChange={e => setForm({ ...form, receiverFullname: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">SĐT người nhận</label>
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" value={form.receiverPhone} onChange={e => setForm({ ...form, receiverPhone: e.target.value })} />
                <button type="button" onClick={() => copy('SĐT', form.receiverPhone)} className="px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">📋</button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Địa chỉ nhận</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.receiverAddress} onChange={e => setForm({ ...form, receiverAddress: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">COD</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.cod} onChange={e => setForm({ ...form, cod: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ghi chú đơn</label>
              <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.orderNote} onChange={e => setForm({ ...form, orderNote: e.target.value })} />
            </div>
            <button onClick={() => void save()} disabled={saving} className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm disabled:opacity-50">
              {saving ? 'Đang lưu...' : editable ? 'Lưu & đẩy lên ViettelPost' : 'Lưu vào CRM'}
            </button>
          </div>
        </div>
      </div>

      {/* Hành trình */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-3">Hành trình ({vc.courierHistory?.length || 0})</h2>
        <ol className="space-y-2">
          {(vc.courierHistory || []).slice().reverse().map((h, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-gray-400 whitespace-nowrap w-36">{date(h.at)}</span>
              <span className="font-medium text-gray-800">{h.status ?? ''} {h.statusName || ''}</span>
              {h.note && <span className="text-gray-500">— {h.note}</span>}
            </li>
          ))}
          {(!vc.courierHistory || vc.courierHistory.length === 0) && <li className="text-gray-400 text-sm">Chưa có hành trình.</li>}
        </ol>
      </div>

      {/* Payload gốc */}
      <details className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <summary className="font-bold text-gray-800 cursor-pointer">Dữ liệu gốc (webhook + detail-v2)</summary>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">Webhook payload</div>
            <pre className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-72 overflow-auto">{JSON.stringify(vc.rawPayload, null, 1)}</pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">order/detail-v2</div>
            <pre className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-72 overflow-auto">{JSON.stringify(vc.detailPayload, null, 1)}</pre>
          </div>
        </div>
      </details>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm shadow-lg">✓ {toast}</div>
      )}
    </div>
  );
}

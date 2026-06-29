'use client';
export const dynamic = 'force-dynamic';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

interface ViettelCustomer {
  id: string;
  trackingCode: string;
  orderReference: string | null;
  status: number | null;
  statusName: string | null;
  statusDate: string | null;
  receiverFullname: string | null;
  receiverPhone: string | null;
  receiverAddress: string | null;
  cod: number;
  moneyTotal: number | null;
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
  createdAt: string;
  updatedAt: string;
}

function fmtMoney(n: number | null) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
}

export default function ViettelCustomersPage() {
  const [rows, setRows] = useState<ViettelCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClientClient.get<ViettelCustomer[]>('/viettelpost/customers');
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalCod = rows.reduce((s, r) => s + (r.cod || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="text-sm text-gray-500 mt-1">Toàn bộ thông tin đơn/khách tải về từ ViettelPost (1 dòng / mã vận đơn, cập nhật theo webhook).</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
          {loading ? 'Đang tải...' : '↻ Làm mới'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-sm text-gray-500">Tổng khách/đơn</div>
          <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-sm text-gray-500">Tổng COD</div>
          <div className="text-2xl font-bold text-gray-900">{fmtMoney(totalCod)}</div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-100">
                <th className="px-3 py-3 font-semibold">Mã vận đơn</th>
                <th className="px-3 py-3 font-semibold">Người nhận</th>
                <th className="px-3 py-3 font-semibold">SĐT</th>
                <th className="px-3 py-3 font-semibold">Trạng thái</th>
                <th className="px-3 py-3 font-semibold text-right">COD</th>
                <th className="px-3 py-3 font-semibold">Dịch vụ</th>
                <th className="px-3 py-3 font-semibold text-right">Cân (g)</th>
                <th className="px-3 py-3 font-semibold">Bưu tá</th>
                <th className="px-3 py-3 font-semibold">Ghi chú đơn</th>
                <th className="px-3 py-3 font-semibold">Vị trí hiện tại</th>
                <th className="px-3 py-3 font-semibold">Cập nhật</th>
                <th className="px-3 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400">Chưa có khách Viettel nào. Dữ liệu sẽ tự về khi ViettelPost đẩy webhook.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <Fragment key={r.id}>
                    <tr className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} hover:bg-blue-50/40 border-b border-gray-50`}>
                      <td className="px-3 py-3 font-mono font-semibold text-gray-900">{r.trackingCode}</td>
                      <td className="px-3 py-3 text-gray-800">{r.receiverFullname || '—'}</td>
                      <td className="px-3 py-3 text-gray-500">{r.receiverPhone || <span className="text-gray-300 italic">webhook không gửi</span>}</td>
                      <td className="px-3 py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{r.status ?? '—'} {r.statusName || ''}</span></td>
                      <td className="px-3 py-3 text-right font-semibold">{fmtMoney(r.cod)}</td>
                      <td className="px-3 py-3 text-gray-600">{r.orderService || '—'}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{r.productWeight ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-600">{r.employeeName ? `${r.employeeName}${r.employeePhone ? ' · ' + r.employeePhone : ''}` : '—'}</td>
                      <td className="px-3 py-3 text-gray-500 max-w-[200px] truncate" title={r.orderNote || ''}>{r.orderNote || '—'}</td>
                      <td className="px-3 py-3 text-gray-500 max-w-[220px] truncate" title={r.locationCurrently || ''}>{r.locationCurrently || '—'}</td>
                      <td className="px-3 py-3 text-gray-500">{fmtDate(r.statusDate)}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">
                          {openId === r.id ? 'Ẩn' : 'Chi tiết'}
                        </button>
                      </td>
                    </tr>
                    {openId === r.id && (
                      <tr className="bg-indigo-50/30 border-b border-gray-100">
                        <td colSpan={12} className="px-4 py-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-2">Hành trình ({r.courierHistory?.length || 0})</div>
                              <ol className="space-y-1 text-xs text-gray-600">
                                {(r.courierHistory || []).map((h, k) => (
                                  <li key={k} className="flex gap-2">
                                    <span className="text-gray-400">{fmtDate(h.at)}</span>
                                    <span className="font-medium">{h.status ?? ''} {h.statusName || ''}</span>
                                    {h.note && <span className="text-gray-400">— {h.note}</span>}
                                  </li>
                                ))}
                                {(!r.courierHistory || r.courierHistory.length === 0) && <li className="text-gray-400">—</li>}
                              </ol>
                              <div className="mt-3 text-xs text-gray-600 space-y-1">
                                <div>Tham chiếu: <span className="font-mono">{r.orderReference || '—'}</span></div>
                                <div>Tổng cước: {fmtMoney((r.moneyTotalFee || 0) + (r.moneyTotalVat || 0))} · Phí COD: {fmtMoney(r.moneyFeeCod)}</div>
                                <div>Giao dự kiến: {r.expectedDeliveryDate || '—'} · Hoàn: {r.isReturning ? 'Có' : 'Không'} · Lý do lỗi: {r.reasonCode || '—'}</div>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-2">Payload gốc</div>
                              <pre className="text-[11px] bg-white border border-gray-200 rounded-lg p-3 max-h-64 overflow-auto">{JSON.stringify(r.rawPayload, null, 1)}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

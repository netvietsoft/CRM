'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatVndTight } from '@/lib/format';
import Select from '@/components/ui/Select';
import SpinPrizeRowActions from '@/components/admin/SpinPrizeRowActions';

interface SpinVoucher {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  perCustomerLimit: number;
  durationDays: number | null;
  isStackable: boolean;
}

interface SpinPrize {
  id: string;
  name: string;
  type: string;
  color: string | null;
  probability: number;
  quantity: number | null;
  wonCount: number;
  isActive: boolean;
  voucher: SpinVoucher | null;
}

interface SpinPrizeActionsProps {
  mode?: 'add' | 'table';
  prizes?: SpinPrize[];
}

const TYPE_LABEL: Record<string, string> = {
  VOUCHER: 'Voucher',
  POINTS: 'Điểm',
  NOTHING: 'May mắn lần sau',
};

function typeLabel(type: string) {
  return TYPE_LABEL[type] || 'Vật phẩm';
}

function prizeValueLabel(prize: SpinPrize) {
  if (!prize.voucher) return typeLabel(prize.type);
  return prize.voucher.type === 'PERCENT'
    ? `${prize.voucher.value}%`
    : formatVndTight(prize.voucher.value);
}

export default function SpinPrizeActions({ mode = 'add', prizes }: SpinPrizeActionsProps) {
  if (mode === 'table') {
    return <SpinPrizeTable prizes={prizes || []} />;
  }
  return <SpinPrizeAddButton />;
}

/* ------------------------------------------------------------------ */
/* Prize table with inline probability controls + total = 100% check   */
/* ------------------------------------------------------------------ */
function SpinPrizeTable({ prizes }: { prizes: SpinPrize[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Local probability edits keyed by prize id (percent integers).
  const [probs, setProbs] = useState<Record<string, number>>(() =>
    Object.fromEntries(prizes.map((p) => [p.id, Math.round(p.probability * 100)])),
  );

  // Re-sync when server data changes (after router.refresh()).
  useEffect(() => {
    setProbs(Object.fromEntries(prizes.map((p) => [p.id, Math.round(p.probability * 100)])));
  }, [prizes]);

  const adjust = (id: string, delta: number) => {
    setProbs((prev) => ({ ...prev, [id]: Math.max(0, Math.min(100, (prev[id] ?? 0) + delta)) }));
  };

  const total = prizes.reduce((s, p) => s + (probs[p.id] ?? 0), 0);
  const isValid = total === 100;
  const dirty = prizes.some((p) => (probs[p.id] ?? 0) !== Math.round(p.probability * 100));

  const saveProbs = async () => {
    setSaving(true);
    try {
      const changed = prizes.filter((p) => (probs[p.id] ?? 0) !== Math.round(p.probability * 100));
      await Promise.all(
        changed.map((p) =>
          apiClientClient.put(`/spin/admin/prizes/${p.id}`, {
            name: p.name,
            color: p.color,
            probability: (probs[p.id] ?? 0) / 100,
            quantity: p.quantity,
            voucher: p.voucher
              ? {
                  code: p.voucher.code,
                  name: p.voucher.name,
                  description: p.voucher.description,
                  type: p.voucher.type,
                  value: p.voucher.value,
                  minOrderValue: p.voucher.minOrderValue,
                  maxDiscount: p.voucher.maxDiscount,
                  perCustomerLimit: p.voucher.perCustomerLimit,
                  durationDays: p.voucher.durationDays,
                  isStackable: p.voucher.isStackable,
                }
              : undefined,
          }),
        ),
      );
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi lưu tỉ lệ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#eceef2] rounded-[14px] overflow-hidden">
      <div className="px-5 py-[15px] border-b border-[#f0f1f5] text-[15px] font-bold text-[#111827]">
        Giải thưởng
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px] min-w-[480px]">
          <thead>
            <tr className="bg-[#f9fafb]">
              <th className="px-5 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Giải</th>
              <th className="px-3 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Loại</th>
              <th className="px-3 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] min-w-[130px]">Tỷ lệ trúng</th>
              <th className="px-3 py-[10px] text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Đã phát / Kho</th>
              <th className="px-5 py-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {prizes.map((p, idx) => {
              const prob = probs[p.id] ?? 0;
              return (
                <tr
                  key={p.id}
                  className={`border-t border-[#f3f4f6] hover:bg-[#eff6ff] ${idx % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white'}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-[10px] h-[10px] rounded-full shrink-0"
                        style={{ background: p.color || '#6366f1' }}
                      />
                      <span className="font-semibold whitespace-nowrap text-[#111827]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#4b5563] whitespace-nowrap">{prizeValueLabel(p)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-[7px] mb-1">
                      <button
                        type="button"
                        onClick={() => adjust(p.id, -1)}
                        className="w-[18px] h-[18px] border border-[#e5e7eb] rounded-[6px] inline-flex items-center justify-center text-[11px] font-extrabold cursor-pointer text-[#4b5563] bg-white transition-colors hover:bg-[#f3f4f6]"
                      >
                        −
                      </button>
                      <span className="text-[12px] font-bold min-w-[34px] text-center text-[#111827]">{prob}%</span>
                      <button
                        type="button"
                        onClick={() => adjust(p.id, 1)}
                        className="w-[18px] h-[18px] border border-[#e5e7eb] rounded-[6px] inline-flex items-center justify-center text-[11px] font-extrabold cursor-pointer text-[#4b5563] bg-white transition-colors hover:bg-[#f3f4f6]"
                      >
                        +
                      </button>
                    </div>
                    <div className="h-[5px] rounded-full bg-[#f3f4f6] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${prob}%`, background: p.color || '#6366f1' }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-[#4b5563] whitespace-nowrap">
                    {p.wonCount} / {p.quantity ?? '∞'}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <SpinPrizeRowActions prize={p} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-[10px] px-5 py-3 border-t border-[#f0f1f5] flex-wrap">
        <span className={`text-[12.5px] font-bold ${isValid ? 'text-[#059669]' : 'text-[#c2410c]'}`}>
          Tổng tỷ lệ: {total}%{!isValid && ' ⚠ Nên = 100%'}
        </span>
        <button
          type="button"
          onClick={saveProbs}
          disabled={saving || !dirty}
          className="px-4 py-2 bg-[#2563eb] border-none text-white rounded-[9px] font-bold text-[12.5px] cursor-pointer transition-colors hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Đang lưu...' : 'Lưu tỉ lệ'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add prize button + modal (wiring unchanged)                          */
/* ------------------------------------------------------------------ */
function SpinPrizeAddButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    type: 'VOUCHER',
    color: '#6366f1',
    probability: '10',
    quantity: '',
    // Voucher config
    voucherCode: '',
    voucherName: '',
    voucherDescription: '',
    campaignCategory: 'GAMIFICATION',
    voucherType: 'PERCENT',
    value: '',
    minOrderValue: '0',
    maxDiscount: '',
    perCustomerLimit: '1',
    durationDays: '30',
    isStackable: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post('/spin/admin/prizes', {
        name: form.name,
        type: form.type,
        color: form.color,
        probability: parseFloat(form.probability) / 100,
        quantity: form.quantity ? parseInt(form.quantity) : null,
        // Voucher data
        voucher: {
          code: form.voucherCode,
          name: form.voucherName,
          description: form.voucherDescription,
          campaignCategory: form.campaignCategory,
          type: form.voucherType,
          value: parseFloat(form.value),
          minOrderValue: parseFloat(form.minOrderValue) || 0,
          maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
          perCustomerLimit: parseInt(form.perCustomerLimit) || 1,
          durationDays: form.durationDays ? parseInt(form.durationDays) : null,
          isStackable: form.isStackable,
        },
      });

      setShowModal(false);
      setForm({
        name: '',
        type: 'VOUCHER',
        color: '#6366f1',
        probability: '10',
        quantity: '',
        voucherCode: '',
        voucherName: '',
        voucherDescription: '',
        campaignCategory: 'GAMIFICATION',
        voucherType: 'PERCENT',
        value: '',
        minOrderValue: '0',
        maxDiscount: '',
        perCustomerLimit: '1',
        durationDays: '30',
        isStackable: false,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo giải thưởng');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      // Auto-generate voucher code from name
      if (field === 'name' && typeof value === 'string') {
        newForm.voucherCode = 'SPIN_' + value
          .toUpperCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/Đ/g, 'D')
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        newForm.voucherName = value;
      }
      return newForm;
    });
  };

  const colorOptions = [
    { value: '#ef4444', label: '🔴 Đỏ' },
    { value: '#f97316', label: '🟠 Cam' },
    { value: '#eab308', label: '🟡 Vàng' },
    { value: '#22c55e', label: '🟢 Xanh lá' },
    { value: '#06b6d4', label: '🔵 Xanh dương' },
    { value: '#6366f1', label: '🟣 Tím' },
    { value: '#ec4899', label: '🩷 Hồng' },
  ];

  return (
    <>
      <button
        type="button"
        className="px-4 py-[9px] bg-[#2563eb] border-none text-white rounded-[10px] font-semibold text-[13px] cursor-pointer transition-colors hover:bg-[#1d4ed8]"
        onClick={() => setShowModal(true)}
      >
        + Thêm giải thưởng
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-[rgba(15,23,42,0.5)] flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#eceef2]">
              <h2 className="text-xl font-bold text-[#111827]">Thêm giải thưởng Voucher</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Prize Config Section */}
                <div className="border-b border-[#eceef2] pb-4">
                  <h3 className="text-sm font-bold text-[#4b5563] mb-3">Cấu hình vòng quay</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="prize-name">
                        Tên giải thưởng *
                      </label>
                      <input
                        id="prize-name"
                        className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                        required
                        value={form.name}
                        onChange={e => update('name', e.target.value)}
                        placeholder="VD: Giảm 10%"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="prize-color">
                          Màu sắc
                        </label>
                        <Select
                          value={form.color}
                          onChange={(val) => update('color', val)}
                          className="w-full"
                          options={colorOptions}
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="prize-prob">
                          Tỷ lệ (%) *
                        </label>
                        <input
                          id="prize-prob"
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          required
                          value={form.probability}
                          onChange={e => update('probability', e.target.value)}
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="prize-qty">
                          Kho
                        </label>
                        <input
                          id="prize-qty"
                          type="number"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          value={form.quantity}
                          onChange={e => update('quantity', e.target.value)}
                          placeholder="Không giới hạn"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voucher Config Section */}
                <div>
                  <h3 className="text-sm font-bold text-[#4b5563] mb-3">Cấu hình voucher</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-code">
                          Mã voucher *
                        </label>
                        <input
                          id="v-code"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb] font-mono"
                          required
                          value={form.voucherCode}
                          onChange={e => update('voucherCode', e.target.value.toUpperCase())}
                          placeholder="SPIN_GIAM10"
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-name">
                          Tên voucher *
                        </label>
                        <input
                          id="v-name"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          required
                          value={form.voucherName}
                          onChange={e => update('voucherName', e.target.value)}
                          placeholder="Giảm 10%"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-type">
                        Loại giảm giá
                      </label>
                      <Select
                        value={form.voucherType}
                        onChange={(val) => update('voucherType', val)}
                        className="w-full"
                        options={[
                          { value: 'PERCENT', label: 'Giảm %' },
                          { value: 'FIXED_AMOUNT', label: 'Giảm tiền mặt' },
                          { value: 'FREESHIP', label: 'Free ship' }
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-value">
                          Giá trị {form.voucherType === 'PERCENT' ? '(%)' : '(VNĐ)'} *
                        </label>
                        <input
                          id="v-value"
                          type="number"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          required
                          value={form.value}
                          onChange={e => update('value', e.target.value)}
                          placeholder={form.voucherType === 'PERCENT' ? '10' : '50000'}
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-min">
                          Đơn tối thiểu (VNĐ)
                        </label>
                        <input
                          id="v-min"
                          type="number"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          value={form.minOrderValue}
                          onChange={e => update('minOrderValue', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-max">
                          Giảm tối đa (VNĐ)
                        </label>
                        <input
                          id="v-max"
                          type="number"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          value={form.maxDiscount}
                          onChange={e => update('maxDiscount', e.target.value)}
                          placeholder="Không giới hạn"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-per-cust">
                          Mỗi KH dùng
                        </label>
                        <input
                          id="v-per-cust"
                          type="number"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          value={form.perCustomerLimit}
                          onChange={e => update('perCustomerLimit', e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-duration">
                          Hạn dùng (ngày)
                        </label>
                        <input
                          id="v-duration"
                          type="number"
                          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb]"
                          value={form.durationDays}
                          onChange={e => update('durationDays', e.target.value)}
                          placeholder="30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12.5px] font-medium text-[#4b5563] mb-1.5" htmlFor="v-desc">
                        Mô tả
                      </label>
                      <textarea
                        id="v-desc"
                        className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb] resize-y"
                        rows={2}
                        value={form.voucherDescription}
                        onChange={e => update('voucherDescription', e.target.value)}
                        placeholder="Mô tả chi tiết voucher..."
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-[13px]">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-[#2563eb] border-[#e5e7eb] rounded focus:ring-[#2563eb]"
                        checked={form.isStackable}
                        onChange={e => update('isStackable', e.target.checked)}
                      />
                      <span className="text-[#4b5563]">Cho phép cộng dồn với voucher khác</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-[#eceef2]">
                <button
                  type="button"
                  className="px-4 py-2.5 border border-[#e5e7eb] text-[#374151] rounded-[10px] font-semibold text-[13px] cursor-pointer transition-colors hover:bg-[#f9fafb]"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#2563eb] text-white rounded-[10px] font-semibold text-[13px] cursor-pointer transition-colors hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Đang tạo...' : 'Tạo giải thưởng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

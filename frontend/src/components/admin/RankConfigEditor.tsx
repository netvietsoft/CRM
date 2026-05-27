'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { toast } from 'react-toastify';

interface RankConfigEditorProps {
  rank: string;
  minTotalSpent: number;
  minOrdersMonth?: number | null;
  discountPercent?: number | null;
  description?: string | null;
}

interface UpdateRankConfigResponse {
  success: boolean;
  config: RankConfigEditorProps;
}

const rankPanelClassMap: Record<string, string> = {
  MEMBER: 'border-slate-300 bg-slate-50 shadow-slate-200/70',
  SILVER: 'border-slate-400 bg-slate-100 shadow-slate-300/70',
  GOLD: 'border-amber-300 bg-amber-50 shadow-amber-200/70',
  DIAMOND: 'border-cyan-300 bg-cyan-50 shadow-cyan-200/70',
  PLATINUM: 'border-fuchsia-300 bg-fuchsia-50 shadow-fuchsia-200/70',
};

const rankBadgeClassMap: Record<string, string> = {
  MEMBER: 'bg-slate-100 text-slate-800 border border-slate-300 ring-1 ring-slate-200 shadow-sm',
  SILVER: 'bg-slate-200 text-slate-900 border border-slate-400 ring-1 ring-slate-300 shadow-sm',
  GOLD: 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-200 shadow-sm',
  DIAMOND: 'bg-cyan-100 text-cyan-900 border border-cyan-300 ring-1 ring-cyan-200 shadow-sm',
  PLATINUM: 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300 ring-1 ring-fuchsia-200 shadow-sm',
};

export default function RankConfigEditor({
  rank,
  minTotalSpent,
  minOrdersMonth,
  discountPercent,
  description,
}: RankConfigEditorProps) {
  const router = useRouter();
  const buildFormState = () => ({
    minTotalSpent: minTotalSpent.toString(),
    minOrdersMonth: minOrdersMonth?.toString() || '',
    discountPercent: discountPercent?.toString() || '',
    description: description || '',
  });
  const [form, setForm] = useState(buildFormState);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiClientClient.put<UpdateRankConfigResponse>('/rank-config', {
        rank,
        minTotalSpent: Number(form.minTotalSpent || 0),
        minOrdersMonth: form.minOrdersMonth ? Number(form.minOrdersMonth) : null,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
        description: form.description.trim() || null,
      });
      const updatedConfig = response.config;

      setForm({
        minTotalSpent: updatedConfig.minTotalSpent.toString(),
        minOrdersMonth: updatedConfig.minOrdersMonth?.toString() || '',
        discountPercent: updatedConfig.discountPercent?.toString() || '',
        description: updatedConfig.description || '',
      });

      toast.success(`Đã lưu cấu hình hạng ${rank}`);

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật cấu hình rank');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${rankPanelClassMap[rank] || 'border-gray-200 bg-white shadow-gray-200/70'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ${rankBadgeClassMap[rank] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>{rank}</div>
          <div className={`text-sm ${rank === 'SILVER' ? 'text-slate-700' : 'text-gray-600'}`}>Điều kiện tối thiểu để đạt hạng này</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Chi tiêu tối thiểu</div>
          <input
            type="number"
            min="0"
            value={form.minTotalSpent}
            onChange={(e) => setForm((prev) => ({ ...prev, minTotalSpent: e.target.value }))}
            placeholder="Ví dụ: 2000000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Số đơn/tháng</div>
          <input
            type="number"
            min="0"
            value={form.minOrdersMonth}
            onChange={(e) => setForm((prev) => ({ ...prev, minOrdersMonth: e.target.value }))}
            placeholder="Để trống nếu không dùng"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Chiết khấu gợi ý (%)</div>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.discountPercent}
            onChange={(e) => setForm((prev) => ({ ...prev, discountPercent: e.target.value }))}
            placeholder="Ví dụ: 5"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>

        <label className="block md:col-span-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Mô tả</div>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Mô tả ngắn về điều kiện hoặc quyền lợi của hạng này"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </div>
    </div>
  );
}

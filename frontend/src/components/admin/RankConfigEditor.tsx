'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface RankConfigEditorProps {
  rank: string;
  minTotalSpent: number;
  minOrdersMonth?: number | null;
  discountPercent?: number | null;
  description?: string | null;
}

export default function RankConfigEditor({
  rank,
  minTotalSpent,
  minOrdersMonth,
  discountPercent,
  description,
}: RankConfigEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    minTotalSpent: minTotalSpent.toString(),
    minOrdersMonth: minOrdersMonth?.toString() || '',
    discountPercent: discountPercent?.toString() || '',
    description: description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClientClient.put('/rank-config', {
        rank,
        minTotalSpent: Number(form.minTotalSpent || 0),
        minOrdersMonth: form.minOrdersMonth ? Number(form.minOrdersMonth) : null,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
        description: form.description.trim() || null,
      });
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể cập nhật cấu hình rank');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-gray-900">{rank}</div>
          <div className="text-sm text-gray-500">Điều kiện tối thiểu để đạt hạng này</div>
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

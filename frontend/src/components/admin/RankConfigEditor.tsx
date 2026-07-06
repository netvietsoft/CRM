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

const rankPillStyleMap: Record<string, { background: string; color: string }> = {
  PLATINUM: { background: '#fae8ff', color: '#701a75' },
  DIAMOND: { background: '#cffafe', color: '#164e63' },
  GOLD: { background: '#fef3c7', color: '#78350f' },
  SILVER: { background: '#e2e8f0', color: '#0f172a' },
};

const defaultRankPillStyle = { background: '#f1f5f9', color: '#334155' };

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

  const pillStyle = rankPillStyleMap[rank] || defaultRankPillStyle;
  const thresholdLabel = `Chi tiêu tối thiểu: ${Number(form.minTotalSpent || 0).toLocaleString('vi-VN')}₫`;

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#eceef2] bg-white p-5">
      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-[14px] py-[5px] text-[12px] font-extrabold uppercase tracking-[0.03em]"
          style={{ background: pillStyle.background, color: pillStyle.color }}
        >
          {rank}
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[10px] bg-[#2563eb] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>

      <div className="text-[13.5px] font-bold text-[#111827]">{thresholdLabel}</div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Chi tiêu tối thiểu</div>
          <input
            type="number"
            min="0"
            value={form.minTotalSpent}
            onChange={(e) => setForm((prev) => ({ ...prev, minTotalSpent: e.target.value }))}
            placeholder="Ví dụ: 2000000"
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Số đơn/tháng</div>
          <input
            type="number"
            min="0"
            value={form.minOrdersMonth}
            onChange={(e) => setForm((prev) => ({ ...prev, minOrdersMonth: e.target.value }))}
            placeholder="Để trống nếu không dùng"
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Chiết khấu gợi ý (%)</div>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.discountPercent}
            onChange={(e) => setForm((prev) => ({ ...prev, discountPercent: e.target.value }))}
            placeholder="Ví dụ: 5"
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </label>

        <label className="block md:col-span-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Mô tả / Quyền lợi</div>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Mô tả ngắn về điều kiện hoặc quyền lợi của hạng này"
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] leading-[1.55] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </label>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';

interface CommissionRateEditProps {
  level: number;
  initialPercentage: number;
  label: string;
  description: string;
}

export default function CommissionRateEdit({
  level,
  initialPercentage,
  label,
  description
}: CommissionRateEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [percentage, setPercentage] = useState(initialPercentage.toString());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClientClient.put('/commissions/admin/configs', {
        level,
        percentage: parseFloat(percentage),
      });

      setIsEditing(false);
      router.refresh();
    } catch {
      alert('Lỗi cập nhật tỷ lệ hoa hồng');
      setPercentage(initialPercentage.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPercentage(initialPercentage.toString());
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="relative rounded-[12px] border border-[#eceef2] p-[14px] text-center">
      {/* Edit button */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute right-2 top-2 rounded p-1.5 text-[#9ca3af] transition-colors hover:bg-[#eff6ff] hover:text-[#2563eb]"
          title="Chỉnh sửa"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Action buttons when editing */}
      {isEditing && (
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded p-1.5 text-[#047857] transition-colors hover:bg-[#d1fae5] disabled:opacity-50"
            title="Lưu"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded p-1.5 text-[#dc2626] transition-colors hover:bg-[#fee2e2] disabled:opacity-50"
            title="Hủy"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mb-1 text-[11.5px] font-semibold text-[#6b7280]">
        {label}
      </div>

      {isEditing ? (
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-[70px] rounded-lg border-2 border-[#2563eb] px-2 py-1 text-center text-[24px] font-extrabold text-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            autoFocus
            disabled={loading}
          />
          <span className="text-[24px] font-extrabold text-[#2563eb]">%</span>
        </div>
      ) : (
        <div className="text-[24px] font-extrabold text-[#2563eb]">
          {initialPercentage}%
        </div>
      )}

      <div className="mt-[2px] text-[11px] text-[#9ca3af]">
        {description}
      </div>
    </div>
  );
}

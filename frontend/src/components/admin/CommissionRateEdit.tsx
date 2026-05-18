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
    } catch (error) {
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
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 relative">
      {/* Edit button */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Chỉnh sửa"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      {/* Action buttons when editing */}
      {isEditing && (
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
            title="Lưu"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Hủy"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="font-bold text-blue-600 mb-2">
        {label}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-24 px-3 py-2 text-3xl font-extrabold text-gray-800 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            disabled={loading}
          />
          <span className="text-3xl font-extrabold text-gray-800">%</span>
        </div>
      ) : (
        <div className="text-4xl font-extrabold text-gray-800">
          {initialPercentage}%
        </div>
      )}

      <div className="text-xs text-gray-600 mt-1">
        {description}
      </div>
    </div>
  );
}

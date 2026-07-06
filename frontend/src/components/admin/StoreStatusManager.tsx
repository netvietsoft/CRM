'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface Props {
  storeId: string;
  storeName: string;
  isActive: boolean;
  isBanned: boolean;
  bannedReason: string | null;
}

interface StoreStatusUpdate {
  isActive?: boolean;
  isBanned?: boolean;
  bannedReason?: string | null;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function StoreStatusManager({ storeId, storeName, isActive, isBanned, bannedReason }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [reason, setReason] = useState(bannedReason || '');

  const updateStore = async (data: StoreStatusUpdate) => {
    setLoading(true);
    try {
      await apiClientClient.patch(`/stores/admin/${storeId}/status`, data);
      router.refresh();
      setShowBanModal(false);
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error, 'Lỗi cập nhật'));
    } finally {
      setLoading(false);
    }
  };

  const handleBan = () => {
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do cấm cửa hàng');
      return;
    }
    updateStore({ isBanned: true, bannedReason: reason });
  };

  // Current status display
  let statusColor = 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]';
  let statusIcon = '⏳';
  let statusLabel = 'Chờ duyệt';

  if (isBanned) {
    statusColor = 'bg-[#fee2e2] text-[#dc2626] border-[#fca5a5]';
    statusIcon = '🚫';
    statusLabel = 'Đã bị cấm';
  } else if (isActive) {
    statusColor = 'bg-[#d1fae5] text-[#047857] border-[#6ee7b7]';
    statusLabel = 'Đang hoạt động';
  }

  return (
    <div className="bg-white rounded-[14px] border border-[#eceef2] p-6">
      <h2 className="text-lg font-extrabold text-gray-900 mb-4">Quản lý trạng thái</h2>
      <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-[10px] py-[3px] text-[11px] font-semibold ${statusColor}`}>
        <span>{statusIcon}</span>
        <span>{statusLabel}</span>
      </div>
      {/* Action Dropdown */}
      <div className="relative group">
        <Select
          disabled={loading}
          value={isBanned ? 'BANNED' : isActive ? 'ACTIVE' : 'PENDING'}
          onChange={(val) => {
            if (val === 'ACTIVE') updateStore({ isActive: true, isBanned: false });
            else if (val === 'PENDING') updateStore({ isActive: false, isBanned: false });
            else if (val === 'BANNED') setShowBanModal(true);
          }}
          options={[
            { value: 'ACTIVE', label: 'Đang hoạt động' },
            { value: 'PENDING', label: 'Tạm ngưng hoạt động' },
            { value: 'BANNED', label: 'Bị khoá' }
          ]}
          className="w-full"
        />
      </div>

      {isBanned && bannedReason && (
        <div className="mt-4 p-3 bg-[#fee2e2] rounded-[10px] border border-[#fca5a5]">
          <p className="text-[11px] font-bold text-[#dc2626] uppercase tracking-wider mb-1">Lý do cấm:</p>
          <p className="text-[13px] text-[#dc2626] leading-relaxed italic">&quot;{bannedReason}&quot;</p>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#eceef2] bg-[#fee2e2]">
              <h3 className="font-extrabold text-[#dc2626] text-lg">Cấm cửa hàng</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-[10px] p-3">
                <p className="text-[13px] text-[#dc2626]">
                  Bạn đang cấm cửa hàng <strong>{storeName}</strong>. Cửa hàng sẽ bị vô hiệu hóa hoàn toàn khỏi hệ thống, bao gồm tất cả sản phẩm và đơn hàng mới.
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">Lý do cấm *</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full border border-[#e5e7eb] rounded-[10px] px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#dc2626] resize-none text-[13px]"
                  placeholder="VD: Vi phạm chính sách bán hàng, hàng giả, hàng cấm..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBanModal(false)}
                  className="flex-1 px-4 py-2.5 text-[#374151] bg-[#f3f4f6] hover:bg-[#e5e7eb] rounded-[10px] font-semibold text-[13px] transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBan}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-[10px] font-bold text-[13px] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận Cấm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

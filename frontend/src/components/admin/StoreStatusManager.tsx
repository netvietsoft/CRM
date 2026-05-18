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

export default function StoreStatusManager({ storeId, storeName, isActive, isBanned, bannedReason }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [reason, setReason] = useState(bannedReason || '');

  const updateStore = async (data: Record<string, any>) => {
    setLoading(true);
    try {
      await apiClientClient.patch(`/stores/admin/${storeId}/status`, data);
      router.refresh();
      setShowBanModal(false);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Lỗi cập nhật');
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
  let statusColor = 'bg-gray-100 text-gray-700 border-gray-200';
  let statusIcon = '⏳';
  let statusLabel = 'Chờ duyệt';

  if (isBanned) {
    statusColor = 'bg-red-50 text-red-700 border-red-200';
    statusIcon = '🚫';
    statusLabel = 'Đã bị cấm';
  } else if (isActive) {
    statusLabel = 'Đang hoạt động';
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Quản lý trạng thái</h2>
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
        <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Lý do cấm:</p>
          <p className="text-sm text-red-700 leading-relaxed italic">"{bannedReason}"</p>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-red-50">
              <h3 className="font-bold text-red-800 text-lg">Cấm cửa hàng</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  Bạn đang cấm cửa hàng <strong>{storeName}</strong>. Cửa hàng sẽ bị vô hiệu hóa hoàn toàn khỏi hệ thống, bao gồm tất cả sản phẩm và đơn hàng mới.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lý do cấm *</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
                  placeholder="VD: Vi phạm chính sách bán hàng, hàng giả, hàng cấm..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBanModal(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBan}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
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

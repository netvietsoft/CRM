'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface Props {
  storeId: string;
  storeName: string;
}

export default function StoreApprovalButton({ storeId, storeName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!confirm(`Bạn có chắc muốn phê duyệt cửa hàng "${storeName}"?`)) return;
    setLoading(true);
    try {
      await apiClientClient.post<any>(`/stores/admin/${storeId}/approve`, {});
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm(`Bạn có chắc muốn TỪ CHỐI và xóa đăng ký của "${storeName}"? Người dùng sẽ quay về vai trò Khách hàng.`)) return;
    setLoading(true);
    try {
      await apiClientClient.delete<any>(`/stores/admin/${storeId}`);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
      >
        ✓ Phê duyệt
      </button>
      <button
        onClick={handleReject}
        disabled={loading}
        className="flex-1 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50 transition-colors text-sm"
      >
        ✕ Từ chối
      </button>
    </div>
  );
}

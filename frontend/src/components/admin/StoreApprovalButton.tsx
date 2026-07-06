'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface Props {
  storeId: string;
  storeName: string;
}

interface StoreAdminActionResponse {
  success?: boolean;
  message?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function StoreApprovalButton({ storeId, storeName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!confirm(`Bạn có chắc muốn phê duyệt cửa hàng "${storeName}"?`)) return;
    setLoading(true);
    try {
      await apiClientClient.post<StoreAdminActionResponse, Record<string, never>>(
        `/stores/admin/${storeId}/approve`,
        {},
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error, 'Có lỗi xảy ra'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm(`Bạn có chắc muốn TỪ CHỐI và xóa đăng ký của "${storeName}"? Người dùng sẽ quay về vai trò Khách hàng.`)) return;
    setLoading(true);
    try {
      await apiClientClient.delete<StoreAdminActionResponse>(`/stores/admin/${storeId}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error, 'Có lỗi xảy ra'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="flex-1 px-3 py-2 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] rounded-lg font-semibold hover:bg-[#dbeafe] disabled:opacity-50 transition-colors text-[12.5px]"
      >
        ✓ Duyệt
      </button>
      <button
        onClick={handleReject}
        disabled={loading}
        className="flex-1 px-3 py-2 bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5] rounded-lg font-semibold hover:bg-[#fecaca] disabled:opacity-50 transition-colors text-[12.5px]"
      >
        ✕ Từ chối
      </button>
    </div>
  );
}

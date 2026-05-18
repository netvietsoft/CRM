'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface Props {
  storeId: string;
  storeName: string;
}

export default function DeleteStoreButton({ storeId, storeName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`BẠN CÓ CHẮC CHẮN MUỐN XOÁ VĨNH VIỄN CỬA HÀNG "${storeName}"?\n\nHành động này không thể hoàn tác, tất cả sản phẩm và dữ liệu liên quan sẽ bị xoá.`)) {
      return;
    }

    setLoading(true);
    try {
      await apiClientClient.delete(`/stores/admin/${storeId}`);
      router.push('/admin/stores');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Lỗi khi xoá cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-red-50">
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">Xoá vĩnh viễn cửa hàng này và toàn bộ dữ liệu. Thao tác này không thể phục hồi.</p>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="w-full py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-red-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
        {loading ? 'Đang xoá...' : 'Xoá vĩnh viễn'}
      </button>
    </div>
  );
}

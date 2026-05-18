'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';

interface Product {
  id: string;
  name: string;
}

interface ProductRowActionsProps {
  product: Product;
}

export default function ProductRowActions({ product }: ProductRowActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      await apiClientClient.delete<any>(`/products/${product.id}`);
      setShowDeleteModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi xóa sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/products/${product.id}`}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Sửa
        </Link>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Xóa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                Xóa sản phẩm?
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Bạn có chắc chắn muốn xóa sản phẩm <strong>{product.name}</strong>? 
                Hành động này không thể hoàn tác.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button 
                  type="button"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

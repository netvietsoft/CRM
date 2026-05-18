'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Trash2, X } from 'lucide-react';

interface CustomerActionsProps {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  isActive: boolean;
}

export default function CustomerActions({
  customerId,
  customerName,
  customerPhone,
  isActive,
}: CustomerActionsProps) {
  const router = useRouter();
  const [showSoftDeleteModal, setShowSoftDeleteModal] = useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isConfirmValid = confirmInput === customerName || confirmInput === customerPhone;

  const handleSoftDelete = async () => {
    if (!isConfirmValid) return;
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/customers/${customerId}/soft`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (res.ok) {
        setShowSoftDeleteModal(false);
        setToast({ message: `Đã ban khách hàng "${customerName}" thành công!`, type: 'success' });
        setTimeout(() => {
          router.push('/admin/customers');
          router.refresh();
        }, 800);
      } else {
        alert(data.error || data.message || 'Có lỗi xảy ra');
      }
    } catch {
      alert('Không thể kết nối tới máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleHardDelete = async () => {
    if (!isConfirmValid) return;
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/customers/${customerId}/hard`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (res.ok) {
        setShowHardDeleteModal(false);
        setToast({ message: `Đã xóa vĩnh viễn khách hàng "${customerName}" thành công!`, type: 'success' });
        setTimeout(() => {
          router.push('/admin/customers');
          router.refresh();
        }, 1200);
      } else {
        alert(data.error || data.message || 'Có lỗi xảy ra');
      }
    } catch {
      alert('Không thể kết nối tới máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm';

  return (
    <>
      <div className="flex items-center flex-wrap gap-3">
        {isActive ? (
          <button
            onClick={() => {
              setConfirmInput('');
              setShowSoftDeleteModal(true);
            }}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <Ban className="w-4 h-4" />
            Ban
          </button>
        ) : (
          <span className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg flex items-center gap-2 cursor-not-allowed">
            <Ban className="w-4 h-4" />
            Đã bị ban
          </span>
        )}
        <button
          onClick={() => {
            setConfirmInput('');
            setShowHardDeleteModal(true);
          }}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Xóa vĩnh viễn
        </button>
      </div>

      {/* Soft Delete Modal */}
      {showSoftDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Ban className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Ban khách hàng</h2>
              </div>
              <button
                onClick={() => setShowSoftDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Bạn có chắc chắn muốn ban khách hàng này?
              </p>
              <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
                ⚠️ Khách hàng sẽ không thể đăng nhập lại nhưng dữ liệu vẫn được lưu trữ.
              </p>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600">
                  Nhập <span className="font-bold text-gray-900">"{customerName}"</span>{' '}
                  {customerPhone && (
                    <>
                      hoặc <span className="font-bold text-gray-900">"{customerPhone}"</span>
                    </>
                  )}{' '}
                  để xác nhận:
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Nhập tên hoặc số điện thoại..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowSoftDeleteModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                onClick={handleSoftDelete}
                disabled={loading || !isConfirmValid}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${isConfirmValid
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Xác nhận ban
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Modal */}
      {showHardDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Xóa vĩnh viễn</h2>
              </div>
              <button
                onClick={() => setShowHardDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Bạn có chắc chắn muốn xóa vĩnh viễn khách hàng này?
              </p>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                ⚠️ Hành động này KHÔNG THỂ HOÀN TÁC. Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
              </p>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600">
                  Nhập <span className="font-bold text-gray-900">"{customerName}"</span>{' '}
                  {customerPhone && (
                    <>
                      hoặc <span className="font-bold text-gray-900">"{customerPhone}"</span>
                    </>
                  )}{' '}
                  để xác nhận:
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Nhập tên hoặc số điện thoại..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowHardDeleteModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                onClick={handleHardDelete}
                disabled={loading || !isConfirmValid}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${isConfirmValid
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-slideIn">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
            }`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { getApiErrorMessage } from '@/lib/apiError';

export default function StoreActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    ownerId: '', // Ideally, we'd have a dropdown of users with role MODERATOR or CUSTOMER to upgrade.
  });
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClientClient.post('/stores/admin', formData);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(getApiErrorMessage(error, 'Lỗi tạo cửa hàng'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-[9px] bg-[#2563eb] text-white font-semibold text-[13px] rounded-[10px] hover:bg-[#1d4ed8] transition-colors"
      >
        + Thêm cửa hàng
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#eceef2]">
              <h3 className="text-lg font-extrabold text-gray-900">Thêm cửa hàng mới</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#9ca3af] hover:text-[#4b5563] focus:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    Tên cửa hàng *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none"
                    placeholder="VD: Gian hàng của Thành"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none"
                    placeholder="VD: gian-hang-cua-thanh"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    ID User Chủ sở hữu (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none"
                    placeholder="Để trống sẽ tự động lấy tài khoản của bạn"
                  />
                  <p className="text-[11.5px] text-[#6b7280] mt-1">Hệ thống sẽ tự động cấp quyền MODERATOR cho user này (nếu chưa phải ADMIN).</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-[9px] border border-[#e5e7eb] text-[#374151] font-semibold text-[13px] rounded-[10px] hover:bg-[#f9fafb]"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-[9px] bg-[#2563eb] text-white font-semibold text-[13px] rounded-[10px] hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  {loading ? 'Đang tạo...' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

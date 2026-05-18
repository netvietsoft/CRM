import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import SellerRegisterClient from './SellerRegisterClient';

export const dynamic = 'force-dynamic';

export default async function SellerRegisterPage() {
  const session = await getSession();
  if (!session) redirect('/login?callbackUrl=/portal/seller-register');

  // Check if user already has a store using the portal-layout-meta endpoint
  let meta: any = { hasStore: false, store: null };
  try {
    meta = await apiClient.get<any>('/users/portal-layout-meta');
  } catch (error) {
    console.error('Error fetching portal layout meta for seller register:', error);
  }

  const existingStore = meta.store;

  if (existingStore) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Bạn đã có cửa hàng</h2>
          <p className="text-gray-600 mb-2">
            <span className="font-semibold text-indigo-600">{existingStore.name}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {existingStore.isActive
              ? 'Cửa hàng đã được kích hoạt. Truy cập trang quản trị để quản lý.'
              : 'Cửa hàng đang chờ Admin phê duyệt. Vui lòng chờ thông báo.'}
          </p>
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
            existingStore.isActive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {existingStore.isActive ? '✓ Đã kích hoạt' : '⏳ Đang chờ duyệt'}
          </span>
        </div>
      </div>
    );
  }

  return <SellerRegisterClient />;
}

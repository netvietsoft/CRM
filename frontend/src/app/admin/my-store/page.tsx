import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import StoreProfileForm from '@/components/admin/StoreProfileForm';

export const dynamic = 'force-dynamic';

export default async function MyStorePage() {
  const session = await getSession();
  if (!session || !['ADMIN', 'MODERATOR'].includes(session.role)) {
    redirect('/admin');
  }

  let store = null;
  try {
    store = await apiClient.get<any>('/stores/my-store');
  } catch (error) {
    console.error('Error fetching my store:', error);
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy cửa hàng</h2>
        <p className="text-gray-500 mb-6">Tài khoản của bạn chưa được liên kết với cửa hàng nào hoặc có lỗi xảy ra.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Thông tin Cửa hàng</h1>
        <p className="text-gray-500">Quản lý các thông tin hiển thị và cấu hình của cửa hàng bạn.</p>
      </div>

      <StoreProfileForm initialData={store} />
    </div>
  );
}

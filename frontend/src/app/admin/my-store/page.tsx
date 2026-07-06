import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import StoreProfileForm, {
  type StoreProfileData,
} from '@/components/admin/StoreProfileForm';

export const dynamic = 'force-dynamic';

export default async function MyStorePage() {
  const session = await getSession();
  if (!session || !['ADMIN', 'MODERATOR'].includes(session.role)) {
    redirect('/admin');
  }

  let store: StoreProfileData | null = null;
  try {
    store = await apiClient.get<StoreProfileData>('/stores/my-store');
  } catch (error) {
    console.error('Error fetching my store:', error);
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[14px] border border-[#eceef2]">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy cửa hàng</h2>
        <p className="text-[#6b7280] mb-6">Tài khoản của bạn chưa được liên kết với cửa hàng nào hoặc có lỗi xảy ra.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-[18px]">
        <h1 className="text-[24px] font-extrabold text-gray-900 tracking-[-0.4px] m-0">Cửa hàng của tôi</h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">Thông tin hiển thị với khách hàng trên website và hóa đơn.</p>
      </div>

      <StoreProfileForm initialData={store} />
    </div>
  );
}

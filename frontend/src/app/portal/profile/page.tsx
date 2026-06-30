import Image from '@/components/ui/AppImage';
import { getSession } from '@/lib/auth';
import ProfileForm from './ProfileForm';
import { apiClient } from '@/lib/apiClient';
import { passthroughImageLoader } from '@/lib/imageLoader';
import { membershipBadgeClassMap, MembershipProgress } from '@/lib/membership';
import { formatVndSymbol, formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dob: string | Date | null;
  address?: string | null;
  addressStreet: string | null;
  addressWard: string | null;
  addressDistrict?: string | null;
  addressProvince: string | null;
  avatarUrl: string | null;
  createdAt: string | Date;
  interests?: string[] | null;
  onboardingComplete?: boolean;
  role?: string;
  referralCode: string;
}

interface DashboardUser {
  totalSpent: number;
  rank: string;
  commissionBalance: number;
  points: number;
  referralCode: string;
  dob: string | Date | null;
}

interface DashboardData {
  user: DashboardUser;
  voucherCount: number;
  orderCount: number;
  refereeCount: number;
  recentOrders: Array<{
    id: string;
    orderCode: string;
    totalAmount: number;
    status: string;
    createdAt: string | Date;
  }>;
  rankProgress: MembershipProgress;
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) return null;

  let profileData: UserProfile;
  let dashboardData: DashboardData;

  try {
    const [profile, dashboard] = await Promise.all([
      apiClient.get<UserProfile>('/users/profile', { cache: 'no-store' }),
      apiClient.get<DashboardData>('/users/dashboard', { cache: 'no-store' }),
    ]);
    profileData = profile;
    dashboardData = dashboard;
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-red-600">Đã xảy ra lỗi</h2>
        <p className="text-gray-600 mt-2">Không thể tải thông tin hồ sơ. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  const { user, refereeCount } = dashboardData;
  const detailedUser = profileData;

  return (
    <>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Hồ sơ cá nhân</h1>
          <p className="text-gray-600 text-sm">Quản lý thông tin tài khoản của bạn</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {detailedUser.avatarUrl ? (
              <Image
                loader={passthroughImageLoader}
                unoptimized
                src={detailedUser.avatarUrl}
                alt={detailedUser.name || 'Avatar người dùng'}
                width={96}
                height={96}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              (detailedUser.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{detailedUser.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3.5 py-1 rounded-full text-sm font-semibold shadow-sm border ${membershipBadgeClassMap[user.rank as keyof typeof membershipBadgeClassMap] || membershipBadgeClassMap.MEMBER}`}>
                {user.rank}
              </span>
              <span className="text-sm text-gray-600">
                Thành viên từ {detailedUser.createdAt ? new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(detailedUser.createdAt)) : 'Gần đây'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng chi tiêu</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatVndSymbol(user.totalSpent)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Điểm tích lũy</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatNumber(user.points)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Hoa hồng</div>
          <div className="text-2xl font-bold text-green-600">
            {formatVndSymbol(user.commissionBalance)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Bạn bè đã mời</div>
          <div className="text-2xl font-bold text-gray-800">
            {refereeCount}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 mt-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🎁</span>
          <div>
            <div className="font-bold text-base text-gray-800">Mã giới thiệu của bạn</div>
            <div className="text-xs text-gray-600">Chia sẻ mã này để nhận hoa hồng</div>
          </div>
        </div>
        <div className="px-6 py-3 bg-white rounded-lg font-mono font-bold text-lg text-indigo-600 shadow-sm">
          {user.referralCode}
        </div>
      </div>

      <div className="mt-8">
        <ProfileForm user={{
          name: detailedUser.name || '',
          email: detailedUser.email,
          phone: detailedUser.phone,
          gender: detailedUser.gender,
          dob: detailedUser.dob ? new Date(detailedUser.dob).toISOString().split('T')[0] : '',
          addressStreet: detailedUser.addressStreet,
          addressWard: detailedUser.addressWard,
          addressDistrict: detailedUser.addressDistrict ?? null,
          addressProvince: detailedUser.addressProvince,
        }} />
      </div>
    </>
  );
}

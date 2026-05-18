import { getSession } from '@/lib/auth';
import ProfileForm from './ProfileForm';
import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) return null;

  let profileData: any;
  let dashboardData: any;

  try {
    const [profile, dashboard] = await Promise.all([
      apiClient.get<any>('/users/profile', { cache: 'no-store' }),
      apiClient.get<any>('/users/dashboard', { cache: 'no-store' }),
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

  const { user, spentInLast30Days, refereeCount } = dashboardData;
  const detailedUser = profileData;

  const rankProgress: Record<string, { next: string; target: number }> = {
    MEMBER: { next: 'SILVER', target: 2000000 },
    SILVER: { next: 'GOLD', target: 5000000 },
    GOLD: { next: 'DIAMOND', target: 10000000 },
    DIAMOND: { next: 'PLATINUM', target: 20000000 },
    PLATINUM: { next: 'MAX', target: 0 },
  };

  let effectiveRank: string = user.rank;
  let progress = rankProgress[effectiveRank];
  while (progress && progress.target > 0 && spentInLast30Days >= progress.target) {
    if (progress.next !== 'MAX') {
      effectiveRank = progress.next;
      progress = rankProgress[effectiveRank];
    } else {
      break;
    }
  }

  return (
    <>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Hồ sơ cá nhân</h1>
          <p className="text-gray-600 text-sm">Quản lý thông tin tài khoản của bạn</p>
        </div>
      </div>

      {/* Profile overview cards */}
      <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {detailedUser.avatarUrl ? (
              <img
                src={detailedUser.avatarUrl}
                alt={detailedUser.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              (detailedUser.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{detailedUser.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3.5 py-1 rounded-full text-sm font-semibold shadow-sm border ${
                effectiveRank === 'MEMBER' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                effectiveRank === 'SILVER' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                effectiveRank === 'GOLD' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                effectiveRank === 'DIAMOND' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                {effectiveRank}
              </span>
              <span className="text-sm text-gray-600">
                Thành viên từ {detailedUser.createdAt ? new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date(detailedUser.createdAt)) : 'Gần đây'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Tổng chi tiêu</div>
          <div className="text-2xl font-bold text-gray-800">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(user.totalSpent)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Điểm tích lũy</div>
          <div className="text-2xl font-bold text-gray-800">
            {new Intl.NumberFormat('vi-VN').format(user.points)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Hoa hồng</div>
          <div className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(user.commissionBalance)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Bạn bè đã mời</div>
          <div className="text-2xl font-bold text-gray-800">
            {refereeCount}
          </div>
        </div>
      </div>

      {/* Referral code banner */}
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

      {/* Edit form */}
      <div className="mt-8">
        <ProfileForm user={{
          name: detailedUser.name,
          email: detailedUser.email,
          phone: detailedUser.phone,
          gender: detailedUser.gender,
          dob: detailedUser.dob ? new Date(detailedUser.dob).toISOString().split('T')[0] : '',
          addressStreet: detailedUser.addressStreet,
          addressWard: detailedUser.addressWard,
          addressDistrict: detailedUser.addressDistrict,
          addressProvince: detailedUser.addressProvince,
        }} />
      </div>
    </>
  );
}

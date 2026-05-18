import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import StoreActions from '@/components/admin/StoreActions';
import StoreApprovalButton from '@/components/admin/StoreApprovalButton';
import { apiClient } from '@/lib/apiClient';
import { getSession } from '@/lib/auth';

function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(d));
}

export default async function StoresPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') {
    redirect('/admin');
  }

  let stores: any[] = [];
  try {
    stores = await apiClient.get<any[]>('/stores/admin');
  } catch (error) {
    console.error('Error fetching admin stores:', error);
  }

  const pendingCount = stores.filter(s => !s.isActive && !s.isBanned).length;
  const bannedCount = stores.filter(s => s.isBanned).length;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Quản lý Cửa hàng</h1>
          <p className="text-gray-600 text-sm">
            {stores.length} cửa hàng
            {pendingCount > 0 && <> · <span className="text-amber-600 font-semibold">{pendingCount} đang chờ duyệt</span></>}
            {bannedCount > 0 && <> · <span className="text-red-600 font-semibold">{bannedCount} đã bị cấm</span></>}
          </p>
        </div>
        <StoreActions />
      </div>

      {/* Pending Stores */}
      {pendingCount > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stores.filter(s => !s.isActive && !s.isBanned).map(store => (
              <div key={store.id} className="bg-white rounded-xl shadow-sm border-2 border-amber-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{store.name}</h4>
                      <p className="text-xs text-gray-500">/{store.slug}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Chờ duyệt</span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chủ sở hữu:</span>
                    <span className="font-medium text-gray-800">{store.owner.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="text-gray-700">{store.owner.email || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">SĐT Shop:</span>
                    <span className="text-gray-700">{store.phone || '—'}</span>
                  </div>
                  {store.bankName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ngân hàng:</span>
                      <span className="text-gray-700">{store.bankName} - {store.bankAccountNo}</span>
                    </div>
                  )}
                  {store.bankOwnerName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chủ TK:</span>
                      <span className="font-medium text-gray-800">{store.bankOwnerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ngày đăng ký:</span>
                    <span className="text-gray-700">{fmtDate(store.createdAt)}</span>
                  </div>
                </div>

                <StoreApprovalButton storeId={store.id} storeName={store.name} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Stores Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Cửa hàng đang hoạt động</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Cửa hàng</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Chủ sở hữu</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Sản phẩm</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Đơn hàng</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Ngày tạo</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stores.filter(s => s.isActive && !s.isBanned).length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center py-12">
                      <div className="text-lg font-semibold text-gray-700">Chưa có cửa hàng nào đang hoạt động</div>
                    </div>
                  </td>
                </tr>
              ) : (
                stores.filter(s => s.isActive && !s.isBanned).map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt={store.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {store.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-800">{store.name}</div>
                          <div className="text-xs text-gray-500">/{store.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-gray-800 font-medium">{store.owner.name}</div>
                      <div className="text-xs text-gray-500">{store.owner.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-700">{store._count.products}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-700">{store._count.orders}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmtDate(store.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Hoạt động
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Link
                        href={`/admin/stores/${store.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Banned Stores */}
      {bannedCount > 0 && (
        <div className="mt-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-red-800 mb-1">Cửa hàng bị cấm ({bannedCount})</h3>
            <p className="text-sm text-red-700">Các cửa hàng dưới đây đã bị vô hiệu hóa do vi phạm chính sách.</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Cửa hàng</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Lý do</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stores.filter(s => s.isBanned).map(store => (
                    <tr key={store.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold">
                            {store.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{store.name}</div>
                            <div className="text-xs text-gray-500">/{store.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-red-700">{store.bannedReason || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Link
                          href={`/admin/stores/${store.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

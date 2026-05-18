export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StoreStatusManager from '@/components/admin/StoreStatusManager';
import { apiClient } from '@/lib/apiClient';
import { getSession } from '@/lib/auth';
import DeleteStoreButton from '@/components/admin/DeleteStoreButton';

function fmt(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
}

const statusMap: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-orange-100 text-orange-700', label: 'Chờ duyệt' },
  PACKAGING: { cls: 'bg-purple-100 text-purple-700', label: 'Đang đóng hàng' },
  CONFIRMED: { cls: 'bg-cyan-100 text-cyan-700', label: 'Đang giao' },
  COMPLETED: { cls: 'bg-green-100 text-green-700', label: 'Hoàn thành' },
  CANCELLED: { cls: 'bg-red-100 text-red-700', label: 'Đã hủy' },
  REFUNDED: { cls: 'bg-red-100 text-red-700', label: 'Hoàn trả' },
};

export default async function StoreDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/admin');

  const { id } = await props.params;
  let store: any = null;

  try {
    store = await apiClient.get<any>(`/stores/admin/${id}`);
  } catch (error) {
    console.error('Error fetching admin store detail:', error);
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy cửa hàng</h1>
        <Link href="/admin/stores" className="text-blue-600 hover:text-blue-700 font-medium">← Quay lại danh sách</Link>
      </div>
    );
  }

  const fullAddress = [store.addressStreet, store.addressWard, store.addressProvince].filter(Boolean).join(', ');
  const totalRevenue = (store.orders || []).reduce((sum: number, o: any) => sum + o.totalAmount, 0);

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/stores" className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-4 inline-block">← Quay lại danh sách</Link>
        <div className="flex items-center gap-4">
          {store.logoUrl ? (
            <img src={store.logoUrl} alt={store.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{store.name}</h1>
            <p className="text-gray-500 text-sm font-mono">/{store.slug} · Tạo lúc {fmtDate(store.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-5 text-center">
              <p className="text-3xl font-bold text-indigo-600">{store._count?.products || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Sản phẩm</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 text-center">
              <p className="text-3xl font-bold text-amber-600">{store._count?.orders || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Đơn hàng</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 text-center">
              <p className="text-3xl font-bold text-green-600">{store._count?.vouchers || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Voucher</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 text-center">
              <p className="text-xl font-bold text-blue-600">{fmt(totalRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">Doanh thu gần đây</p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Đơn hàng gần đây</h2>
              <Link href={`/admin/orders?storeId=${store.id}`} className="text-sm text-indigo-600 hover:underline font-medium">Xem tất cả →</Link>
            </div>
            {(!store.orders || store.orders.length === 0) ? (
              <p className="text-gray-500 text-center py-6">Chưa có đơn hàng nào</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Mã đơn</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Khách hàng</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tổng tiền</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {store.orders.map((order: any) => {
                      const st = statusMap[order.status] || { cls: 'bg-gray-100 text-gray-700', label: order.status };
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/admin/orders/${order.id}`} className="text-indigo-600 hover:underline font-semibold text-sm">{order.orderCode}</Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{order.user?.name || '—'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmt(order.totalAmount)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(order.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Products */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Sản phẩm gần đây</h2>
            </div>
            {(!store.products || store.products.length === 0) ? (
              <p className="text-gray-500 text-center py-6">Chưa có sản phẩm nào</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {store.products.map((product: any) => (
                  <div key={product.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{product.name}</p>
                      <p className="text-sm text-indigo-600 font-bold">{fmt(product.salePrice || product.originalPrice)}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>Kho: {product.stockQuantity}</span>
                        <span>Đã bán: {product.soldCount}</span>
                        {!product.isActive && <span className="text-red-500 font-semibold">Ẩn</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Status Manager */}
          <StoreStatusManager
            storeId={store.id}
            storeName={store.name}
            isActive={store.isActive}
            isBanned={store.isBanned}
            bannedReason={store.bannedReason}
          />

          {/* Owner Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Chủ sở hữu</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Tên</p>
                <p className="font-semibold text-gray-800">{store.owner?.name || '—'}</p>
              </div>
              {store.owner?.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold text-gray-800">{store.owner.email}</p>
                </div>
              )}
              {store.owner?.phone && (
                <div>
                  <p className="text-sm text-gray-500">SĐT</p>
                  <p className="font-semibold text-gray-800">{store.owner.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Hạng</p>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{store.owner?.rank || 'MEMBER'}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ngày tạo tài khoản</p>
                <p className="font-semibold text-gray-800">{store.owner?.createdAt ? fmtDate(store.owner.createdAt) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Store Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-lg">Thông tin cửa hàng</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tên cửa hàng</p>
                <p className="font-semibold text-gray-800">{store.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Slug</p>
                <p className="font-semibold text-gray-800 font-mono text-sm">/{store.slug}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">SĐT & Email</p>
                <p className="font-semibold text-gray-800 text-sm">{store.phone || '—'} · {store.email || '—'}</p>
              </div>
              {fullAddress && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Địa chỉ</p>
                  <p className="font-medium text-gray-700 text-sm leading-relaxed">{fullAddress}</p>
                </div>
              )}
              {store.description && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Mô tả</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{store.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-lg">Thông tin thanh toán</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">COD</p>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${store.allowCOD ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {store.allowCOD ? 'Cho phép' : 'Không'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Ngân hàng</p>
                <p className="font-bold text-gray-800">{store.bankName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Số tài khoản</p>
                <p className="font-mono font-bold text-gray-800 mt-1">{store.bankAccountNo || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Chủ tài khoản</p>
                <p className="font-bold text-gray-800 uppercase text-sm mt-1">{store.bankOwnerName || '—'}</p>
              </div>
            </div>
          </div>

          <DeleteStoreButton storeId={store.id} storeName={store.name} />
        </div>
      </div>
    </>
  );
}

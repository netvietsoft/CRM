import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
import Image from '@/components/ui/AppImage';
import Link from 'next/link';
import StoreActions from '@/components/admin/StoreActions';
import StoreApprovalButton from '@/components/admin/StoreApprovalButton';
import { apiClient } from '@/lib/apiClient';
import { getSession } from '@/lib/auth';
import { passthroughImageLoader } from '@/lib/imageLoader';

interface StoreOwner {
  name: string;
  email?: string | null;
}

interface StoreCounts {
  products: number;
  orders: number;
}

interface AdminStore {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  logoUrl?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankOwnerName?: string | null;
  isActive: boolean;
  isBanned: boolean;
  bannedReason?: string | null;
  createdAt: string | Date;
  owner: StoreOwner;
  _count: StoreCounts;
}

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

  let stores: AdminStore[] = [];
  try {
    stores = await apiClient.get<AdminStore[]>('/stores/admin');
  } catch (error) {
    console.error('Error fetching admin stores:', error);
  }

  const pendingCount = stores.filter(s => !s.isActive && !s.isBanned).length;
  const bannedCount = stores.filter(s => s.isBanned).length;
  const activeCount = stores.filter(s => s.isActive && !s.isBanned).length;

  return (
    <>
      <div className="mb-[18px] flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px] text-gray-900">Cửa hàng</h1>
          <p className="mt-1 mb-0 text-[13px] text-[#6b7280]">Cửa hàng trên hệ thống và yêu cầu chờ duyệt</p>
        </div>
        <StoreActions />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-[14px] mb-4">
        <div className="bg-white border border-[#eceef2] rounded-[14px] px-4 py-[15px]">
          <div className="text-xs text-[#6b7280] mb-[5px]">Tổng cửa hàng</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-gray-900">{stores.length}</div>
          <div className="text-[11.5px] font-semibold mt-[3px] text-[#047857]">{activeCount} đang hoạt động</div>
        </div>
        <div className="bg-white border border-[#eceef2] rounded-[14px] px-4 py-[15px]">
          <div className="text-xs text-[#6b7280] mb-[5px]">Chờ duyệt</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-gray-900">{pendingCount}</div>
          <div className="text-[11.5px] font-semibold mt-[3px] text-[#92400e]">Yêu cầu cần xử lý</div>
        </div>
        <div className="bg-white border border-[#eceef2] rounded-[14px] px-4 py-[15px]">
          <div className="text-xs text-[#6b7280] mb-[5px]">Đã bị cấm</div>
          <div className="text-[22px] font-extrabold tracking-[-0.3px] text-gray-900">{bannedCount}</div>
          <div className="text-[11.5px] font-semibold mt-[3px] text-[#dc2626]">Bị vô hiệu hoá</div>
        </div>
      </div>

      {/* Pending Stores */}
      {pendingCount > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
            {stores.filter(s => !s.isActive && !s.isBanned).map(store => (
              <div key={store.id} className="bg-white rounded-[14px] border border-[#fcd34d] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-[10px]">
                    <div className="w-8 h-8 rounded-[9px] bg-[#f59e0b] flex items-center justify-center text-white font-bold text-[13px]">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{store.name}</h4>
                      <p className="text-[11.5px] text-[#9ca3af]">/{store.slug}</p>
                    </div>
                  </div>
                  <span className="px-[10px] py-[3px] rounded-full text-[11px] font-semibold bg-[#fef3c7] text-[#92400e]">Chờ duyệt</span>
                </div>

                <div className="space-y-2 text-[13px] mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Chủ sở hữu:</span>
                    <span className="font-semibold text-gray-900">{store.owner.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Email:</span>
                    <span className="text-[#4b5563]">{store.owner.email || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">SĐT Shop:</span>
                    <span className="text-[#4b5563]">{store.phone || '—'}</span>
                  </div>
                  {store.bankName && (
                    <div className="flex justify-between">
                      <span className="text-[#6b7280]">Ngân hàng:</span>
                      <span className="text-[#4b5563]">{store.bankName} - {store.bankAccountNo}</span>
                    </div>
                  )}
                  {store.bankOwnerName && (
                    <div className="flex justify-between">
                      <span className="text-[#6b7280]">Chủ TK:</span>
                      <span className="font-semibold text-gray-900">{store.bankOwnerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Ngày đăng ký:</span>
                    <span className="text-[#4b5563]">{fmtDate(store.createdAt)}</span>
                  </div>
                </div>

                <StoreApprovalButton storeId={store.id} storeName={store.name} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Stores Table */}
      <div className="bg-white rounded-[14px] border border-[#eceef2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[840px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Cửa hàng</th>
                <th className="px-3 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Chủ cửa hàng</th>
                <th className="px-3 py-[10px] text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Sản phẩm</th>
                <th className="px-3 py-[10px] text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Đơn hàng</th>
                <th className="px-3 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Tham gia</th>
                <th className="px-3 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Trạng thái</th>
                <th className="px-4 py-[10px]"></th>
              </tr>
            </thead>
            <tbody>
              {activeCount === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center py-12">
                      <div className="text-[15px] font-semibold text-[#4b5563]">Chưa có cửa hàng nào đang hoạt động</div>
                    </div>
                  </td>
                </tr>
              ) : (
                stores.filter(s => s.isActive && !s.isBanned).map((store, i) => (
                  <tr key={store.id} className={`border-t border-[#f3f4f6] hover:bg-[#eff6ff] transition-colors ${i % 2 === 1 ? 'bg-[#f7f9fc]' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-[10px]">
                        {store.logoUrl ? (
                          <Image
                            loader={passthroughImageLoader}
                            unoptimized
                            src={store.logoUrl}
                            alt={store.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-[9px] object-cover border border-[#eceef2] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-[9px] bg-[#2563eb] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
                            {store.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 whitespace-nowrap">{store.name}</div>
                          <div className="text-[11.5px] text-[#9ca3af]">/{store.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-gray-900 font-semibold">{store.owner.name}</div>
                      <div className="text-[11.5px] text-[#9ca3af]">{store.owner.email || '—'}</div>
                    </td>
                    <td className="px-3 py-3 text-right text-[#4b5563]">{store._count.products}</td>
                    <td className="px-3 py-3 text-right text-[#4b5563]">{store._count.orders}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[#6b7280]">{fmtDate(store.createdAt)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="px-[10px] py-[3px] rounded-full text-[11px] font-semibold bg-[#d1fae5] text-[#047857]">
                        Hoạt động
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/stores/${store.id}`}
                        className="text-[#2563eb] font-semibold cursor-pointer text-[12.5px] hover:underline"
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
        <div className="mt-4">
          <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-[14px] p-4 mb-4">
            <h3 className="font-bold text-[#dc2626] mb-1">Cửa hàng bị cấm ({bannedCount})</h3>
            <p className="text-[13px] text-[#dc2626]">Các cửa hàng dưới đây đã bị vô hiệu hóa do vi phạm chính sách.</p>
          </div>
          <div className="bg-white rounded-[14px] border border-[#eceef2] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f9fafb]">
                    <th className="px-4 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Cửa hàng</th>
                    <th className="px-3 py-[10px] text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em]">Lý do</th>
                    <th className="px-4 py-[10px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {stores.filter(s => s.isBanned).map((store, i) => (
                    <tr key={store.id} className={`border-t border-[#f3f4f6] hover:bg-[#eff6ff] transition-colors ${i % 2 === 1 ? 'bg-[#f7f9fc]' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-[10px]">
                          <div className="w-8 h-8 rounded-[9px] bg-[#dc2626] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
                            {store.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 whitespace-nowrap">{store.name}</div>
                            <div className="text-[11.5px] text-[#9ca3af]">/{store.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[#dc2626]">{store.bannedReason || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/stores/${store.id}`}
                          className="text-[#2563eb] font-semibold cursor-pointer text-[12.5px] hover:underline"
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

import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
import StoreActions from '@/components/admin/StoreActions';
import StoreApprovalButton from '@/components/admin/StoreApprovalButton';
import StoresTableClient from '@/components/admin/StoresTableClient';
import { apiClient } from '@/lib/apiClient';
import { getSession } from '@/lib/auth';

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

      <StoresTableClient stores={stores} />
    </>
  );
}

'use client';
import Image from '@/components/ui/AppImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface StoresTableClientProps {
  stores: AdminStore[];
}

export default function StoresTableClient({ stores }: StoresTableClientProps) {
  const router = useRouter();

  // Click vào vùng trống của dòng → mở chi tiết; bỏ qua khi bấm vào control (checkbox/nút/link…).
  const openRow = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="switch"]')) return;
    router.push(`/admin/stores/${id}`);
  };

  const activeStores = stores.filter(s => s.isActive && !s.isBanned);
  const bannedStores = stores.filter(s => s.isBanned);

  return (
    <>
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
              {activeStores.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="text-center py-12">
                      <div className="text-[15px] font-semibold text-[#4b5563]">Chưa có cửa hàng nào đang hoạt động</div>
                    </div>
                  </td>
                </tr>
              ) : (
                activeStores.map((store, i) => (
                  <tr
                    key={store.id}
                    onClick={(e) => openRow(e, store.id)}
                    className={`cursor-pointer border-t border-[#f3f4f6] hover:bg-[#eff6ff] transition-colors ${i % 2 === 1 ? 'bg-[#f7f9fc]' : ''}`}
                  >
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
      {bannedStores.length > 0 && (
        <div className="mt-4">
          <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-[14px] p-4 mb-4">
            <h3 className="font-bold text-[#dc2626] mb-1">Cửa hàng bị cấm ({bannedStores.length})</h3>
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
                  {bannedStores.map((store, i) => (
                    <tr
                      key={store.id}
                      onClick={(e) => openRow(e, store.id)}
                      className={`cursor-pointer border-t border-[#f3f4f6] hover:bg-[#eff6ff] transition-colors ${i % 2 === 1 ? 'bg-[#f7f9fc]' : ''}`}
                    >
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

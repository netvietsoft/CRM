'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';
import { MessageSquareShare } from 'lucide-react';
import ZaloZnsModal from './ZaloZnsModal';
import { formatVndSymbol } from '@/lib/format';

interface CustomerSummary {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  dob?: string | Date | null;
  rank: string;
  totalSpent: number;
  commissionBalance: number;
  addressWard?: string | null;
  addressProvince?: string | null;
  createdAt: string | Date;
  _count?: {
    orders?: number;
    referees?: number;
  };
}

interface CustomersTableSearchParams {
  page?: string;
  search?: string;
  rank?: string;
  province?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CustomersTableClientProps {
  customers: CustomerSummary[];
  searchParams: CustomersTableSearchParams;
  isZaloEnabled?: boolean;
}

function formatCurrency(amount: number) {
  return formatVndSymbol(amount);
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date));
}

function formatRegion(customer: CustomerSummary) {
  return customer.addressProvince || '—';
}

export default function CustomersTableClient({ customers, searchParams, isZaloEnabled = false }: CustomersTableClientProps) {
  const router = useRouter();
  const pathname = usePathname(); // dùng chung /admin/customers cũ và /admin/pancake-customers
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Click vào vùng trống của dòng → mở chi tiết; bỏ qua khi bấm vào control (checkbox/nút/link…).
  const openRow = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="switch"]')) return;
    router.push(`/admin/customers/${id}`);
  };
  const [isZnsModalOpen, setIsZnsModalOpen] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSet = new Set(selectedIds);
      customers.forEach(c => newSet.add(c.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      customers.forEach(c => newSet.delete(c.id));
      setSelectedIds(newSet);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const isAllSelected = customers.length > 0 && customers.every(c => selectedIds.has(c.id));
  const isIndeterminate = customers.some(c => selectedIds.has(c.id)) && !isAllSelected;

  const buildSortHref = (sortBy: 'rank' | 'totalSpent' | 'orders' | 'commissionBalance') => {
    const params = new URLSearchParams();

    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.rank) params.set('rank', searchParams.rank);
    if (searchParams.province) params.set('province', searchParams.province);

    const nextSortOrder = searchParams.sortBy === sortBy && searchParams.sortOrder === 'asc' ? 'desc' : 'asc';
    params.set('sortBy', sortBy);
    params.set('sortOrder', nextSortOrder);

    return `${pathname}?${params.toString()}`;
  };

  const renderSortLabel = (label: string, sortBy: 'rank' | 'totalSpent' | 'orders' | 'commissionBalance') => {
    const isActive = searchParams.sortBy === sortBy;
    const direction = searchParams.sortOrder === 'asc' ? 'asc' : 'desc';

    return (
      <Link
        href={buildSortHref(sortBy)}
        className={`inline-flex items-center gap-1.5 uppercase tracking-[0.05em] transition-colors ${isActive ? 'text-[#2563eb]' : 'text-[#6b7280] hover:text-[#374151]'}`}
      >
        <span>{label}</span>
        <span className={`text-[10px] font-bold ${isActive ? 'text-[#2563eb]' : 'text-[#9ca3af]'}`}>
          {isActive ? (direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={12} />}
        </span>
      </Link>
    );
  };

  return (
    <>
      <div className="bg-white rounded-[14px] border border-[#eceef2] overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] min-w-[900px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-2.5 w-[38px] text-left">
                  <input
                    type="checkbox"
                    className="w-[15px] h-[15px] rounded border-gray-300 accent-[#2563eb] cursor-pointer"
                    checked={isAllSelected}
                    ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Khách hàng</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Ngày sinh</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Khu vực</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap">{renderSortLabel('Hạng', 'rank')}</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold whitespace-nowrap">{renderSortLabel('Tổng chi tiêu', 'totalSpent')}</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold whitespace-nowrap">{renderSortLabel('Số đơn', 'orders')}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Giới thiệu</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold whitespace-nowrap">{renderSortLabel('Hoa hồng', 'commissionBalance')}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] whitespace-nowrap">Ngày đăng ký</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="text-center px-5 py-12">
                      <div className="text-[44px] mb-2.5">👥</div>
                      <div className="text-[16px] font-bold text-[#111827] mb-[5px]">Không tìm thấy khách hàng</div>
                      <div className="text-[13px] text-[#6b7280]">
                        {searchParams?.search
                          ? 'Thử tìm kiếm với từ khóa khác hoặc xoá bộ lọc'
                          : 'Thử tìm kiếm với từ khóa khác hoặc xoá bộ lọc'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer, idx) => (
                  <tr key={customer.id} onClick={(e) => openRow(e, customer.id)} className={`cursor-pointer border-t border-[#f3f4f6] transition-colors hover:bg-[#eff6ff] ${selectedIds.has(customer.id) ? 'bg-[#eff6ff]' : (idx % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white')}`}>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        className="w-[15px] h-[15px] rounded border-gray-300 accent-[#2563eb] cursor-pointer"
                        checked={selectedIds.has(customer.id)}
                        onChange={(e) => handleSelectOne(customer.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div>
                        <div className="font-semibold text-[#111827]">
                          {customer.phone || customer.name}
                        </div>
                        <div className="text-[11.5px] text-[#9ca3af]">
                          {customer.name !== customer.phone ? customer.name : (customer.email || 'Chưa cập nhật')}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[#4b5563]">{formatDate(customer.dob)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[#4b5563]">{formatRegion(customer)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2.5 py-[3px] rounded-full text-[11px] font-bold ${customer.rank === 'PLATINUM' ? 'bg-[#fae8ff] text-[#701a75]' :
                          customer.rank === 'DIAMOND' ? 'bg-[#cffafe] text-[#164e63]' :
                            customer.rank === 'GOLD' ? 'bg-[#fef3c7] text-[#78350f]' :
                              customer.rank === 'SILVER' ? 'bg-[#e2e8f0] text-[#0f172a]' :
                                'bg-[#f1f5f9] text-[#334155]'
                        }`}>
                        {customer.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold text-[#111827]">
                      {formatCurrency(customer.totalSpent)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right text-[#4b5563]">{customer._count?.orders || 0}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="px-[9px] py-[3px] rounded-full text-[11px] font-semibold bg-[#eef2ff] text-[#4338ca] whitespace-nowrap">
                        {customer._count?.referees || 0} người
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right text-[#111827]">{formatCurrency(customer.commissionBalance)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[#6b7280]">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Link href={`/admin/customers/${customer.id}`} className="text-[#2563eb] hover:underline font-semibold">
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

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-[22px] left-1/2 -translate-x-1/2 z-[60] bg-white rounded-2xl border border-[#dbeafe] py-2.5 px-[18px] flex items-center gap-4 shadow-[0_12px_40px_rgba(15,23,42,0.18)] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#4b5563]">
            <span className="flex items-center justify-center bg-[#dbeafe] text-[#1d4ed8] w-6 h-6 rounded-full font-extrabold text-xs">
              {selectedIds.size}
            </span>
            khách hàng đã chọn
          </div>
          <div className="h-[22px] w-px bg-[#e5e7eb]"></div>
          <div className="flex items-center gap-3">
            {isZaloEnabled && (
              <button
                onClick={() => setIsZnsModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[10px] font-semibold transition-colors text-[13px]"
              >
                <MessageSquareShare size={16} />
                Gửi Zalo ZNS
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-2 text-[#6b7280] hover:text-[#111827] rounded-lg font-semibold text-[13px] transition-colors"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Zalo Modal */}
      <ZaloZnsModal
        isOpen={isZnsModalOpen}
        onClose={() => setIsZnsModalOpen(false)}
        selectedUserIds={Array.from(selectedIds)}
        totalCustomersCount={selectedIds.size}
        onSuccess={() => {
          setSelectedIds(new Set()); // clear selection after success
        }}
      />
    </>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown } from 'lucide-react';
import { MessageSquareShare } from 'lucide-react';
import ZaloZnsModal from './ZaloZnsModal';

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
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount);
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

    return `/admin/customers?${params.toString()}`;
  };

  const renderSortLabel = (label: string, sortBy: 'rank' | 'totalSpent' | 'orders' | 'commissionBalance') => {
    const isActive = searchParams.sortBy === sortBy;
    const direction = searchParams.sortOrder === 'asc' ? 'asc' : 'desc';

    return (
      <Link
        href={buildSortHref(sortBy)}
        className={`inline-flex items-center gap-1.5 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
      >
        <span>{label}</span>
        <span className={`text-[10px] font-bold ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
          {isActive ? (direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={12} />}
        </span>
      </Link>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap w-12 text-left">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={isAllSelected}
                    ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Khách hàng</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Ngày sinh</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Khu vực</th>
                <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{renderSortLabel('Hạng', 'rank')}</th>
                <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{renderSortLabel('Tổng chi tiêu', 'totalSpent')}</th>
                <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{renderSortLabel('Số đơn', 'orders')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Giới thiệu</th>
                <th className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{renderSortLabel('Hoa hồng', 'commissionBalance')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Ngày đăng ký</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="text-center py-12">
                      <div className="text-6xl mb-3">👥</div>
                      <div className="text-xl font-semibold text-gray-800 mb-2">Không tìm thấy khách hàng</div>
                      <div className="text-gray-600">
                        {searchParams?.search
                          ? 'Thử tìm kiếm với từ khóa khác'
                          : 'Thêm khách hàng đầu tiên để bắt đầu'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(customer.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.has(customer.id)}
                        onChange={(e) => handleSelectOne(customer.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-800">
                          {customer.phone || customer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.name !== customer.phone ? customer.name : (customer.email || 'Chưa cập nhật')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(customer.dob)}</td>
                    <td className="px-4 py-3 text-gray-700 min-w-40">{formatRegion(customer)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${customer.rank === 'PLATINUM' ? 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300 ring-1 ring-fuchsia-200 shadow-sm' :
                          customer.rank === 'DIAMOND' ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 ring-1 ring-cyan-200 shadow-sm' :
                            customer.rank === 'GOLD' ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-200 shadow-sm' :
                              customer.rank === 'SILVER' ? 'bg-slate-200 text-slate-900 border border-slate-400 ring-1 ring-slate-300 shadow-sm' :
                                'bg-slate-100 text-slate-800 border border-slate-300 ring-1 ring-slate-200 shadow-sm'
                        }`}>
                        {customer.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                      {formatCurrency(customer.totalSpent)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{customer._count?.orders || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {customer._count?.referees || 0} người
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-800">{formatCurrency(customer.commissionBalance)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/admin/customers/${customer.id}`} className="text-indigo-600 hover:underline font-medium">
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white shadow-2xl rounded-2xl border border-blue-100 py-3 px-6 flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-6 h-6 rounded-full font-bold text-xs">
              {selectedIds.size}
            </span>
            khách hàng đã chọn
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex items-center gap-3">
            {isZaloEnabled && (
              <button
                onClick={() => setIsZnsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors text-sm"
              >
                <MessageSquareShare size={16} />
                Gửi Zalo ZNS
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors"
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

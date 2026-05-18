export const dynamic = 'force-dynamic';
import Link from 'next/link';
import CustomerActions from '@/components/admin/CustomerActions';
import CustomerSearch from '@/components/admin/CustomerSearch';
import CustomersTableClient from '@/components/admin/CustomersTableClient';
import { apiClient } from '@/lib/apiClient';

interface SearchParams {
  page?: string;
  search?: string;
  rank?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount);
}

function getRankBadgeClass(rank: string) {
  const map: Record<string, string> = {
    MEMBER: 'badge-member', SILVER: 'badge-silver',
    GOLD: 'badge-gold', DIAMOND: 'badge-diamond', PLATINUM: 'badge-platinum',
  };
  return map[rank] || 'badge-member';
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date));
}

export default async function CustomersPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;

  let customers: any[] = [];
  let pagination: any = { page: 1, limit: 20, total: 0, totalPages: 0 };
  let isZaloEnabled = false;

  try {
    const [data, zaloConfig] = await Promise.all([
      apiClient.get<any>('/admin/customers', {
        params: {
          page: searchParams.page,
          search: searchParams.search,
          rank: searchParams.rank,
        }
      }),
      apiClient.get<any>('/notifications/zalo/config').catch(() => ({ isConfigured: false }))
    ]);
    customers = data.customers;
    pagination = data.pagination;
    isZaloEnabled = zaloConfig.isConfigured;
  } catch (error) {
    console.error('Error fetching customers:', error);
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Khách hàng</h1>
          <p className="text-gray-600 text-sm">
            {pagination.total} khách hàng trong hệ thống
          </p>
        </div>
        <CustomerActions />
      </div>

      {/* Filters */}
      <CustomerSearch />

      <CustomersTableClient 
        customers={customers} 
        searchParams={searchParams} 
        isZaloEnabled={isZaloEnabled}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (() => {
        const currentPage = Number(pagination.page);
        const totalPages = pagination.totalPages;
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
          for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
          pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }

        const buildHref = (p: number) =>
          `/admin/customers?page=${p}${searchParams.search ? `&search=${searchParams.search}` : ''}${searchParams.rank ? `&rank=${searchParams.rank}` : ''}`;

        return (
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {currentPage > 1 && (
              <Link
                href={buildHref(currentPage - 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ← Trước
              </Link>
            )}

            {pages.map((page, index) =>
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 py-2 text-gray-400 text-sm">
                  ...
                </span>
              ) : (
                <Link
                  key={page}
                  href={buildHref(page as number)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </Link>
              )
            )}

            {currentPage < totalPages && (
              <Link
                href={buildHref(currentPage + 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Sau →
              </Link>
            )}
          </div>
        );
      })()}
    </>
  );
}

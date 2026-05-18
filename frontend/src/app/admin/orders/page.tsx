export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import OrdersTableClient from '@/components/admin/OrdersTableClient';
import { apiClient } from '@/lib/apiClient';

export default async function OrdersPage(props: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    paymentMethod?: string;
    search?: string;
    dateField?: string;
    dateSort?: string;
    dateFilterType?: string;
    dateValue?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();
  if (!session) return null;

  let orders: any[] = [];
  let pagination: any = { page: 1, limit: 11, total: 0, totalPages: 0 };
  let statusCounts: Record<string, number> = {};

  try {
    const data = await apiClient.get<any>('/orders/admin', {
      params: {
        page: searchParams.page,
        status: searchParams.status,
        paymentMethod: searchParams.paymentMethod,
        search: searchParams.search,
        dateField: searchParams.dateField,
        dateSort: searchParams.dateSort,
        dateFilterType: searchParams.dateFilterType,
        dateValue: searchParams.dateValue,
      }
    });
    orders = data.orders;
    pagination = data.pagination;
    statusCounts = data.statusCounts;
  } catch (error) {
    console.error('Error fetching admin orders:', error);
  }

  const buildPageUrl = (page: number) => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    if (searchParams.status) p.set('status', searchParams.status);
    if (searchParams.paymentMethod) p.set('paymentMethod', searchParams.paymentMethod);
    if (searchParams.search) p.set('search', searchParams.search);
    if (searchParams.dateField) p.set('dateField', searchParams.dateField);
    if (searchParams.dateSort) p.set('dateSort', searchParams.dateSort);
    if (searchParams.dateFilterType) p.set('dateFilterType', searchParams.dateFilterType);
    if (searchParams.dateValue) p.set('dateValue', searchParams.dateValue);
    return `/admin/orders?${p.toString()}`;
  };

  return (
    <>
      <OrdersTableClient orders={orders} statusCounts={statusCounts} />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 mb-4">
          {/* Previous Page */}
          {pagination.page > 1 && (
            <Link
              href={buildPageUrl(pagination.page - 1)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              ←
            </Link>
          )}

          {/* Page Numbers */}
          {Array.from({ length: pagination.totalPages }, (_, i) => {
            const pageNum = i + 1;
            const shouldShow = pageNum === 1 || pageNum === pagination.totalPages || Math.abs(pageNum - pagination.page) <= 2;

            if (!shouldShow) {
              if (pageNum === 2 || pageNum === pagination.totalPages - 1) {
                return <span key={pageNum} className="px-2 text-gray-400">...</span>;
              }
              return null;
            }

            return (
              <Link
                key={pageNum}
                href={buildPageUrl(pageNum)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${pagination.page === pageNum
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-600'
                  }`}
              >
                {pageNum}
              </Link>
            );
          })}

          {/* Next Page */}
          {pagination.page < pagination.totalPages && (
            <Link
              href={buildPageUrl(pagination.page + 1)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              →
            </Link>
          )}
        </div>
      )}
    </>
  );
}

export const dynamic = 'force-dynamic';
import { VtTabs } from '../_ui';
import RevenueStats from '@/components/admin/RevenueStats';
import StaffRevenueTable from '@/components/admin/StaffRevenueTable';

export default function ViettelRevenuePage() {
  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827] flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">Doanh thu đơn giao thành công + doanh thu theo nhân viên lên đơn.</p>
        </div>
      </div>
      <VtTabs />
      <div className="space-y-4">
        <RevenueStats defaultPeriod="month" scope="delivered" />
        <StaffRevenueTable />
      </div>
    </div>
  );
}

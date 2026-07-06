export const dynamic = 'force-dynamic';
import { VtTabs, vtCard } from '../_ui';

export default function ViettelPendingOrdersPage() {
  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-[#111827] flex items-center gap-2">📦 Khách hàng Viettel</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">Đơn cần xử lý — chờ duyệt, status &lt; 200, hoàn/huỷ cần thao tác.</p>
        </div>
      </div>
      <VtTabs />
      <div className={`${vtCard} p-10 text-center text-[13px] text-[#9ca3af]`}>
        🚧 Trang đang xây dựng — sẽ liệt kê đơn cần xử lý (chờ duyệt, status &lt; 200, hoàn/huỷ cần thao tác…).
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

interface AdminCommission {
  id: string;
  level: number;
  percentage: number;
  amount: number;
  status: string;
  user: {
    name: string;
    referralCode: string;
  };
  order: {
    orderCode: string;
    totalAmount: number;
  };
}

interface CommissionConfig {
  id: string;
  level: number;
  percentage: number;
  isActive: boolean;
}

interface CommissionStats {
  total: {
    amount: number;
    count: number;
  };
  pending: {
    amount: number;
    count: number;
  };
}

const levelLabels: Record<number, string> = { 1: 'F1 → F0', 2: 'F2 → F0', 3: 'F3 → F0', 4: 'F4 → F0' };
const statusMap: Record<string, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: '#fef3c7', fg: '#92400e', label: 'Chờ duyệt' },
  APPROVED: { bg: '#dbeafe', fg: '#1d4ed8', label: 'Đã duyệt' },
  PAID: { bg: '#d1fae5', fg: '#047857', label: 'Đã trả' },
  CANCELLED: { bg: '#fee2e2', fg: '#dc2626', label: 'Hủy' },
};

export default async function CommissionsPage() {
  let commissions: AdminCommission[] = [];
  let configs: CommissionConfig[] = [];
  let stats: CommissionStats = { total: { amount: 0, count: 0 }, pending: { amount: 0, count: 0 } };

  try {
    const [ledgerRes, configsRes, statsRes] = await Promise.all([
      apiClient.get<AdminCommission[]>('/commissions/admin/ledger'),
      apiClient.get<CommissionConfig[]>('/commissions/admin/configs'),
      apiClient.get<CommissionStats>('/commissions/admin/stats'),
    ]);
    commissions = ledgerRes;
    configs = configsRes;
    stats = statsRes;
  } catch (error) {
    console.error('Error fetching admin commissions:', error);
  }

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-slate-900">Hoa hồng Referral</h1>
          <p className="mt-1 mb-0 text-[13px] text-[#6b7280]">Quản lý tỷ lệ hoa hồng và lịch sử chi trả</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-[14px] md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-4">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Tổng hoa hồng đã sinh</div>
          <div className="text-[20px] font-extrabold tracking-[-0.3px] text-slate-900">{fmt(stats.total.amount)}</div>
          <div className="mt-[3px] text-[11.5px] font-semibold text-[#6b7280]">{stats.total.count} giao dịch</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-4">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Hoa hồng chờ duyệt</div>
          <div className="text-[20px] font-extrabold tracking-[-0.3px] text-slate-900">{fmt(stats.pending.amount)}</div>
          <div className="mt-[3px] text-[11.5px] font-semibold text-[#92400e]">{stats.pending.count} giao dịch</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-4">
          <div className="mb-[5px] text-[12px] text-[#6b7280]">Số tầng đang hoạt động</div>
          <div className="text-[20px] font-extrabold tracking-[-0.3px] text-slate-900">{configs.filter(c => c.isActive).length}</div>
          <div className="mt-[3px] text-[11.5px] font-semibold text-[#047857]">/ {configs.length} tầng cấu hình</div>
        </div>
      </div>

      {/* Commission Config */}
      <div className="mb-4 rounded-[14px] border border-[#eceef2] bg-white p-5">
        <div className="mb-[14px] text-[15px] font-bold text-slate-900">Cấu hình tỷ lệ hoa hồng</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {configs.map((c) => (
            <div key={c.id} className="rounded-[12px] border border-[#eceef2] p-[14px] text-center">
              <div className="mb-1 text-[11.5px] font-semibold text-[#6b7280]">Khi F{c.level} mua hàng</div>
              <div className="text-[24px] font-extrabold text-[#2563eb]">{c.percentage}%</div>
              <div className="mt-[2px] text-[11px] text-[#9ca3af]">F0 nhận hoa hồng</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-[#6b7280]">
          Ví dụ: F0 giới thiệu F1, F1 giới thiệu F2. Khi F2 mua hàng 1,000,000đ → F0 nhận 3% = 30,000đ, F1 nhận 5% = 50,000đ
        </p>
      </div>

      {/* Ledger */}
      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="border-b border-[#f0f1f5] px-5 py-[15px] text-[15px] font-bold text-slate-900">Sổ hoa hồng</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Người nhận</th>
                <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Đơn hàng</th>
                <th className="px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Giá trị đơn</th>
                <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Tầng</th>
                <th className="px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Tỷ lệ</th>
                <th className="px-3 py-[10px] text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Hoa hồng</th>
                <th className="px-3 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="py-12 text-center">
                      <div className="mb-3 text-6xl">💰</div>
                      <div className="text-xl font-semibold text-slate-900">Chưa có hoa hồng</div>
                    </div>
                  </td>
                </tr>
              ) : commissions.map((c, idx) => {
                const st = statusMap[c.status] || { bg: '#f3f4f6', fg: '#4b5563', label: c.status };
                return (
                  <tr
                    key={c.id}
                    className="border-t border-[#f3f4f6] hover:bg-[#eff6ff]"
                    style={{ background: idx % 2 === 1 ? '#f7f9fc' : '#fff' }}
                  >
                    <td className="px-4 py-3">
                      <div className="whitespace-nowrap font-semibold text-slate-900">{c.user.name}</div>
                      <div className="font-mono text-[11px] text-[#9ca3af]">{c.user.referralCode}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] font-semibold text-[#2563eb]">{c.order.orderCode}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-slate-900">{fmt(c.order.totalAmount)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-[8px] bg-[#eef2ff] px-[9px] py-[3px] text-[11px] font-bold text-[#4338ca]">
                        {levelLabels[c.level] || `F${c.level}`}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-[#4b5563]">{c.percentage}%</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-[#059669]">{fmt(c.amount)}</td>
                    <td className="px-3 py-3">
                      <span
                        className="whitespace-nowrap rounded-full px-[10px] py-[3px] text-[11px] font-semibold"
                        style={{ background: st.bg, color: st.fg }}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

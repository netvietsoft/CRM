export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';
import SpinPrizeActions from '@/components/admin/SpinPrizeActions';

interface SpinVoucher {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  perCustomerLimit: number;
  durationDays: number | null;
  isStackable: boolean;
}

interface SpinPrize {
  id: string;
  name: string;
  type: string;
  color: string | null;
  probability: number;
  quantity: number | null;
  wonCount: number;
  isActive: boolean;
  voucher: SpinVoucher | null;
}

interface SpinStats {
  totalSpins: number;
  totalWins: number;
}

export default async function SpinConfigPage() {
  let prizes: SpinPrize[] = [];
  let stats: SpinStats = { totalSpins: 0, totalWins: 0 };

  try {
    const [prizesRes, statsRes] = await Promise.all([
      apiClient.get<SpinPrize[]>('/spin/admin/prizes'),
      apiClient.get<SpinStats>('/spin/admin/stats'),
    ]);
    prizes = prizesRes;
    stats = statsRes;
  } catch (error) {
    console.error('Error fetching admin spin data:', error);
  }

  const { totalSpins, totalWins } = stats;
  const winRate = totalSpins > 0 ? Math.round((totalWins / totalSpins) * 100) : 0;

  return (
    <div className="font-sans">
      <div className="mb-[18px] flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-[#111827]">Vòng quay may mắn</h1>
          <p className="mt-1 mb-0 text-[13px] text-[#6b7280]">Cấu hình giải thưởng và tỷ lệ trúng</p>
        </div>
        <SpinPrizeActions mode="add" />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        {/* Left: prize table with inline probability controls */}
        <SpinPrizeActions mode="table" prizes={prizes} />

        {/* Right column: participation conditions + monthly stats */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
            <div className="text-[15px] font-bold mb-[14px] text-[#111827]">Điều kiện tham gia</div>
            <div className="flex flex-col gap-[11px] text-[13px] text-[#4b5563]">
              <div className="flex justify-between items-center gap-[10px]">
                <span>Chi phí mỗi lượt quay (xu)</span>
                <input
                  defaultValue="50"
                  className="w-[86px] px-[10px] py-[7px] border border-[#e5e7eb] rounded-lg text-[12.5px] text-right outline-none font-bold focus:border-[#2563eb]"
                />
              </div>
              <div className="flex justify-between items-center gap-[10px]">
                <span>Lượt miễn phí / ngày</span>
                <input
                  defaultValue="1"
                  className="w-[86px] px-[10px] py-[7px] border border-[#e5e7eb] rounded-lg text-[12.5px] text-right outline-none font-bold focus:border-[#2563eb]"
                />
              </div>
              <div className="flex justify-between items-center gap-[10px]">
                <span>Tặng lượt khi đơn từ (₫)</span>
                <input
                  defaultValue="200000"
                  className="w-[110px] px-[10px] py-[7px] border border-[#e5e7eb] rounded-lg text-[12.5px] text-right outline-none font-bold focus:border-[#2563eb]"
                />
              </div>
              <div className="flex justify-between items-center gap-[10px]">
                <span>Hạng tối thiểu</span>
                <select className="px-[10px] py-[7px] border border-[#e5e7eb] rounded-lg text-[12.5px] bg-white font-bold outline-none">
                  <option>MEMBER</option>
                  <option>SILVER</option>
                  <option>GOLD</option>
                  <option>DIAMOND</option>
                </select>
              </div>
              <button
                type="button"
                className="mt-1 py-[9px] bg-white border border-[#bfdbfe] text-[#1d4ed8] rounded-[9px] font-bold text-[12.5px] cursor-pointer transition-colors hover:bg-[#eff6ff]"
              >
                Lưu điều kiện
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#eceef2] rounded-[14px] p-5">
            <div className="text-[15px] font-bold mb-[14px] text-[#111827]">Thống kê</div>
            <div className="flex flex-col gap-3 text-[13px] text-[#4b5563]">
              <div className="flex justify-between">
                <span>Tổng lượt quay</span>
                <b className="text-[#111827]">{totalSpins.toLocaleString('vi-VN')}</b>
              </div>
              <div className="flex justify-between">
                <span>Lượt trúng thưởng</span>
                <b className="text-[#111827]">{totalWins.toLocaleString('vi-VN')}</b>
              </div>
              <div className="flex justify-between">
                <span>Tỷ lệ trúng</span>
                <b className="text-[#059669]">{winRate}%</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

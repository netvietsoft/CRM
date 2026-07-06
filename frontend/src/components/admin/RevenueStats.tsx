'use client';

import { useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { TrendingUp, CalendarRange } from 'lucide-react';
import { formatNumber, formatVndTight } from '@/lib/format';

const PERIODS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'week', label: 'Tuần này' },
  { value: 'lastweek', label: 'Tuần trước' },
  { value: 'month', label: 'Tháng này' },
  { value: 'lastmonth', label: 'Tháng trước' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'all', label: 'Tất cả' },
  { value: 'custom', label: 'Tùy chọn' },
];

interface RevenueResp {
  period: string;
  label: string;
  start: string | null;
  end: string | null;
  revenue: number;
  orderCount: number;
}

interface RevenueStatsProps {
  defaultPeriod?: string;
  periods?: string[]; // danh sách value kỳ muốn hiển thị (mặc định tất cả)
  scope?: 'delivered' | 'all'; // 'delivered'=đơn giao thành công (mặc định); 'all'=mọi đơn
  dateField?: 'createdAt' | 'updatedAt'; // lọc theo ngày tạo (mặc định) hay ngày cập nhật
}

export default function RevenueStats({
  defaultPeriod = 'month',
  periods,
  scope = 'delivered',
  dateField = 'createdAt',
}: RevenueStatsProps) {
  const periodList = periods ? PERIODS.filter((p) => periods.includes(p.value)) : PERIODS;
  const [period, setPeriod] = useState(defaultPeriod);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<RevenueResp | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async (p: string, s?: string, e?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { period: p, scope, dateField };
      if (p === 'custom') {
        if (s) params.startDate = s;
        if (e) params.endDate = e;
      }
      const res = await apiClientClient.get<RevenueResp>('/admin/revenue-stats', { params });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom') fetchStats(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const dateRangeInvalid = Boolean(startDate && endDate && startDate > endDate);
  const applyCustom = () => {
    if (startDate && endDate && !dateRangeInvalid) fetchStats('custom', startDate, endDate);
  };

  return (
    <div className="mb-[22px] rounded-[14px] border border-[#eceef2] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-[15px] font-bold text-[#111827]">Doanh thu</div>
          <span className="ml-1 text-xs text-[#9ca3af]">(đơn giao thành công)</span>
        </div>
        <div className="text-[13px] text-[#6b7280]">
          {data?.label || PERIODS.find((p) => p.value === period)?.label}:{' '}
          <b className="text-[#059669]">{loading ? '…' : formatVndTight(data?.revenue)}</b>
        </div>
      </div>

      {/* Nút chọn kỳ */}
      <div className="mb-4 flex flex-wrap gap-2">
        {periodList.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={`rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-all ${
              period === p.value
                ? 'bg-[#2563eb] text-white shadow-[0_1px_2px_rgba(37,99,235,.3)]'
                : 'border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Khoảng tùy chọn */}
      {period === 'custom' && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-[#f7f9fc] p-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!startDate || !endDate || dateRangeInvalid}
            className="flex items-center gap-2 rounded-[10px] bg-[#2563eb] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <CalendarRange className="h-4 w-4" /> Xem
          </button>
          {dateRangeInvalid && (
            <span className="text-xs text-[#dc2626]">&quot;Từ ngày&quot; phải ≤ &quot;Đến ngày&quot;.</span>
          )}
        </div>
      )}

      {/* Kết quả */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <div className="text-xs font-medium text-[#9ca3af]">
            {data?.label || PERIODS.find((p) => p.value === period)?.label}
          </div>
          <div className="text-[24px] font-extrabold tracking-[-0.5px] text-[#059669]">
            {loading ? (
              <span className="text-gray-300">Đang tính...</span>
            ) : (
              formatVndTight(data?.revenue)
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-[#9ca3af]">Số đơn</div>
          <div className="text-2xl font-bold text-[#111827]">
            {loading ? '—' : formatNumber(data?.orderCount)}
          </div>
        </div>
      </div>
    </div>
  );
}

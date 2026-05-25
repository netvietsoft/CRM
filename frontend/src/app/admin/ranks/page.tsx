export const dynamic = 'force-dynamic';

import RankConfigEditor from '@/components/admin/RankConfigEditor';
import { apiClient } from '@/lib/apiClient';

interface RankConfig {
  id: string;
  rank: string;
  minTotalSpent: number;
  minOrdersMonth?: number | null;
  discountPercent?: number | null;
  description?: string | null;
}

interface RankConfigResponse {
  configs: RankConfig[];
}

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function AdminRanksPage() {
  let configs: RankConfig[] = [];

  try {
    const response = await apiClient.get<RankConfigResponse>('/rank-config');
    configs = response.configs;
  } catch (error) {
    console.error('Error fetching rank configs:', error);
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Phân hạng khách hàng</h1>
        <p className="text-gray-600 text-sm">Cấu hình mốc chi tiêu để backend tự động xếp hạng người dùng</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {configs.map((config) => (
          <div key={config.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{config.rank}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{fmt(config.minTotalSpent)}</div>
            <div className="mt-1 text-sm text-gray-500">
              {config.discountPercent ? `${config.discountPercent}% ưu đãi gợi ý` : 'Chưa cấu hình ưu đãi riêng'}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {configs.map((config) => (
          <RankConfigEditor key={config.id} {...config} />
        ))}
      </div>
    </>
  );
}

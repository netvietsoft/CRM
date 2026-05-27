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

const rankCardClassMap: Record<string, string> = {
  MEMBER: 'border-slate-300 bg-slate-50 shadow-slate-200/70',
  SILVER: 'border-slate-400 bg-slate-100 shadow-slate-300/70',
  GOLD: 'border-amber-300 bg-amber-50 shadow-amber-200/70',
  DIAMOND: 'border-cyan-300 bg-cyan-50 shadow-cyan-200/70',
  PLATINUM: 'border-fuchsia-300 bg-fuchsia-50 shadow-fuchsia-200/70',
};

const rankTextClassMap: Record<string, string> = {
  MEMBER: 'text-slate-700',
  SILVER: 'text-slate-900',
  GOLD: 'text-amber-900',
  DIAMOND: 'text-cyan-900',
  PLATINUM: 'text-fuchsia-900',
};

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
          <div key={config.id} className={`rounded-2xl border p-5 shadow-sm ${rankCardClassMap[config.rank] || 'border-gray-200 bg-white shadow-gray-200/70'}`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${rankTextClassMap[config.rank] || 'text-gray-500'}`}>{config.rank}</div>
            <div className={`mt-2 text-2xl font-bold ${rankTextClassMap[config.rank] || 'text-gray-900'}`}>{fmt(config.minTotalSpent)}</div>
            <div className={`mt-1 text-sm ${config.rank === 'SILVER' ? 'text-slate-700' : 'text-gray-600'}`}>
              {config.discountPercent ? `${config.discountPercent}% ưu đãi gợi ý` : 'Chưa cấu hình ưu đãi riêng'}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {configs.map((config) => (
          <RankConfigEditor
            key={`${config.id}-${config.minTotalSpent}-${config.minOrdersMonth ?? ''}-${config.discountPercent ?? ''}-${config.description ?? ''}`}
            {...config}
          />
        ))}
      </div>
    </>
  );
}

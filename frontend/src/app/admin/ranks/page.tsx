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

export default async function AdminRanksPage() {
  let configs: RankConfig[] = [];

  try {
    const response = await apiClient.get<RankConfigResponse>('/rank-config');
    configs = response.configs;
  } catch (error) {
    console.error('Error fetching rank configs:', error);
  }

  return (
    <div className="font-[Inter,sans-serif]">
      <div className="mb-5">
        <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-[#111827]">Phân hạng khách hàng</h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">Ngưỡng chi tiêu và quyền lợi từng hạng · tự động nâng hạng khi đạt ngưỡng</p>
      </div>

      <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
        {configs.map((config) => (
          <RankConfigEditor
            key={`${config.id}-${config.minTotalSpent}-${config.minOrdersMonth ?? ''}-${config.discountPercent ?? ''}-${config.description ?? ''}`}
            {...config}
          />
        ))}
      </div>
    </div>
  );
}

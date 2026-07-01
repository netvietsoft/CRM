'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Card, StatCard, MockBadge } from '@/components/ccm/ui';

export default function StatsAds() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-800">Quảng cáo</h1><MockBadge /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="💸" label="Chi tiêu" value="—" />
        <StatCard icon="👁️" label="Hiển thị" value="—" />
        <StatCard icon="🖱️" label="Click" value="—" />
        <StatCard icon="🎯" label="Kết quả" value="—" />
      </div>
      <Card title="Meta Ads" subtitle="Module quảng cáo đã có sẵn trong CRM">
        <p className="text-sm text-gray-600 mb-3">Thống kê quảng cáo Meta (tài khoản, chiến dịch, chỉ số) đã được xây dựng đầy đủ trong CRM.</p>
        <Link href="/admin/adsmeta/accall" className="inline-block px-4 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium">Mở Meta Ads →</Link>
      </Card>
    </div>
  );
}

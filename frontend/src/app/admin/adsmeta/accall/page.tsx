'use client';
export const dynamic = 'force-dynamic';

import AdsAccountsList from '@/components/admin/AdsAccountsList';

// Tất cả tài khoản quảng cáo Meta — bảng danh sách; click 1 dòng mở dashboard tài khoản.
export default function AdsAllAccountsPage() {
  return <AdsAccountsList />;
}

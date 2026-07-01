import SubNav from '@/components/ccm/SubNav';

const ITEMS = [
  { href: '/ccm/stats', label: 'Tổng quan', icon: '📈' },
  { href: '/ccm/stats/pages', label: 'Trang', icon: '🚩' },
  { href: '/ccm/stats/staff', label: 'Nhân viên', icon: '👥' },
  { href: '/ccm/stats/interactions', label: 'Tương tác', icon: '💬' },
  { href: '/ccm/stats/tags', label: 'Thẻ hội thoại', icon: '🏷️' },
  { href: '/ccm/stats/callcenter', label: 'Tổng đài', icon: '📞' },
  { href: '/ccm/stats/ads', label: 'Quảng cáo', icon: '📣' },
  { href: '/ccm/stats/reviews', label: 'Đánh giá', icon: '⭐' },
  { href: '/ccm/stats/backup', label: 'Sao lưu', icon: '🕐' },
];

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex">
      <SubNav title="Thống kê" items={ITEMS} />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

import SubNav from '@/components/pancake/SubNav';

const ITEMS = [
  { href: '/pancake/stats', label: 'Tổng quan', icon: '📈' },
  { href: '/pancake/stats/pages', label: 'Trang', icon: '🚩' },
  { href: '/pancake/stats/staff', label: 'Nhân viên', icon: '👥' },
  { href: '/pancake/stats/interactions', label: 'Tương tác', icon: '💬' },
  { href: '/pancake/stats/tags', label: 'Thẻ hội thoại', icon: '🏷️' },
  { href: '/pancake/stats/callcenter', label: 'Tổng đài', icon: '📞' },
  { href: '/pancake/stats/ads', label: 'Quảng cáo', icon: '📣' },
  { href: '/pancake/stats/reviews', label: 'Đánh giá', icon: '⭐' },
  { href: '/pancake/stats/backup', label: 'Sao lưu', icon: '🕐' },
];

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex">
      <SubNav title="Thống kê" items={ITEMS} />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

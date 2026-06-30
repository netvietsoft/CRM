import SubNav from '@/components/pancake/SubNav';

const ITEMS = [
  { href: '/pancake/settings', label: 'Cài đặt chung', icon: '⚙️' },
  { href: '/pancake/settings/tags', label: 'Thẻ hội thoại', icon: '🏷️' },
  { href: '/pancake/settings/ai', label: 'Trợ lý AI', icon: '✨' },
  { href: '/pancake/settings/quick-reply', label: 'Hỗ trợ trả lời', icon: '💬' },
  { href: '/pancake/settings/interface', label: 'Giao diện', icon: '🖥️' },
  { href: '/pancake/settings/calls', label: 'Cuộc gọi', icon: '📞' },
  { href: '/pancake/settings/rotation', label: 'Chế độ xoay vòng', icon: '🔄' },
  { href: '/pancake/settings/sync', label: 'Đồng bộ', icon: '☁️' },
  { href: '/pancake/settings/tools', label: 'Công cụ', icon: '🔧' },
  { href: '/pancake/settings/permissions', label: 'Phân quyền', icon: '🧑‍💼' },
  { href: '/pancake/settings/history', label: 'Lịch sử', icon: '🕐' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex">
      <SubNav title="Cài đặt" items={ITEMS} />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

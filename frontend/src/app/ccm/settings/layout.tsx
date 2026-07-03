import SubNav from '@/components/ccm/SubNav';

const ITEMS = [
  { href: '/ccm/settings', label: 'Cài đặt chung', icon: '⚙️' },
  { href: '/ccm/settings/tags', label: 'Thẻ hội thoại', icon: '🏷️' },
  { href: '/ccm/settings/ai', label: 'Trợ lý AI', icon: '✨' },
  { href: '/ccm/settings/quick-reply', label: 'Hỗ trợ trả lời', icon: '💬' },
  { href: '/ccm/settings/shipping', label: 'Vận chuyển (ĐVVC)', icon: '🚚' },
  { href: '/ccm/settings/interface', label: 'Giao diện', icon: '🖥️' },
  { href: '/ccm/settings/calls', label: 'Cuộc gọi', icon: '📞' },
  { href: '/ccm/settings/rotation', label: 'Chế độ xoay vòng', icon: '🔄' },
  { href: '/ccm/settings/sync', label: 'Đồng bộ', icon: '☁️' },
  { href: '/ccm/settings/tools', label: 'Công cụ', icon: '🔧' },
  { href: '/ccm/settings/permissions', label: 'Phân quyền', icon: '🧑‍💼' },
  { href: '/ccm/settings/history', label: 'Lịch sử', icon: '🕐' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex">
      <SubNav title="Cài đặt" items={ITEMS} />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { SettingSection, SettingRow, Toggle, MockBadge } from '@/components/ccm/ui';

const Dropdown = ({ value }: { value: string }) => (
  <span className="inline-flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700">{value} ▾</span>
);

export default function SettingsGeneral() {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-5"><h1 className="text-2xl font-bold text-gray-800">Cài đặt chung</h1><MockBadge /></div>

      <SettingSection title="Thông báo và hội thoại">
        <SettingRow icon="🔔" title="Âm thanh và thông báo" desc="Thông báo qua trình duyệt khi có tin nhắn mới hoặc bình luận mới" control={<Toggle on />} />
        <SettingRow title="Phát âm thanh khi có hội thoại mới" control={<Dropdown value="Mặc định" />} />
        <SettingRow icon="🗨️" title="Hội thoại" desc="Đẩy những hội thoại chưa đọc lên đầu danh sách" control={<Toggle on />} />
        <SettingRow title="Chuyển nhanh sang tin nhắn chưa đọc kế tiếp" control={<Dropdown value="Tắt" />} />
        <SettingRow icon="✉️" title="Tác vụ trong hội thoại" desc="Mỗi khi có tin nhắn mới, tác vụ sẽ tự động được mở lại" control={<Dropdown value="Tự động mở tác vụ" />} />
        <SettingRow icon="🖼️" title="Cách gửi tin nhắn chứa nhiều ảnh" desc="Gộp các ảnh thành một nhóm rồi gửi tới người nhận" control={<Dropdown value="Gửi nhóm ảnh" />} />
      </SettingSection>

      <SettingSection title="Tính năng tự động">
        <SettingRow icon="🙈" title="Tự động ẩn bình luận" desc="Ẩn bình luận các bài viết (ngoại trừ bình luận cấu hình ở mục Bài viết)" control={<Dropdown value="Ẩn tất cả" />} />
        <SettingRow title="Bình luận đã ẩn sẽ được hiển thị lại ở bài viết sau" control={<Dropdown value="Tắt" />} />
        <SettingRow title="Ẩn tất cả các bình luận Spam" control={<Toggle />} />
        <SettingRow icon="@" title="Tự động bỏ qua bình luận tag bạn bè" desc="Bỏ qua nếu tin nhắn mới là bình luận khách hàng tag bạn bè" control={<Toggle />} />
        <SettingRow icon="✓✓" title="Tự động bỏ qua tin nhắn mới là sticker" control={<Toggle />} />
      </SettingSection>
    </div>
  );
}

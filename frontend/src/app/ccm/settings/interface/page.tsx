'use client';
export const dynamic = 'force-dynamic';

/* /ccm/settings/interface — GIAO DIỆN (tuỳ chọn hiển thị danh sách hội thoại THẬT).
 * Lưu ở store useCcmSettings (localStorage). Danh sách hội thoại (CcmConversations) đọc live. */

import { useCcmSettings } from '@/lib/useCcmSettings';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-[#3b5bdb]' : 'bg-gray-300'}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}
function Row({ icon, title, desc, on, onClick }: { icon: string; title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex gap-3">
        <span className="text-gray-400 text-lg">{icon}</span>
        <div>
          <div className="font-medium text-gray-800">{title}</div>
          <div className="text-sm text-gray-500">{desc}</div>
        </div>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}

export default function InterfaceSettings() {
  const { prefs, setPrefs } = useCcmSettings();
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Giao diện</h1>
        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#3b5bdb]">nối vào chat</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">Tuỳ chỉnh cách hiển thị danh sách hội thoại. Thay đổi áp dụng ngay ở khung chat.</p>

      <div className="bg-white rounded-2xl border border-gray-200 px-5">
        <Row icon="👤" title="Hiển thị nhân viên phụ trách" desc="Hiện chip nhân viên đang xử lý ở mỗi dòng hội thoại"
          on={prefs.showAssignee} onClick={() => setPrefs({ ...prefs, showAssignee: !prefs.showAssignee })} />
        <Row icon="📞" title="Hiển thị số điện thoại khách" desc="Hiện SĐT (nếu có) cạnh tên khách ở danh sách"
          on={prefs.showPhone} onClick={() => setPrefs({ ...prefs, showPhone: !prefs.showPhone })} />
        <Row icon="🏷️" title="Hiển thị đầy đủ tên thẻ" desc="Tắt để rút gọn tên nhãn cho gọn danh sách"
          on={prefs.fullTagName} onClick={() => setPrefs({ ...prefs, fullTagName: !prefs.fullTagName })} />
      </div>
    </div>
  );
}

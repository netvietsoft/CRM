'use client';
export const dynamic = 'force-dynamic';

/* /ccm/settings/interface — GIAO DIỆN (tuỳ chọn hiển thị danh sách hội thoại THẬT).
 * Lưu ở store useCcmSettings (localStorage). Danh sách hội thoại (CcmConversations) đọc live. */

import { useCcmSettings } from '@/lib/useCcmSettings';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick}
      className={`relative inline-flex h-[25px] w-11 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-[#3c55e6]' : 'bg-[#d1d5db]'}`}>
      <span className="inline-block h-[21px] w-[21px] rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(21px)' : 'translateX(2px)' }} />
    </button>
  );
}
function Row({ icon, title, desc, on, onClick }: { icon: string; title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center gap-[14px] py-4 border-b border-[#f1f5f9] last:border-0">
      <span className="text-[18px]">{icon}</span>
      <div className="flex-1">
        <div className="text-[15px] font-bold text-gray-900">{title}</div>
        <div className="text-[13px] text-[#6b7280] mt-0.5">{desc}</div>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}

export default function InterfaceSettings() {
  const { prefs, setPrefs } = useCcmSettings();
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="text-2xl font-extrabold tracking-[-0.4px]">Giao diện</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11.5px] font-bold bg-[#e8ecff] text-[#3c55e6]">nối vào chat</span>
      </div>
      <p className="mt-[7px] mb-[18px] text-[13.5px] text-[#6b7280]">Tuỳ chỉnh cách hiển thị danh sách hội thoại. Thay đổi áp dụng ngay ở khung chat.</p>

      <div className="bg-white rounded-2xl border border-[#e6e9f2] px-[22px] py-2 max-w-[900px]">
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

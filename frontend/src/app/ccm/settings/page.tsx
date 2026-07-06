'use client';
export const dynamic = 'force-dynamic';

/* /ccm/settings — CÀI ĐẶT CHUNG.
 * Mục "Âm thanh & thông báo" là THẬT: bật/tắt + chọn âm (tổng hợp Web Audio) + nghe thử.
 * Lưu ở store useCcmSettings; khu chat (useMessengerChat) phát âm khi có tin/hội thoại mới. */

import { useCcmSettings } from '@/lib/useCcmSettings';
import { SOUNDS, playSound } from '@/lib/ccmSounds';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick}
      className={`relative inline-flex h-[25px] w-11 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-[#3c55e6]' : 'bg-[#d1d5db]'}`}>
      <span className="inline-block h-[21px] w-[21px] rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(21px)' : 'translateX(2px)' }} />
    </button>
  );
}

// 1 hàng chọn âm: dropdown SOUNDS + nút nghe thử.
function SoundRow({ title, desc, value, onChange, disabled }: { title: string; desc: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-4 border-b border-[#f1f5f9] last:border-0 flex-wrap ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-[220px]">
        <div className="text-[15px] font-bold text-gray-900">{title}</div>
        <div className="text-[13px] text-[#6b7280] mt-0.5">{desc}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="px-3 py-[9px] border border-[#e5e7eb] rounded-[10px] text-[13px] bg-white">
          {SOUNDS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button disabled={disabled} onClick={() => playSound(value)} className="px-[14px] py-[9px] rounded-[10px] border border-[#e5e7eb] bg-white text-[13px] font-bold hover:bg-[#f9fafb] disabled:cursor-not-allowed">▶ Nghe thử</button>
      </div>
    </div>
  );
}

export default function SettingsGeneral() {
  const { prefs, setPrefs } = useCcmSettings();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-[-0.4px] mb-[18px]">Cài đặt chung</h1>

      {/* ÂM THANH & THÔNG BÁO — thật */}
      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-[22px] max-w-[900px] mb-4">
        <div className="flex items-center gap-2.5 mb-[18px]">
          <h2 className="text-[17px] font-extrabold">Âm thanh & thông báo</h2>
          <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#d1fae5] text-[#047857]">hoạt động</span>
        </div>
        <div className="flex items-center gap-3 pb-[18px] border-b border-[#f1f5f9]">
          <span className="text-[19px]">🔔</span>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-gray-900">Bật âm thông báo</div>
            <div className="text-[13px] text-[#6b7280] mt-0.5">Phát âm khi có tin nhắn / hội thoại mới trong khu chat</div>
          </div>
          <Toggle on={prefs.sound} onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })} />
        </div>

        <SoundRow title="Âm khi có tin nhắn mới" desc="Phát mỗi khi nhận tin nhắn realtime" disabled={!prefs.sound}
          value={prefs.newMsgSound} onChange={(v) => { setPrefs({ ...prefs, newMsgSound: v }); playSound(v); }} />
        <SoundRow title="Âm khi có hội thoại mới" desc="Phát khi xuất hiện khách/hội thoại mới" disabled={!prefs.sound}
          value={prefs.newConvSound} onChange={(v) => { setPrefs({ ...prefs, newConvSound: v }); playSound(v); }} />

        <p className="text-[12.5px] text-[#94a3b8] leading-[1.6] border-t border-[#f1f5f9] pt-[14px]">Âm được tổng hợp trực tiếp trong trình duyệt (không cần tệp), lưu theo trình duyệt này. Lần đầu có thể cần bấm 1 lần để trình duyệt cho phép phát âm.</p>
      </div>

      {/* Các mục khác (template) */}
      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-[22px] max-w-[900px]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <h2 className="text-[17px] font-extrabold">Hội thoại & tự động</h2>
          <span className="px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e]">template</span>
        </div>
        <div className="text-[14px] text-[#374151] leading-[1.6]">Đẩy hội thoại chưa đọc lên đầu · Tự động ẩn bình luận spam · Bỏ qua tin sticker… (đang là mẫu, sẽ nối sau).</div>
        <div className="text-[13px] text-[#94a3b8] mt-2">Các tuỳ chọn tự động hoá cần cấu hình phía backend.</div>
      </div>
    </div>
  );
}

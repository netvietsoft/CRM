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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-[#3b5bdb]' : 'bg-gray-300'}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// 1 hàng chọn âm: dropdown SOUNDS + nút nghe thử.
function SoundRow({ title, desc, value, onChange, disabled }: { title: string; desc: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-4 border-b border-gray-100 last:border-0 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <div className="font-medium text-gray-800">{title}</div>
        <div className="text-sm text-gray-500">{desc}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
          {SOUNDS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button disabled={disabled} onClick={() => playSound(value)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:cursor-not-allowed">▶ Nghe thử</button>
      </div>
    </div>
  );
}

export default function SettingsGeneral() {
  const { prefs, setPrefs } = useCcmSettings();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Cài đặt chung</h1>

      {/* ÂM THANH & THÔNG BÁO — thật */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-bold text-gray-800">Âm thanh & thông báo</h2>
          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#3b5bdb]">hoạt động</span>
        </div>
        <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-100">
          <div className="flex gap-3">
            <span className="text-gray-400 text-lg">🔔</span>
            <div>
              <div className="font-medium text-gray-800">Bật âm thông báo</div>
              <div className="text-sm text-gray-500">Phát âm khi có tin nhắn / hội thoại mới trong khu chat</div>
            </div>
          </div>
          <Toggle on={prefs.sound} onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })} />
        </div>

        <SoundRow title="Âm khi có tin nhắn mới" desc="Phát mỗi khi nhận tin nhắn realtime" disabled={!prefs.sound}
          value={prefs.newMsgSound} onChange={(v) => { setPrefs({ ...prefs, newMsgSound: v }); playSound(v); }} />
        <SoundRow title="Âm khi có hội thoại mới" desc="Phát khi xuất hiện khách/hội thoại mới" disabled={!prefs.sound}
          value={prefs.newConvSound} onChange={(v) => { setPrefs({ ...prefs, newConvSound: v }); playSound(v); }} />

        <p className="text-xs text-gray-400 pt-3">Âm được tổng hợp trực tiếp trong trình duyệt (không cần tệp), lưu theo trình duyệt này. Lần đầu có thể cần bấm 1 lần để trình duyệt cho phép phát âm.</p>
      </div>

      {/* Các mục khác (template) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 opacity-90">
        <div className="flex items-center gap-2 mb-1"><h2 className="font-bold text-gray-800">Hội thoại & tự động</h2><span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">template</span></div>
        <div className="text-sm text-gray-500 py-2 border-b border-gray-100">Đẩy hội thoại chưa đọc lên đầu · Tự động ẩn bình luận spam · Bỏ qua tin sticker… (đang là mẫu, sẽ nối sau).</div>
        <div className="text-sm text-gray-400 pt-2">Các tuỳ chọn tự động hoá cần cấu hình phía backend.</div>
      </div>
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

/* /ccm/settings/tags — THẺ HỘI THOẠI (danh mục thẻ THẬT).
 * Lưu ở store useCcmSettings (localStorage). Khung chat đọc danh mục này cho:
 *   - Picker "Nhãn" ở header hội thoại (🏷️) → gắn nhãn cho hội thoại.
 *   - Màu chip nhãn ở danh sách hội thoại.
 * Đây là "kết nối" Cài đặt ↔ Chat. */

import { useState } from 'react';
import { useCcmSettings, newId, type TagDef } from '@/lib/useCcmSettings';

const PALETTE = ['#475569', '#7c3aed', '#2563eb', '#16a34a', '#0ea5e9', '#dc2626', '#f59e0b', '#db2777', '#0d9488', '#334155'];

export default function TagsSettings() {
  const { tags, setTags } = useCcmSettings();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[2]);

  const add = () => {
    if (!name.trim()) return;
    setTags([...tags, { id: newId(), name: name.trim(), color }]);
    setName(''); setColor(PALETTE[2]);
  };
  const update = (id: string, patch: Partial<TagDef>) => setTags(tags.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => setTags(tags.filter((t) => t.id !== id));

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="text-2xl font-extrabold tracking-[-0.4px]">Thẻ hội thoại</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11.5px] font-bold bg-[#e8ecff] text-[#3c55e6]">nối vào chat</span>
      </div>
      <p className="mt-[7px] mb-[18px] text-[13.5px] text-[#6b7280]">Danh mục thẻ dùng để phân loại hội thoại. Ở khung chat bấm 🏷️ trên đầu hội thoại để gắn các thẻ này.</p>

      <div className="bg-white border border-[#e6e9f2] rounded-2xl p-[22px] max-w-[1000px]">
        {/* Thêm thẻ */}
        <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nhập tên thẻ mới rồi bấm Thêm (hoặc Enter)…" className="flex-1 min-w-[220px] px-[14px] py-[11px] border border-[#e5e7eb] rounded-[11px] text-[13.5px] outline-none focus:border-[#3c55e6]" />
          <div className="flex gap-[5px] flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} title="Chọn màu thẻ" onClick={() => setColor(c)} className={`w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ background: c }} />
            ))}
          </div>
          <button onClick={add} disabled={!name.trim()} title={name.trim() ? 'Thêm thẻ' : 'Nhập tên thẻ trước'}
            className="px-[18px] py-[11px] rounded-[11px] bg-[#8ea2f5] text-white text-[13px] font-bold hover:bg-[#4f68ee] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#8ea2f5]">＋ Thêm thẻ</button>
        </div>
        <div className="text-[12.5px] text-[#94a3b8] mb-4">Gõ tên → chọn màu → <b>Thêm thẻ</b>. Thẻ mới hiện ngay bên dưới và dùng được ở khung chat.</div>

        {/* Danh sách thẻ */}
        <div className="grid grid-cols-[44px_1fr_2fr_60px] bg-[#f8fafc] rounded-[10px] px-[14px] py-[9px] text-[12px] font-bold text-[#6b7280]">
          <span>STT</span><span>Tên thẻ</span><span>Màu</span><span></span>
        </div>
        {tags.length === 0 && <div className="px-[14px] py-6 text-center text-gray-400 text-sm">Chưa có thẻ nào.</div>}
        {tags.map((t, i) => (
          <div key={t.id} className="grid grid-cols-[44px_1fr_2fr_60px] items-center px-[14px] py-[11px] border-b border-[#f1f5f9]">
            <span className="text-[#9ca3af] text-[13px]">{i + 1}</span>
            <span className="flex items-center gap-[9px] text-[14px] font-semibold">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
              <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} className="border border-transparent hover:border-gray-200 focus:border-gray-300 rounded px-1 py-0.5 text-gray-900 outline-none min-w-0" />
            </span>
            <span className="flex gap-[5px] flex-wrap">
              {PALETTE.map((c) => <button key={c} onClick={() => update(t.id, { color: c })} className={`w-5 h-5 rounded-full ${t.color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ background: c }} />)}
            </span>
            <a onClick={() => remove(t.id)} className="text-[#dc2626] text-[13px] font-semibold cursor-pointer">Xoá</a>
          </div>
        ))}
        <div className="text-[12.5px] text-[#94a3b8] mt-3">{tags.length} thẻ · lưu trên trình duyệt này.</div>
      </div>
    </div>
  );
}

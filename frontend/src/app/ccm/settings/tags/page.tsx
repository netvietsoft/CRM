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
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Thẻ hội thoại</h1>
        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#3b5bdb]">nối vào chat</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">Danh mục thẻ dùng để phân loại hội thoại. Ở khung chat bấm 🏷️ trên đầu hội thoại để gắn các thẻ này.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        {/* Thêm thẻ */}
        <div className="flex items-center gap-2 mb-1">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nhập tên thẻ mới rồi bấm Thêm (hoặc Enter)…" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
          <div className="flex items-center gap-1">
            {PALETTE.map((c) => (
              <button key={c} title="Chọn màu thẻ" onClick={() => setColor(c)} className={`w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ background: c }} />
            ))}
          </div>
          <button onClick={add} disabled={!name.trim()} title={name.trim() ? 'Thêm thẻ' : 'Nhập tên thẻ trước'}
            className="px-4 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">＋ Thêm thẻ</button>
        </div>
        <div className="text-xs text-gray-400 mb-3">Gõ tên → chọn màu → <b>Thêm thẻ</b>. Thẻ mới hiện ngay bên dưới và dùng được ở khung chat.</div>

        {/* Danh sách thẻ */}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2 font-medium w-12">STT</th>
              <th className="px-3 py-2 font-medium">Tên thẻ</th>
              <th className="px-3 py-2 font-medium">Màu</th>
              <th className="px-3 py-2 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tags.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Chưa có thẻ nào.</td></tr>}
            {tags.map((t, i) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                    <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} className="border border-transparent hover:border-gray-200 focus:border-gray-300 rounded px-1 py-0.5 text-gray-800 outline-none" />
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {PALETTE.map((c) => <button key={c} onClick={() => update(t.id, { color: c })} className={`w-5 h-5 rounded-full ${t.color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ background: c }} />)}
                  </div>
                </td>
                <td className="px-3 py-2"><button onClick={() => remove(t.id)} className="text-red-500 text-xs hover:underline">Xoá</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs text-gray-400 mt-3">{tags.length} thẻ · lưu trên trình duyệt này.</div>
      </div>
    </div>
  );
}

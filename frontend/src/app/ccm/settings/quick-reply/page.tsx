'use client';
export const dynamic = 'force-dynamic';

/* /ccm/settings/quick-reply — HỖ TRỢ TRẢ LỜI (editor đầy đủ kiểu Pancake).
 * Cấu trúc: Chủ đề (từ catalog Thẻ) → Câu trả lời nhanh (ký tự tắt) → NHIỀU Nội dung.
 * Mỗi Nội dung = text (kèm biến #{...}) + ảnh (thư viện) + file + emoji + sản phẩm.
 * Lưu store useCcmSettings (localStorage); composer chat đọc & chèn. */

import { useState } from 'react';
import { useCcmSettings, newId, type QuickReply, type QRContent } from '@/lib/useCcmSettings';
import { apiClientClient } from '@/lib/apiClientClient';
import { uploadToR2, folderOf } from '@/lib/uploadR2';
import CcmImagePicker from '@/components/ccm/CcmImagePicker';

// Biến chèn (thông tin user/nhân viên/hệ thống) — giống Pancake.
const VARIABLES = ['#{FULL_NAME}', '#{FIRST_NAME}', '#{LAST_NAME}', '#SEX{MALE | FEMALE | UNKNOWN}', '#{PAGE_NAME}', '#{SPIN_1 | SPIN_2}', '#{STAFF_NAME}', '#{STAFF_FIRST_NAME}', '#{STAFF_LAST_NAME}', '#{STAFF_DETAILS}', '#{TODAY(DD/MM/YYYY)}'];
const EMOJIS = ['😊', '😂', '❤️', '👍', '🙏', '😍', '🥰', '😢', '🎉', '✅', '🔥', '😉', '🤝', '💯', '👌', '😅'];
const emptyContent = (): QRContent => ({ id: newId(), text: '', images: [], files: [] });

interface ProductHit { id: string; name: string; imageUrl: string | null; salePrice: number | null; originalPrice: number | null }

export default function QuickReplySettings() {
  const { quickReplies, setQuickReplies, tags } = useCcmSettings();
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [q, setQ] = useState('');

  const filtered = quickReplies.filter((r) => (r.key + r.topic + r.contents.map((c) => c.text).join(' ')).toLowerCase().includes(q.toLowerCase()));
  const tagColor = (name: string) => tags.find((t) => t.name === name)?.color;

  const save = (r: QuickReply) => {
    const exists = quickReplies.some((x) => x.id === r.id);
    setQuickReplies(exists ? quickReplies.map((x) => (x.id === r.id ? r : x)) : [...quickReplies, r]);
    setEditing(null);
  };
  const remove = (id: string) => setQuickReplies(quickReplies.filter((x) => x.id !== id));

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Hỗ trợ trả lời</h1>
        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#3b5bdb]">nối vào chat</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">Mẫu trả lời nhanh dùng ở khung chat (bấm ⚡). Mỗi mẫu thuộc 1 chủ đề, có ký tự tắt và nhiều nội dung (text/ảnh/file/emoji/sản phẩm/biến).</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Tìm mẫu (ký tự tắt / nội dung)" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
          <button onClick={() => setEditing({ id: newId(), key: '', topic: '', contents: [emptyContent()] })} className="px-4 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium">＋ Thêm mẫu</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-3 py-2 font-medium w-12">STT</th>
                <th className="px-3 py-2 font-medium">Ký tự tắt</th>
                <th className="px-3 py-2 font-medium">Chủ đề</th>
                <th className="px-3 py-2 font-medium">Tin nhắn</th>
                <th className="px-3 py-2 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Chưa có mẫu nào.</td></tr>}
              {filtered.map((r, i) => {
                const imgCount = r.contents.reduce((s, c) => s + c.images.length, 0);
                const preview = r.contents.map((c) => c.text).filter(Boolean).join(' · ');
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{r.key ? <span className="text-[#3b5bdb]">/{r.key}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2">{r.topic && <span className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ background: tagColor(r.topic) || '#64748b' }}>{r.topic}</span>}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-md truncate" title={preview}>
                      {imgCount > 0 && <span className="text-[10px] bg-gray-200 text-gray-600 rounded px-1 mr-1">🖼️{imgCount}</span>}
                      {preview || <span className="text-gray-300">(chỉ ảnh)</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button onClick={() => setEditing(r)} className="text-[#3b5bdb] text-xs hover:underline mr-2">Sửa</button>
                      <button onClick={() => remove(r.id)} className="text-red-500 text-xs hover:underline">Xoá</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-3">Tổng {quickReplies.length} mẫu · lưu trên trình duyệt này.</div>
      </div>

      {editing && <QuickReplyEditor value={editing} tags={tags} onClose={() => setEditing(null)} onSave={save} isNew={!quickReplies.some((x) => x.id === editing.id)} />}
    </div>
  );
}

/* ---------- Modal editor "Thêm/Sửa câu trả lời nhanh" ---------- */
function QuickReplyEditor({ value, tags, onClose, onSave, isNew }: {
  value: QuickReply; tags: { id: string; name: string; color: string }[]; onClose: () => void; onSave: (r: QuickReply) => void; isNew: boolean;
}) {
  const [qr, setQr] = useState<QuickReply>(value);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [imgTarget, setImgTarget] = useState<string | null>(null); // contentId đang thêm ảnh
  const [menu, setMenu] = useState<{ cid: string; kind: 'emoji' | 'var' | 'product' } | null>(null);
  const [pq, setPq] = useState(''); const [hits, setHits] = useState<ProductHit[]>([]);

  const totalImages = qr.contents.reduce((s, c) => s + c.images.length, 0);

  const patchContent = (cid: string, patch: Partial<QRContent>) => setQr((p) => ({ ...p, contents: p.contents.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  const appendText = (cid: string, t: string) => setQr((p) => ({ ...p, contents: p.contents.map((c) => (c.id === cid ? { ...c, text: (c.text ? c.text + (c.text.endsWith(' ') ? '' : ' ') : '') + t } : c)) }));
  const addContent = () => { if (qr.contents.length >= 10) return; setQr((p) => ({ ...p, contents: [...p.contents, emptyContent()] })); };
  const delContent = (cid: string) => setQr((p) => ({ ...p, contents: p.contents.length > 1 ? p.contents.filter((c) => c.id !== cid) : p.contents }));
  const moveContent = (cid: string, dir: -1 | 1) => setQr((p) => {
    const i = p.contents.findIndex((c) => c.id === cid); const j = i + dir;
    if (j < 0 || j >= p.contents.length) return p;
    const arr = [...p.contents]; [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...p, contents: arr };
  });
  const toggleCollapse = (cid: string) => setCollapsed((s) => { const n = new Set(s); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });

  const searchProduct = async (v: string) => {
    setPq(v);
    if (!v.trim()) { setHits([]); return; }
    try { setHits(await apiClientClient.get<ProductHit[]>(`/products/search?q=${encodeURIComponent(v.trim())}`)); } catch { setHits([]); }
  };

  const ICON = 'w-7 h-7 grid place-items-center rounded hover:bg-gray-100 text-gray-500';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">{isNew ? 'Thêm câu trả lời nhanh' : 'Sửa câu trả lời nhanh'}</h3>
          <button title="Đóng" onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Chủ đề + Ký tự tắt */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Chủ đề</label>
              <select value={qr.topic} onChange={(e) => setQr({ ...qr, topic: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">Không có chủ đề</option>
                {tags.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Ký tự tắt</label>
              <div className="flex items-center mt-1 border border-gray-200 rounded-lg overflow-hidden">
                <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm">/</span>
                <input value={qr.key} onChange={(e) => setQr({ ...qr, key: e.target.value })} placeholder="Nhập kí tự" className="flex-1 px-2 py-2 text-sm outline-none" />
              </div>
            </div>
          </div>

          {/* Các Nội dung */}
          {qr.contents.map((c, idx) => {
            const isOpen = !collapsed.has(c.id);
            return (
              <div key={c.id} className="rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-gray-300 cursor-default" title="Kéo để sắp xếp (dùng ▲▼)">⠿</span>
                  <button onClick={() => toggleCollapse(c.id)} className="text-gray-500">{isOpen ? '▾' : '▸'}</button>
                  <span className="text-sm font-medium text-gray-700">Nội dung {idx + 1}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button title="Lên" onClick={() => moveContent(c.id, -1)} className="text-gray-400 hover:text-gray-700 text-xs">▲</button>
                    <button title="Xuống" onClick={() => moveContent(c.id, 1)} className="text-gray-400 hover:text-gray-700 text-xs">▼</button>
                    {qr.contents.length > 1 && <button title="Xoá nội dung" onClick={() => delContent(c.id)} className="text-red-400 hover:text-red-600 ml-1">🗑️</button>}
                  </div>
                </div>
                {isOpen && (
                  <div className="px-3 pb-3">
                    <div className="bg-white border border-gray-200 rounded-lg">
                      <textarea value={c.text} onChange={(e) => patchContent(c.id, { text: e.target.value })} placeholder="Nhập nội dung" rows={3}
                        className="w-full px-3 py-2 text-sm outline-none resize-y rounded-t-lg" />
                      {/* ảnh đã thêm */}
                      {(c.images.length > 0 || c.files.length > 0) && (
                        <div className="flex flex-wrap gap-2 px-3 pb-2">
                          {c.images.map((u) => (
                            <span key={u} className="relative">
                              <img src={u} alt="" className="w-14 h-14 object-cover rounded border border-gray-200" />
                              <button title="Bỏ ảnh" onClick={() => patchContent(c.id, { images: c.images.filter((x) => x !== u) })} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">✕</button>
                            </span>
                          ))}
                          {c.files.map((u) => (
                            <span key={u} className="inline-flex items-center gap-1 text-[11px] bg-gray-100 rounded px-2 py-1">📎 {u.split('/').pop()?.slice(0, 16) || 'file'}
                              <button title="Bỏ file" onClick={() => patchContent(c.id, { files: c.files.filter((x) => x !== u) })} className="text-red-400">✕</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* toolbar */}
                      <div className="flex items-center gap-1 px-2 py-1 border-t border-gray-100 relative">
                        <button title="Ảnh (thư viện)" className={ICON} onClick={() => setImgTarget(c.id)}>🖼️</button>
                        <label title="Video và Tài liệu (upload R2)" className={`${ICON} cursor-pointer`}>📎
                          <input type="file" accept="video/*,application/pdf,image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const { url } = await uploadToR2(f, folderOf(f)); patchContent(c.id, { files: [...c.files, url] }); } catch { /* bỏ qua nếu lỗi */ } }} />
                        </label>
                        <button title="Cảm xúc" className={ICON} onClick={() => setMenu(menu?.cid === c.id && menu.kind === 'emoji' ? null : { cid: c.id, kind: 'emoji' })}>😊</button>
                        <button title="Sản phẩm" className={ICON} onClick={() => { setPq(''); setHits([]); setMenu(menu?.cid === c.id && menu.kind === 'product' ? null : { cid: c.id, kind: 'product' }); }}>👕</button>
                        <button title="Chèn biến (thông tin user)" className={ICON} onClick={() => setMenu(menu?.cid === c.id && menu.kind === 'var' ? null : { cid: c.id, kind: 'var' })}>{'{}'}</button>

                        {menu?.cid === c.id && menu.kind === 'emoji' && (
                          <div className="absolute z-30 bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 w-64">
                            {EMOJIS.map((e) => <button key={e} onClick={() => { appendText(c.id, e); setMenu(null); }} className="hover:bg-gray-100 rounded p-1">{e}</button>)}
                          </div>
                        )}
                        {menu?.cid === c.id && menu.kind === 'var' && (
                          <div className="absolute z-30 bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-64 max-h-64 overflow-y-auto">
                            <div className="px-3 py-1 text-xs text-gray-400">Chèn thông tin</div>
                            {VARIABLES.map((v) => <button key={v} onClick={() => { appendText(c.id, v); setMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 font-mono text-gray-700">{v}</button>)}
                          </div>
                        )}
                        {menu?.cid === c.id && menu.kind === 'product' && (
                          <div className="absolute z-30 bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-72 max-h-72 overflow-y-auto">
                            <div className="px-3 pb-2"><input autoFocus value={pq} onChange={(e) => void searchProduct(e.target.value)} placeholder="🔍 Tìm sản phẩm" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none" /></div>
                            {hits.length === 0 && pq && <div className="px-3 py-2 text-xs text-gray-400">Không có kết quả.</div>}
                            {hits.map((p) => (
                              <button key={p.id} onClick={() => { appendText(c.id, `${p.name} - ${(p.salePrice ?? p.originalPrice ?? 0).toLocaleString('vi-VN')}đ`); setMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left">
                                <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0">{p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}</div>
                                <span className="flex-1 min-w-0"><span className="text-sm text-gray-800 truncate block">{p.name}</span><span className="text-xs text-gray-400">{(p.salePrice ?? p.originalPrice ?? 0).toLocaleString('vi-VN')}đ</span></span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex gap-2">
            <button onClick={addContent} disabled={qr.contents.length >= 10} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-[#3b5bdb] hover:bg-blue-50 disabled:opacity-50">＋ Thêm nội dung</button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">Tối đa 10 nội dung · {totalImages}/120 ảnh</span>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">Đóng</button>
            <button onClick={() => onSave(qr)} className="px-5 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium">Lưu mẫu</button>
          </div>
        </div>
      </div>

      {/* Thư viện ảnh cho nội dung đang chọn */}
      {imgTarget && (
        <CcmImagePicker onClose={() => setImgTarget(null)} onSend={(urls) => { patchContent(imgTarget, { images: [...(qr.contents.find((c) => c.id === imgTarget)?.images || []), ...urls] }); setImgTarget(null); }} />
      )}
    </div>
  );
}

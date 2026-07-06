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
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="text-2xl font-extrabold tracking-[-0.4px]">Hỗ trợ trả lời</h1>
        <span className="px-[11px] py-[3px] rounded-full text-[11.5px] font-bold bg-[#e8ecff] text-[#3c55e6]">nối vào chat</span>
      </div>
      <p className="mt-[7px] mb-[18px] text-[13.5px] text-[#6b7280]">Mẫu trả lời nhanh dùng ở khung chat (bấm ⚡). Mỗi mẫu thuộc 1 chủ đề, có ký tự tắt và nhiều nội dung (text/ảnh/file/emoji/sản phẩm/biến).</p>

      <div className="bg-white rounded-2xl border border-[#e6e9f2] p-5 max-w-[1100px]">
        <div className="flex items-center gap-2.5 mb-[14px] flex-wrap">
          <div className="flex-1 min-w-[240px] flex items-center gap-2 border border-[#e5e7eb] rounded-[11px] px-[13px] py-2.5 text-[#9ca3af]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mẫu (ký tự tắt / nội dung)" className="flex-1 border-none outline-none text-[13.5px] bg-transparent min-w-0 text-[#111827]" />
          </div>
          <button onClick={() => setEditing({ id: newId(), key: '', topic: '', contents: [emptyContent()] })} className="px-[18px] py-2.5 rounded-[11px] bg-[#4f68ee] text-white text-[13.5px] font-bold hover:bg-[#3c55e6]">＋ Thêm mẫu</button>
        </div>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-[44px_110px_130px_1fr_90px] bg-[#f8fafc] rounded-[10px] px-[14px] py-[9px] text-[12px] font-bold text-[#6b7280]">
            <span>STT</span><span>Ký tự tắt</span><span>Chủ đề</span><span>Tin nhắn</span><span></span>
          </div>
          {filtered.length === 0 && <div className="px-[14px] py-6 text-center text-gray-400 text-sm">Chưa có mẫu nào.</div>}
          {filtered.map((r, i) => {
            const imgCount = r.contents.reduce((s, c) => s + c.images.length, 0);
            const preview = r.contents.map((c) => c.text).filter(Boolean).join(' · ');
            return (
              <div key={r.id} className="grid grid-cols-[44px_110px_130px_1fr_90px] items-center px-[14px] py-[11px] border-b border-[#f1f5f9]">
                <span className="text-[#9ca3af] text-[13px]">{i + 1}</span>
                <span className="font-mono text-[12.5px] font-semibold text-[#3c55e6]">{r.key ? `/${r.key}` : <span className="text-gray-300">—</span>}</span>
                <span>{r.topic && <span className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ background: tagColor(r.topic) || '#64748b' }}>{r.topic}</span>}</span>
                <span className="text-[13.5px] text-[#374151] overflow-hidden text-ellipsis whitespace-nowrap pr-3" title={preview}>
                  {imgCount > 0 && <span className="text-[10px] bg-gray-200 text-gray-600 rounded px-1 mr-1">🖼️{imgCount}</span>}
                  {preview || <span className="text-gray-300">(chỉ ảnh)</span>}
                </span>
                <span className="flex gap-3">
                  <a onClick={() => setEditing(r)} className="text-[#3c55e6] text-[13px] font-semibold cursor-pointer">Sửa</a>
                  <a onClick={() => remove(r.id)} className="text-[#dc2626] text-[13px] font-semibold cursor-pointer">Xoá</a>
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-[12.5px] text-[#94a3b8] mt-3">Tổng {quickReplies.length} mẫu · lưu trên trình duyệt này.</div>
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
    <div className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.5)] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.18)] w-full max-w-2xl my-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b border-[#f1f5f9]">
          <h3 className="text-[17px] font-extrabold tracking-[-0.2px] text-[#111827]">{isNew ? 'Thêm câu trả lời nhanh' : 'Sửa câu trả lời nhanh'}</h3>
          <button title="Đóng" onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-[14px]">
          {/* Chủ đề + Ký tự tắt */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-[12px] font-bold text-[#6b7280] mb-[5px]">Chủ đề</div>
              <select value={qr.topic} onChange={(e) => setQr({ ...qr, topic: e.target.value })} className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[13px] bg-white">
                <option value="">Không có chủ đề</option>
                {tags.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[12px] font-bold text-[#6b7280] mb-[5px]">Ký tự tắt</div>
              <div className="flex items-center border border-[#e5e7eb] rounded-[10px] overflow-hidden focus-within:border-[#3c55e6]">
                <span className="px-3 py-2.5 bg-[#f8fafc] text-[#9ca3af] text-[13px] font-mono">/</span>
                <input value={qr.key} onChange={(e) => setQr({ ...qr, key: e.target.value })} placeholder="Nhập kí tự" className="flex-1 px-2 py-2.5 text-[13px] outline-none font-mono" />
              </div>
            </div>
          </div>

          <div className="text-[12px] font-bold text-[#6b7280]">Khối nội dung (gửi lần lượt)</div>

          {/* Các Nội dung */}
          {qr.contents.map((c, idx) => {
            const isOpen = !collapsed.has(c.id);
            return (
              <div key={c.id} className="rounded-xl bg-[#f8fafc] border border-[#eceef2]">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-gray-300 cursor-default" title="Kéo để sắp xếp (dùng ▲▼)">⠿</span>
                  <button onClick={() => toggleCollapse(c.id)} className="text-gray-500">{isOpen ? '▾' : '▸'}</button>
                  <span className="text-[13px] font-semibold text-[#374151]">Nội dung {idx + 1}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button title="Lên" onClick={() => moveContent(c.id, -1)} className="text-gray-400 hover:text-gray-700 text-xs">▲</button>
                    <button title="Xuống" onClick={() => moveContent(c.id, 1)} className="text-gray-400 hover:text-gray-700 text-xs">▼</button>
                    {qr.contents.length > 1 && <button title="Xoá nội dung" onClick={() => delContent(c.id)} className="text-red-400 hover:text-red-600 ml-1">🗑️</button>}
                  </div>
                </div>
                {isOpen && (
                  <div className="px-3 pb-3">
                    <div className="bg-white border border-[#e5e7eb] rounded-[10px]">
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
            <button onClick={addContent} disabled={qr.contents.length >= 10} className="px-4 py-2.5 rounded-[10px] border border-[#e5e7eb] text-[13px] font-bold text-[#3c55e6] hover:bg-[#e9efff] disabled:opacity-50">＋ Thêm nội dung</button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#f1f5f9]">
          <span className="text-[12px] text-[#94a3b8]">Tối đa 10 nội dung · {totalImages}/120 ảnh</span>
          <div className="ml-auto flex gap-2.5">
            <button onClick={onClose} className="px-[18px] py-2.5 rounded-[10px] border border-[#e5e7eb] bg-white text-[13px] font-bold text-[#374151] hover:bg-[#f9fafb]">Đóng</button>
            <button onClick={() => onSave(qr)} className="px-5 py-2.5 rounded-[10px] bg-[#4f68ee] text-white text-[13px] font-bold hover:bg-[#3c55e6]">Lưu mẫu</button>
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

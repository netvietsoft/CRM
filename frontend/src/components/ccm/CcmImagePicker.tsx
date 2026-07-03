'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { uploadToR2, folderOf } from '@/lib/uploadR2';

/* ============================================================================
 * CcmImagePicker — POPUP "THƯ MỤC ẢNH" (kiểu Pancake) cho nút 🖼️ Gửi ảnh.
 * • Upload lên R2 qua backend → LƯU vào thư viện DÙNG CHUNG (media_assets).
 * • Danh sách "Tải lên gần đây" lấy từ `GET /upload/media/list` (cả team thấy chung).
 * • "Yêu thích" lưu localStorage (sở thích riêng từng người).
 * • Chọn nhiều (badge số) → onSend(urls) → chat gửi từng ảnh.
 * ========================================================================== */

interface ImgItem { url: string; name: string; type?: string }
const KEY_FAV = 'ccm.images.fav.v1';
const loadFav = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY_FAV) || '[]'); } catch { return []; } };
const saveFav = (v: string[]) => { try { localStorage.setItem(KEY_FAV, JSON.stringify(v)); } catch { /* ignore */ } };

export default function CcmImagePicker({ onClose, onSend }: { onClose: () => void; onSend: (urls: string[]) => void }) {
  const [assets, setAssets] = useState<ImgItem[]>([]);       // thư viện dùng chung (từ DB)
  const [localItems, setLocalItems] = useState<ImgItem[]>([]); // ảnh tạm (blob) khi upload lỗi ở local
  const [fav, setFav] = useState<string[]>(() => (typeof window === 'undefined' ? [] : loadFav()));
  const [tab, setTab] = useState<'recent' | 'fav'>('recent');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [sendNow, setSendNow] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try { const r = await apiClientClient.get<{ assets: ImgItem[] }>('/upload/media/list'); setAssets(r.assets || []); }
    catch { setAssets([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadAssets(); }, [loadAssets]);

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr = Array.from(files).filter((f) => f.size <= 25 * 1024 * 1024);
    if (!arr.length) { setError('Chọn tệp ≤ 25MB.'); return; }
    setError(''); setUploading(true);
    const okUrls: string[] = []; const failed: File[] = [];
    for (const f of arr) {
      try { const r = await uploadToR2(f, folderOf(f)); okUrls.push(r.url); } catch { failed.push(f); }
    }
    if (okUrls.length) { await loadAssets(); setSelected((prev) => [...prev, ...okUrls]); }
    if (failed.length) {
      const added = failed.map((f) => ({ url: URL.createObjectURL(f), name: f.name })); // blob tạm (không lưu thư viện, không gửi ra Meta)
      setLocalItems((prev) => [...added, ...prev]);
      setSelected((prev) => [...prev, ...added.map((a) => a.url)]);
      setError('Một số tệp upload R2 thất bại → dùng ảnh tạm để xem. Chạy môi trường thật để lưu vào thư viện.');
    }
    setUploading(false);
  };

  const all = [...localItems, ...assets];
  const list = (tab === 'fav' ? all.filter((i) => fav.includes(i.url)) : all).filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  const selIndex = useMemo(() => new Map(selected.map((u, i) => [u, i + 1])), [selected]);

  const toggleSelect = (url: string) => setSelected((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));
  const toggleFav = (url: string) => setFav((prev) => { const next = prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]; saveFav(next); return next; });
  const confirm = () => { if (selected.length) onSend(selected); onClose(); };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 shrink-0">Thư viện ảnh (dùng chung)</h2>
          <div className="flex-1 max-w-lg mx-auto">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm kiếm ảnh bằng tên" className="w-full bg-gray-100 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3b5bdb]" />
          </div>
          <button title="Đóng" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl shrink-0">✕</button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          <div className="w-56 border-r border-gray-100 p-3 shrink-0 space-y-1">
            <button onClick={() => setTab('recent')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${tab === 'recent' ? 'bg-blue-50 text-[#3b5bdb] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>🕐 Tải lên gần đây</button>
            <button onClick={() => setTab('fav')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${tab === 'fav' ? 'bg-blue-50 text-[#3b5bdb] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>❤️ Yêu thích</button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
            {uploading && <div className="text-sm text-[#3b5bdb] mb-3">Đang tải ảnh lên R2…</div>}
            {loading ? <div className="text-sm text-gray-400">Đang tải thư viện…</div> : list.length === 0 && !uploading ? (
              <div className="h-full grid place-items-center text-center text-gray-400 text-sm">
                <div><div className="text-4xl mb-2">🖼️</div>{tab === 'fav' ? 'Chưa có ảnh yêu thích.' : 'Thư viện trống. Bấm "Thêm ảnh/tệp" để tải lên.'}</div>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {list.map((img) => {
                  const n = selIndex.get(img.url); const isFav = fav.includes(img.url); const isVideo = img.type === 'video';
                  return (
                    <div key={img.url} className="group">
                      <button onClick={() => toggleSelect(img.url)} className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 ${n ? 'border-[#3b5bdb]' : 'border-transparent'} bg-gray-100`}>
                        {isVideo ? <video src={img.url} className="w-full h-full object-cover" /> : <img src={img.url} alt={img.name} className="w-full h-full object-cover" />}
                        {isVideo && <span className="absolute inset-0 grid place-items-center text-white text-2xl drop-shadow">▶</span>}
                        {n && <span className="absolute top-1 left-1 w-6 h-6 rounded-full bg-[#3b5bdb] text-white text-xs grid place-items-center font-medium">{n}</span>}
                        <button onClick={(e) => { e.stopPropagation(); toggleFav(img.url); }} title={isFav ? 'Bỏ yêu thích' : 'Yêu thích'} className={`absolute bottom-1 left-1 w-6 h-6 rounded-full grid place-items-center text-sm ${isFav ? 'text-pink-500' : 'text-white/80 opacity-0 group-hover:opacity-100'}`}>❤</button>
                      </button>
                      <div className="text-[11px] text-gray-500 truncate mt-1" title={img.name}>{img.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} /> Gửi ảnh ngay
          </label>
          {selected.length > 0 && (
            <span className="inline-flex items-center gap-1 text-sm text-[#3b5bdb] bg-blue-50 px-2 py-0.5 rounded-full">Đã chọn {selected.length} ảnh
              <button onClick={() => setSelected([])} className="text-blue-300 hover:text-red-500">✕</button>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <label className="px-4 py-2 rounded-lg bg-blue-50 text-[#3b5bdb] text-sm font-medium cursor-pointer hover:bg-blue-100">
              ＋ Thêm ảnh/tệp
              <input type="file" accept="image/*,video/*,application/pdf" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
            </label>
            <button onClick={confirm} disabled={selected.length === 0} className="px-5 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium disabled:opacity-50">Chọn{selected.length ? ` (${selected.length})` : ''}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

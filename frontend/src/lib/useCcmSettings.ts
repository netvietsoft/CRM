'use client';

import { useEffect, useState } from 'react';

/* ============================================================================
 * useCcmSettings — STORE CÀI ĐẶT CCM (localStorage, dùng chung nhiều màn).
 * Đây là "chất keo" nối trang Cài đặt ↔ khu Chat: trang Cài đặt ghi, khu Chat đọc,
 * cập nhật LIVE trong cùng tab qua pub/sub; và đồng bộ giữa tab qua 'storage' event.
 *
 * Vì chưa có model backend riêng cho quick-reply/tag-catalog/prefs của CCM,
 * dữ liệu lưu localStorage (per-trình duyệt). Khi có backend sẽ thay bằng API.
 *   - quickReplies: mẫu trả lời nhanh (composer) — key/topic/text
 *   - tags:         danh mục Thẻ hội thoại (name/color) — dùng cho picker nhãn
 *   - prefs:        tuỳ chọn giao diện danh sách hội thoại
 * ========================================================================== */

// 1 nội dung trong mẫu trả lời nhanh: text (kèm biến #{...}) + ảnh + file (từ thư viện).
export interface QRContent { id: string; text: string; images: string[]; files: string[] }
// 1 mẫu trả lời nhanh: thuộc 1 chủ đề, có ký tự tắt, gồm NHIỀU nội dung.
export interface QuickReply { id: string; key: string; topic: string; contents: QRContent[] }
export interface TagDef { id: string; name: string; color: string }
export interface CcmPrefs {
  showAssignee: boolean; // hiện chip nhân viên phụ trách ở danh sách
  showPhone: boolean;    // hiện SĐT cạnh tên khách ở danh sách
  fullTagName: boolean;  // hiện đầy đủ tên nhãn (vs rút gọn)
  sound: boolean;        // bật/tắt âm thông báo
  newMsgSound: string;   // id âm khi có tin nhắn mới (xem SOUNDS)
  newConvSound: string;  // id âm khi có hội thoại mới
}

const KEY_QR = 'ccm.quickReplies.v1';
const KEY_TAGS = 'ccm.tags.v1';
const KEY_PREFS = 'ccm.prefs.v1';
const EVT = 'ccm-settings-changed';

const qc = (text: string): QRContent[] => [{ id: 'c' + Math.random().toString(36).slice(2, 8), text, images: [], files: [] }];
const DEFAULT_QR: QuickReply[] = [
  { id: 'qr1', key: 'xin', topic: 'Xin thông tin', contents: qc('Chị cho em xin cân nặng và chiều cao để em tư vấn size vừa nhất với mình nha ạ 🥰') },
  { id: 'qr2', key: 'ship', topic: 'Vận chuyển', contents: qc('Bên em freeship cho đơn từ 2 sản phẩm ạ.') },
  { id: 'qr3', key: 'cảm ơn', topic: 'CSKH', contents: qc('Dạ em cảm ơn chị ạ 🥰') },
  { id: 'qr4', key: 'ck', topic: 'Thanh toán', contents: qc('Dạ chị chuyển khoản giúp em theo thông tin bên dưới nha ạ.') },
];
const DEFAULT_TAGS: TagDef[] = [
  { id: 't1', name: 'Kiếm hàng', color: '#475569' },
  { id: 't2', name: 'Câu hỏi', color: '#7c3aed' },
  { id: 't3', name: 'Mua hàng', color: '#2563eb' },
  { id: 't4', name: 'Đã gửi', color: '#16a34a' },
  { id: 't5', name: 'Hết hàng', color: '#0ea5e9' },
  { id: 't6', name: 'Trả hàng', color: '#dc2626' },
];
const DEFAULT_PREFS: CcmPrefs = { showAssignee: true, showPhone: true, fullTagName: true, sound: true, newMsgSound: 'ding', newConvSound: 'chime' };

interface Store { qr: QuickReply[]; tags: TagDef[]; prefs: CcmPrefs }
let store: Store | null = null;
const listeners = new Set<() => void>();

function read<T>(key: string, def: T): T {
  try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : def; } catch { return def; }
}
function ensure(): Store {
  if (store) return store;
  if (typeof window === 'undefined') { store = { qr: DEFAULT_QR, tags: DEFAULT_TAGS, prefs: DEFAULT_PREFS }; return store; }
  // Migrate mẫu trả lời nhanh dạng cũ ({text}) → dạng mới ({contents:[...]}).
  const rawQr = read<Array<QuickReply & { text?: string }>>(KEY_QR, DEFAULT_QR);
  const qr = rawQr.map((r) => (r.contents ? r : { id: r.id, key: r.key, topic: r.topic, contents: qc(r.text || '') }));
  // Merge DEFAULT_PREFS để khoá mới (âm thanh…) có giá trị mặc định khi localStorage cũ thiếu.
  store = { qr, tags: read(KEY_TAGS, DEFAULT_TAGS), prefs: { ...DEFAULT_PREFS, ...read(KEY_PREFS, {} as Partial<CcmPrefs>) } };
  return store;
}

// Đọc prefs hiện tại KHÔNG qua hook (dùng trong handler realtime để phát âm).
export function getPrefs(): CcmPrefs { return ensure().prefs; }
function emit() { listeners.forEach((l) => l()); }
function persist(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ } }

export function useCcmSettings() {
  const [, force] = useState(0);
  useEffect(() => {
    const onChange = () => force((n) => n + 1);
    listeners.add(onChange);
    const onStorage = (e: StorageEvent) => { if ([KEY_QR, KEY_TAGS, KEY_PREFS].includes(e.key || '')) { store = null; onChange(); } };
    window.addEventListener(EVT, onChange);
    window.addEventListener('storage', onStorage);
    return () => { listeners.delete(onChange); window.removeEventListener(EVT, onChange); window.removeEventListener('storage', onStorage); };
  }, []);

  const s = ensure();

  const setQuickReplies = (qr: QuickReply[]) => { s.qr = qr; persist(KEY_QR, qr); emit(); window.dispatchEvent(new Event(EVT)); };
  const setTags = (tags: TagDef[]) => { s.tags = tags; persist(KEY_TAGS, tags); emit(); window.dispatchEvent(new Event(EVT)); };
  const setPrefs = (prefs: CcmPrefs) => { s.prefs = prefs; persist(KEY_PREFS, prefs); emit(); window.dispatchEvent(new Event(EVT)); };

  return { quickReplies: s.qr, tags: s.tags, prefs: s.prefs, setQuickReplies, setTags, setPrefs };
}

// Tạo id ngẫu nhiên đơn giản (không cần crypto).
export const newId = () => 'id' + Math.floor(Math.random() * 1e9).toString(36) + Date.now().toString(36);

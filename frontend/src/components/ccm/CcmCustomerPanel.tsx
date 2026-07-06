'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation } from '@/lib/useMessengerChat';
import { apiClientClient } from '@/lib/apiClientClient';
import CcmViettelPushDialog, { type PushableOrder } from './CcmViettelPushDialog';

/* ============================================================================
 * [CỘT 4] PANEL KHÁCH HÀNG / ĐƠN HÀNG — bên phải khu chat (kiểu Pancake).
 * 2 tab:
 *   • TAB "THÔNG TIN"  → FRAME 4A: ghi chú · FRAME 4B: danh sách đơn THẬT của khách (theo SĐT)
 *   • TAB "TẠO ĐƠN"    → FRAME 4C: form tạo đơn THẬT (product picker + POST /orders/admin)
 *
 * BE tái dùng (KHÔNG tạo model/API mới):
 *   - GET  /products/search?q=            → picker sản phẩm {id,name,imageUrl,salePrice,originalPrice,sku}
 *   - POST /orders/admin  (CreateAdminOrderDto) → {success, orderId, orderCode}
 *   - GET  /orders/admin?search=<phone>   → đơn của khách (để hiện ở FRAME 4B)
 *
 * Các trường form (SP + SL + đơn giá, phí ship, giảm giá, thanh toán, ghi chú) là field
 * CHUẨN HOÁ để: (1) lưu thành Đơn trong CRM, (2) sau này đẩy sang ĐVVC (Viettel Post…).
 * Nút "Đẩy Viettel Post" nằm trong CcmViettelPushDialog (Task D), gắn ở mỗi OrderCard.
 * ========================================================================== */

const fmtVnd = (n: number) => (n || 0).toLocaleString('vi-VN') + ' đ';

interface ProductHit { id: string; name: string; imageUrl: string | null; salePrice: number | null; originalPrice: number | null; sku: string | null }
interface OrderLine { productId: string; name: string; imageUrl: string | null; qty: number; price: number }
interface AdminOrder {
  id: string; orderCode: string; status: string;
  subtotal: number; discountAmount: number; shippingFee: number; totalAmount: number;
  paymentMethod: string | null; paymentStatus: string | null;
  createdAt: string; updatedAt: string;
  shippingName: string | null; shippingPhone: string | null;
  shippingStreet: string | null; shippingWard: string | null; shippingProvince: string | null;
  note: string | null; customerNote: string | null; source: string | null;
  items: { quantity: number; size?: string | null; color?: string | null; product: { name: string | null } | null }[];
  metadata?: Record<string, unknown> | null;
}
interface CarrierMeta { provider?: string; trackingCode?: string | null; status?: string | null; pushedAt?: string }

// Nhãn trạng thái đơn (khớp enum OrderStatus của BE) → tiếng Việt + màu.
const STATUS_VI: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-700' },
  PACKAGING: { label: 'Đang đóng gói', cls: 'bg-indigo-100 text-indigo-700' },
  WAITING_FOR_SHIPPING: { label: 'Chờ giao', cls: 'bg-cyan-100 text-cyan-700' },
  SHIPPED: { label: 'Đã gửi hàng', cls: 'bg-orange-100 text-orange-700' },
  DELIVERED: { label: 'Đã giao', cls: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Hoàn tất', cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-red-100 text-red-600' },
  REFUNDED: { label: 'Hoàn tiền', cls: 'bg-gray-200 text-gray-600' },
};
const statusView = (s: string) => STATUS_VI[s] || { label: s, cls: 'bg-gray-100 text-gray-600' };

// Màu thanh header thẻ đơn theo trạng thái.
const HEADER_BG: Record<string, string> = {
  PENDING: 'bg-amber-500', CONFIRMED: 'bg-blue-600', PACKAGING: 'bg-indigo-600', WAITING_FOR_SHIPPING: 'bg-cyan-600',
  SHIPPED: 'bg-orange-500', DELIVERED: 'bg-green-600', COMPLETED: 'bg-green-600', CANCELLED: 'bg-red-600', REFUNDED: 'bg-gray-500',
};
const headerBg = (s: string) => HEADER_BG[s] || 'bg-indigo-600';

// Catalog thẻ (theo Pancake). Thẻ đơn hàng: nghiệp vụ CSKH/vận chuyển. Thẻ KH: phân loại khách.
const ORDER_TAGS = ['Chờ cọc', 'Nhập hàng', 'Hẹn gọi', 'Trả lấy hàng', 'Không lấy được hàng', 'Không nghe máy', 'Không liên lạc được', 'Nhắc nhở', 'ODZ', 'Chênh cước vận chuyển', 'Đổi hàng', 'Quá ngày giao hàng', 'Pick up at office'];
const CUSTOMER_TAGS = ['Tiềm năng', 'Hay hoàn'];

function Field({ icon, children }: { icon: string; children: React.ReactNode }) {
  return <div className="flex items-start gap-2 text-sm py-0.5"><span className="w-4 text-gray-400 shrink-0">{icon}</span><span className="text-gray-700 flex-1 min-w-0">{children}</span></div>;
}

const timeVi = (s: string) => new Date(s).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/* --- Picker thẻ (chip đã chọn + dropdown chọn thêm) — dùng cho Thẻ đơn hàng & Thẻ KH --- */
function TagPicker({ label, catalog, value, onChange, align = 'right' }: {
  label: string; catalog: string[]; value: string[]; onChange: (t: string[]) => void; align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <div className="relative flex items-center gap-1 flex-wrap justify-end">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#e9efff] text-[#3c55e6] font-semibold">
          {t}<button title="Bỏ thẻ" onClick={() => toggle(t)} className="text-[#a5b4fc] hover:text-red-500">✕</button>
        </span>
      ))}
      <button title={`Thêm ${label.toLowerCase()}`} onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-[#3c55e6] bg-[#e9efff] px-2 py-0.5 rounded-full hover:bg-[#dbe3ff]">＋ {label}</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute z-20 ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 bg-white border border-[#e6e9f2] rounded-[11px] shadow-[0_18px_50px_rgba(15,23,42,.16)] w-52 max-h-60 overflow-y-auto p-1`}>
            {catalog.map((t) => (
              <button key={t} onClick={() => toggle(t)} className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-left rounded-lg hover:bg-[#f3f4f6]">
                <span className="w-4 text-[#3c55e6]">{value.includes(t) ? '✓' : ''}</span>{t}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* --- Thẻ 1 đơn hàng chi tiết (kiểu Pancake) — FRAME 4B --- */
function OrderCard({ o, contactName, contactPhone, onPush }: {
  o: AdminOrder; contactName: string; contactPhone: string; onPush: () => void;
}) {
  const sv = statusView(o.status);
  const meta = (o.metadata as Record<string, unknown> | null) || {};
  const carrier = meta.carrier as CarrierMeta | undefined;
  const addr = [o.shippingStreet, o.shippingWard, o.shippingProvince].filter(Boolean).join(', ');
  const products = o.items.map((it) => `${it.product?.name || 'SP'}${it.size ? ` ${it.size}` : ''}${it.color ? `/${it.color}` : ''} × ${it.quantity}`);

  // Thẻ đơn / thẻ KH (lưu trong metadata; sửa → PATCH admin-update).
  const [tags, setTags] = useState<string[]>((meta.tags as string[]) || []);
  const [custTags, setCustTags] = useState<string[]>((meta.customerTags as string[]) || []);
  const saveTags = async (next: string[]) => { setTags(next); try { await apiClientClient.patch(`/orders/${o.id}/admin-update`, { tags: next }); } catch { /* ignore */ } };
  const saveCust = async (next: string[]) => { setCustTags(next); try { await apiClientClient.patch(`/orders/${o.id}/admin-update`, { customerTags: next }); } catch { /* ignore */ } };

  // Trạng thái giao hàng LIVE từ Viettel Post (theo mã vận đơn) — hiện như 1 thẻ tự động.
  const [vtpStatus, setVtpStatus] = useState('');
  useEffect(() => {
    const code = carrier?.trackingCode;
    if (!code) return;
    apiClientClient.get<{ statusName?: string }>(`/viettelpost/customers/${encodeURIComponent(code)}`)
      .then((c) => setVtpStatus(c?.statusName || '')).catch(() => { /* ignore */ });
  }, [carrier?.trackingCode]);

  return (
    <div className="rounded-[12px] border border-[#eceef2] overflow-hidden mb-3">
      {/* Header màu theo trạng thái */}
      <div className={`flex items-center gap-2 px-3 py-2 text-white text-sm ${headerBg(o.status)}`}>
        <span className="font-bold font-mono">🧾 {o.orderCode}</span>
        <button onClick={onPush} className="ml-auto px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-[11px]">🚚 Đẩy VTP</button>
      </div>

      {/* Luồng trạng thái */}
      <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
        <span>Mới</span><span>›</span>
        <span className="text-[#3c55e6] font-semibold">{sv.label}</span>
        <span>›</span><span>Hủy</span>
      </div>

      <div className="px-3 py-2 space-y-0.5">
        {/* Gửi thanh toán + tổng */}
        <div className="flex items-center justify-between text-sm py-0.5">
          <span className="flex items-center gap-2 text-gray-500"><span className="w-4">🏦</span> Gửi thanh toán</span>
          <b className="text-gray-800">{fmtVnd(o.totalAmount)}</b>
        </div>
        <Field icon="👤">{o.shippingName || contactName}</Field>
        {(o.shippingPhone || contactPhone) && <Field icon="📞"><span className="text-blue-600">{o.shippingPhone || contactPhone}</span></Field>}
        {addr && <Field icon="🏠">{addr}</Field>}
        <div className="flex items-start justify-between text-sm py-0.5">
          <span className="flex items-start gap-2 flex-1 min-w-0"><span className="w-4 text-gray-400 shrink-0">🏷️</span><span className="text-gray-700">{products.join(', ') || '—'}</span></span>
          <span className="text-green-600 text-xs shrink-0 ml-2">Đơn đủ</span>
        </div>
        <div className="flex items-center justify-between text-sm py-0.5">
          <span className="flex items-center gap-2 text-green-600 font-semibold"><span className="w-4">💳</span>{fmtVnd(o.totalAmount)}</span>
          <span className="text-gray-500 text-xs">{o.paymentMethod === 'COD' ? 'COD' : 'Chuyển khoản'}</span>
        </div>
      </div>

      {/* Thời gian + ghi chú */}
      <div className="px-3 py-2 border-t border-gray-100 space-y-0.5">
        <div className="flex items-center justify-between text-sm"><span className="text-gray-500">🕐 Tạo lúc</span><span className="text-gray-600">{timeVi(o.createdAt)}</span></div>
        <div className="flex items-center justify-between text-sm"><span className="text-gray-500">🕑 Cập nhật</span><span className="text-gray-600">{timeVi(o.updatedAt)}</span></div>
        <div className="flex items-start justify-between text-sm gap-2">
          <span className="text-gray-500 shrink-0">📝 Ghi chú</span>
          <span className="text-[#3c55e6] text-right">{o.note || o.customerNote || 'Chưa có'}</span>
        </div>
      </div>

      {/* Vận đơn ĐVVC */}
      <div className="px-3 py-2 border-t border-gray-100">
        {carrier?.trackingCode ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-teal-600 text-white font-medium">{carrier.provider || 'VTP'}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-mono">{carrier.trackingCode}</span>
            </div>
            {/* Trạng thái giao hàng trả về từ ĐVVC (chấm đỏ) */}
            {vtpStatus && <div className="flex items-center gap-1 text-xs mt-1"><span className="text-red-500">●</span><span className="text-gray-600">{vtpStatus}</span></div>}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 italic">Chưa đẩy vận đơn</span>
            <button onClick={onPush} className="px-2.5 py-1.5 rounded-[9px] border border-[#fecaca] bg-white text-[#dc2626] text-xs font-bold hover:bg-[#fef2f2]">🚚 Đẩy Viettel Post</button>
          </div>
        )}
      </div>

      {/* Thẻ đơn / Thẻ KH */}
      <div className="px-3 py-2 border-t border-gray-100 space-y-1.5">
        <div className="flex items-start justify-between text-sm gap-2"><span className="text-gray-500 shrink-0 pt-0.5">🏷️ Thẻ</span><TagPicker label="Thẻ" catalog={ORDER_TAGS} value={tags} onChange={saveTags} /></div>
        <div className="flex items-start justify-between text-sm gap-2"><span className="text-gray-500 shrink-0 pt-0.5">🏷️ Thẻ KH</span><TagPicker label="Thẻ KH" catalog={CUSTOMER_TAGS} value={custTags} onChange={saveCust} /></div>
      </div>
    </div>
  );
}

export default function CcmCustomerPanel({ conversation, onOrderCreated }: { conversation: Conversation; onOrderCreated?: () => void }) {
  const [tab, setTab] = useState<'info' | 'create'>('info');
  const contactName = conversation.contact.name || conversation.contact.psid;
  const contactPhone = conversation.contact.phone || '';

  /* ---- FRAME 4B: đơn THẬT của khách (theo SĐT) ---- */
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [pushOrder, setPushOrder] = useState<PushableOrder | null>(null);
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      // (1) Đơn tạo TỪ CHÍNH hội thoại này (theo conversationId — luôn có, kể cả khách không SĐT).
      //     Đây là nguồn chính; đơn mới tạo hiện ra ngay nhờ nguồn này.
      let byConv: AdminOrder[] = [];
      try { byConv = await apiClientClient.get<AdminOrder[]>(`/orders/by-conversation/${encodeURIComponent(conversation.id)}`); } catch { /* ignore */ }
      // (2) Lịch sử đơn của khách theo SĐT THẬT của contact (KHÔNG dùng số gõ tay để tránh
      //     kéo nhầm đơn của khách khác trùng số). Bỏ qua nếu contact chưa có SĐT.
      let byPhone: AdminOrder[] = [];
      if (contactPhone) {
        try { byPhone = (await apiClientClient.get<{ orders: AdminOrder[] }>(`/orders/admin?search=${encodeURIComponent(contactPhone)}&limit=10`)).orders || []; } catch { /* ignore */ }
      }
      // Gộp + khử trùng theo id, mới nhất trước.
      const map = new Map<string, AdminOrder>();
      [...byConv, ...byPhone].forEach((o) => map.set(o.id, o));
      setOrders([...map.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    } catch { setOrders([]); }
    finally { setLoadingOrders(false); }
  }, [conversation.id, contactPhone]);
  useEffect(() => { if (tab === 'info') void loadOrders(); }, [tab, loadOrders]);

  /* ---- FRAME 4C: form tạo đơn ---- */
  const [name, setName] = useState(contactName);
  const [phone, setPhone] = useState(contactPhone);
  const [address, setAddress] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [freeShip, setFreeShip] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [orderTags, setOrderTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  // Đổi hội thoại → prefill lại tên/SĐT + xoá giỏ đang soạn.
  useEffect(() => { setName(contactName); setPhone(contactPhone); }, [contactName, contactPhone, conversation.id]);

  // Product picker.
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showHits, setShowHits] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setHits([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try { setHits(await apiClientClient.get<ProductHit[]>(`/products/search?q=${encodeURIComponent(q.trim())}`)); }
      catch { setHits([]); }
      finally { setSearching(false); }
    }, 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [q]);

  const addProduct = (p: ProductHit) => {
    setLines((prev) => {
      const found = prev.find((l) => l.productId === p.id);
      if (found) return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId: p.id, name: p.name, imageUrl: p.imageUrl, qty: 1, price: p.salePrice ?? p.originalPrice ?? 0 }];
    });
    setQ(''); setHits([]); setShowHits(false);
  };
  const setQty = (id: string, qty: number) => setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, qty: Math.max(1, qty) } : l)));
  const setPrice = (id: string, price: number) => setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, price: Math.max(0, price) } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.productId !== id));

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.qty * l.price, 0), [lines]);
  const total = useMemo(() => Math.max(0, subtotal - (Number(discount) || 0) + (freeShip ? 0 : Number(shippingFee) || 0)), [subtotal, discount, freeShip, shippingFee]);

  const reset = () => {
    setLines([]); setFreeShip(false); setTransfer(false); setShippingFee(0); setDiscount(0); setNote(''); setOrderTags([]);
    setName(contactName); setPhone(contactPhone); setAddress(''); setQ(''); setHits([]);
  };

  const submit = async () => {
    if (lines.length === 0) { setFlash({ ok: false, text: 'Chưa có sản phẩm nào.' }); return; }
    if (!name.trim() || !phone.trim()) { setFlash({ ok: false, text: 'Cần tên và SĐT người nhận.' }); return; }
    setSubmitting(true); setFlash(null);
    try {
      const body = {
        items: lines.map((l) => ({ productId: l.productId, quantity: l.qty, unitPrice: l.price })),
        shippingName: name.trim(),
        shippingPhone: phone.trim(),
        shippingStreet: address.trim() || undefined,
        paymentMethod: transfer ? 'VIETQR' : 'COD',
        shippingFee: freeShip ? 0 : Number(shippingFee) || 0,
        discountAmount: Number(discount) || 0,
        adminNote: note.trim() || undefined,
        metadata: { source: 'CCM', conversationId: conversation.id, psid: conversation.contact.psid, tags: orderTags },
      };
      const r = await apiClientClient.post<{ success: boolean; orderId: string; orderCode: string }>('/orders/admin', body);
      setFlash({ ok: true, text: `Đã tạo đơn ${r.orderCode}.` });
      reset();
      setTab('info');
      void loadOrders(); // đơn mới hiện ngay nhờ tra theo conversationId
      onOrderCreated?.();
    } catch (e) {
      setFlash({ ok: false, text: e instanceof Error ? e.message : 'Tạo đơn thất bại.' });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="w-full h-full border-l border-[#e6e9f2] bg-white flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-[#e6e9f2] text-sm shrink-0">
        {(['info', 'create'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 font-bold ${tab === t ? 'text-[#3c55e6] border-b-2 border-[#3c55e6]' : 'text-gray-500 hover:bg-gray-50'}`}>
            {t === 'info' ? 'Thông tin' : 'Tạo đơn'}
          </button>
        ))}
      </div>

      {/* Flash */}
      {flash && (
        <div className={`px-3 py-2 text-xs shrink-0 ${flash.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{flash.text}</div>
      )}

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {tab === 'info' ? (
          <>
            {/* --- FRAME 4A: GHI CHÚ --- */}
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[.06em] mb-1.5">Khách hàng</div>
              <div className="text-[15px] font-bold text-gray-900">{contactName}</div>
              {contactPhone && <div className="text-sm text-blue-600">📞 {contactPhone}</div>}
            </div>

            {/* --- FRAME 4B: DANH SÁCH ĐƠN THẬT --- */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13.5px] font-bold text-gray-800">Đơn hàng {loadingOrders ? '…' : `(${orders.length})`}</div>
                <button title="Tải lại danh sách đơn" onClick={() => void loadOrders()} className="text-xs text-gray-400 hover:text-gray-600">⟳</button>
              </div>
              {!loadingOrders && orders.length === 0 && (
                <div className="text-[12.5px] text-gray-400 italic leading-relaxed">
                  Chưa có đơn nào cho khách này.{!contactPhone && ' (Khách chưa có SĐT — đơn tạo từ hội thoại này vẫn sẽ hiện ở đây.)'}
                </div>
              )}
              {orders.map((o) => (
                <OrderCard key={o.id} o={o} contactName={contactName} contactPhone={contactPhone}
                  onPush={() => setPushOrder({
                    id: o.id, orderCode: o.orderCode, totalAmount: o.totalAmount, paymentMethod: o.paymentMethod,
                    shippingName: o.shippingName || contactName, shippingPhone: o.shippingPhone || contactPhone,
                    items: o.items.map((it) => ({ name: it.product?.name || 'SP', quantity: it.quantity })),
                  })} />
              ))}
            </div>
          </>
        ) : (
          /* --- FRAME 4C: FORM TẠO ĐƠN (THẬT) --- */
          <div className="space-y-4">
            {/* Người nhận */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[.06em]">Người nhận</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên người nhận" className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#3c55e6]" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại" className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#3c55e6]" />
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Địa chỉ nhận hàng" className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#3c55e6]" />
            </div>

            {/* Sản phẩm */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[.06em]">Sản phẩm (SL: {lines.reduce((s, l) => s + l.qty, 0)})</div>
              </div>
              {/* Bảng dòng SP */}
              {lines.length > 0 && (
                <div className="border border-[#eceef2] rounded-[10px] divide-y divide-gray-100 mb-2">
                  {lines.map((l) => (
                    <div key={l.productId} className="flex items-center gap-2 px-2.5 py-2">
                      <div className="w-8 h-8 rounded bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center text-gray-400 text-xs">
                        {l.imageUrl ? <img src={l.imageUrl} alt="" className="w-full h-full object-cover" /> : '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 truncate">{l.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <input type="number" min={1} value={l.qty} onChange={(e) => setQty(l.productId, Number(e.target.value))} className="w-12 border border-gray-200 rounded px-1 py-0.5 text-xs text-center" />
                          <span className="text-gray-400 text-xs">×</span>
                          <input type="number" min={0} value={l.price} onChange={(e) => setPrice(l.productId, Number(e.target.value))} className="w-24 border border-gray-200 rounded px-1 py-0.5 text-xs text-right" />
                          <span className="ml-auto text-xs font-medium text-gray-700">{fmtVnd(l.qty * l.price)}</span>
                        </div>
                      </div>
                      <button title="Xoá sản phẩm khỏi đơn" onClick={() => removeLine(l.productId)} className="text-gray-300 hover:text-red-500 text-sm shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Ô tìm SP */}
              <div className="relative">
                <input value={q} onChange={(e) => { setQ(e.target.value); setShowHits(true); }} onFocus={() => setShowHits(true)}
                  placeholder="🔍 Tìm sản phẩm để thêm…" className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[12.5px] outline-none focus:border-[#3c55e6]" />
                {showHits && q.trim() && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#e6e9f2] rounded-[11px] shadow-[0_18px_50px_rgba(15,23,42,.16)] max-h-56 overflow-y-auto">
                    {searching && <div className="px-3 py-2 text-xs text-gray-400">Đang tìm…</div>}
                    {!searching && hits.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Không có kết quả.</div>}
                    {hits.map((p) => (
                      <button key={p.id} onClick={() => addProduct(p)} className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-[#f3f6ff] text-left">
                        <div className="w-8 h-8 rounded bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center text-gray-400 text-xs">
                          {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold text-gray-800 truncate">{p.name}</div>
                          <div className="text-xs text-[#059669] font-semibold">{fmtVnd(p.salePrice ?? p.originalPrice ?? 0)}{p.sku ? ` · ${p.sku}` : ''}</div>
                        </div>
                        <span className="text-[#3c55e6] text-lg shrink-0">＋</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Thanh toán */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[.06em]">Thanh toán</div>
              <div className="flex items-center gap-3.5 text-[12.5px] font-semibold flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={freeShip} onChange={(e) => setFreeShip(e.target.checked)} className="w-[15px] h-[15px] accent-[#3c55e6]" /> Miễn phí giao hàng</label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={transfer} onChange={(e) => setTransfer(e.target.checked)} className="w-[15px] h-[15px] accent-[#3c55e6]" /> Chuyển khoản</label>
              </div>
              <div className="flex items-center justify-between text-[13px]"><span className="text-[#4b5563]">Tổng giá trị đơn hàng</span><b>{fmtVnd(subtotal)}</b></div>
              <div className="flex items-center justify-between text-[13px] gap-2.5">
                <span className="text-[#4b5563] shrink-0">Phí vận chuyển</span>
                <input type="number" min={0} disabled={freeShip} value={freeShip ? 0 : shippingFee} onChange={(e) => setShippingFee(Number(e.target.value))} className="w-[110px] border border-[#e5e7eb] rounded-[8px] px-2.5 py-1.5 text-right text-[12.5px] outline-none focus:border-[#3c55e6] disabled:bg-gray-100" />
              </div>
              <div className="flex items-center justify-between text-[13px] gap-2.5">
                <span className="text-[#4b5563] shrink-0">Giảm giá</span>
                <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-[110px] border border-[#e5e7eb] rounded-[8px] px-2.5 py-1.5 text-right text-[12.5px] outline-none focus:border-[#3c55e6]" />
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú nội bộ…" rows={2} className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2.5 text-[12.5px] outline-none focus:border-[#3c55e6] resize-y" />
            </div>

            {/* Thẻ đơn hàng */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[.06em]">Thẻ đơn hàng</div>
              <TagPicker label="Thẻ" catalog={ORDER_TAGS} value={orderTags} onChange={setOrderTags} align="left" />
            </div>

            {/* Footer tổng + nút */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[13.5px] font-bold text-[#4b5563]">Tổng cần thu</span>
              <span className="text-[19px] font-extrabold text-[#3c55e6]">{fmtVnd(total)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} type="button" className="flex-1 py-2.5 rounded-[11px] border border-[#e5e7eb] text-[13px] font-bold text-gray-700 hover:bg-gray-50">Thiết lập lại</button>
              <button onClick={() => void submit()} disabled={submitting} className="flex-1 py-2.5 rounded-[11px] bg-[#4f68ee] text-white text-[13px] font-bold hover:bg-[#3c55e6] disabled:opacity-60">{submitting ? 'Đang tạo…' : 'Tạo đơn'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog đẩy Viettel Post */}
      {pushOrder && <CcmViettelPushDialog order={pushOrder} onClose={() => setPushOrder(null)} onPushed={() => void loadOrders()} />}
    </div>
  );
}

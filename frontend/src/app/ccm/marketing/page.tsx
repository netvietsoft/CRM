'use client';
export const dynamic = 'force-dynamic';

/* /ccm/marketing — Marketing Messages (Messenger):
 * 1. Danh sách khách ĐÃ OPT-IN nhận tin tiếp thị (webhook optin đổ về, khách STOP → OPTED_OUT).
 * 2. Chọn mẫu tin Marketing / Utility Template + điền biến Placeholders (customer_name, order_id, discount_code...) + Live Preview.
 * 3. Gửi chiến dịch tới khách Opt-in (khách opt-out bị CHẶN tự động) & theo dõi Sent / Delivered / Read.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import StaffAvatar from '@/components/ui/StaffAvatar';

interface Optin {
  id: string;
  status: string;
  frequency: string | null;
  tokenExpiry: string | null;
  updatedAt: string;
  conversationId: string;
  page: { name: string | null };
  contact: { name: string | null; phone: string | null; avatarUrl: string | null };
}
interface Campaign {
  id: string;
  name: string;
  text: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failedCount: number;
}

interface MarketingTemplatePreset {
  id: string;
  category: string;
  campaignTitle: string;
  content: string;
  defaultParams: Record<string, string>;
}

const MARKETING_TEMPLATES: MarketingTemplatePreset[] = [
  {
    id: 'collection_launch',
    category: 'Marketing Promo',
    campaignTitle: 'New Linen Collection Launch 2026',
    content:
      'Hello {{customer_name}}! Reference Order #{{order_id}}: Our new {{collection_name}} is now live! Use code {{discount_code}} at checkout for 20% OFF.',
    defaultParams: {
      customer_name: 'Nguyen Thu Ha',
      order_id: 'ORD-8899',
      collection_name: 'Autumn Linen Collection',
      discount_code: 'VIP2026',
    },
  },
  {
    id: 'vip_voucher',
    category: 'VIP Reward',
    campaignTitle: 'VIP Customer Appreciation Voucher',
    content:
      'Thank you {{customer_name}} for your recent order #{{order_id}}! Here is your exclusive {{voucher_value}} reward voucher for your next purchase.',
    defaultParams: {
      customer_name: 'Nguyen Thu Ha',
      order_id: 'ORD-8899',
      voucher_value: '100,000 VND',
    },
  },
  {
    id: 'restock_alert',
    category: 'Restock Alert',
    campaignTitle: 'Back-in-Stock Product Notification',
    content:
      'Hi {{customer_name}}, the item {{product_name}} from your wishlist (Ref #{{order_id}}) is back in stock! Reply NOW to reserve yours.',
    defaultParams: {
      customer_name: 'Nguyen Thu Ha',
      product_name: 'Natural Beige V-Neck Linen Dress (Size M)',
      order_id: 'ORD-8899',
    },
  },
  {
    id: 'custom_marketing',
    category: 'Custom Template',
    campaignTitle: 'Custom Marketing Message Campaign',
    content: 'Hello {{customer_name}}, special update for order #{{order_id}}: {{promo_message}}',
    defaultParams: {
      customer_name: 'Nguyen Thu Ha',
      order_id: 'ORD-8899',
      promo_message: 'Enjoy free shipping on all orders this weekend!',
    },
  },
];

const DEMO_OPTINS: Optin[] = [
  {
    id: 'demo-optin-1',
    status: 'OPTED_IN',
    frequency: 'DAILY',
    tokenExpiry: new Date(Date.now() + 86400000 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    conversationId: 'demo-conv-1',
    page: { name: 'Thời Trang Nữ Cao Cấp Netviet (ID: 109823471928374)' },
    contact: {
      name: 'Nguyễn Thu Hà',
      phone: '0987654321',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    },
  },
  {
    id: 'demo-optin-2',
    status: 'OPTED_IN',
    frequency: 'WEEKLY',
    tokenExpiry: new Date(Date.now() + 86400000 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    conversationId: 'demo-conv-2',
    page: { name: 'Thời Trang Nữ Cao Cấp Netviet (ID: 109823471928374)' },
    contact: {
      name: 'Trần Mai Lan',
      phone: '0912345678',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
    },
  },
  {
    id: 'demo-optin-3',
    status: 'OPTED_OUT',
    frequency: 'DAILY',
    tokenExpiry: null,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    conversationId: 'demo-conv-3',
    page: { name: 'Thời Trang Nữ Cao Cấp Netviet (ID: 109823471928374)' },
    contact: {
      name: 'Lê Hoàng Nam (Opted Out)',
      phone: '0905112233',
      avatarUrl: null,
    },
  },
];

const DEMO_INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'demo-camp-1',
    name: 'VIP Loyalty Reward - Order #ORD-8801',
    text: 'Thank you Nguyen Thu Ha for your recent order #ORD-8801! Here is your exclusive 100,000 VND reward voucher for your next purchase.',
    status: 'SENT',
    sentAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    total: 2,
    sent: 2,
    delivered: 2,
    read: 2,
    failedCount: 0,
  },
];

const card = 'bg-white border border-[#e6e9f2] rounded-2xl p-5';
const inp = 'rounded-[10px] border border-[#c7ced9] bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-[#2563eb]';

function fmtTime(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.toLocaleTimeString('vi-VN', { hour12: false })} ${d.toLocaleDateString('vi-VN')}`;
}

export default function CcmMarketingPage() {
  const [optins, setOptins] = useState<Optin[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [demoCampaigns, setDemoCampaigns] = useState<Campaign[]>(DEMO_INITIAL_CAMPAIGNS);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Template + Placeholders state
  const [selectedTplId, setSelectedTplId] = useState<string>('collection_launch');
  const [name, setName] = useState<string>(MARKETING_TEMPLATES[0].campaignTitle);
  const [templateBody, setTemplateBody] = useState<string>(MARKETING_TEMPLATES[0].content);
  const [paramValues, setParamValues] = useState<Record<string, string>>(MARKETING_TEMPLATES[0].defaultParams);

  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [os, cs] = await Promise.all([
        apiClientClient.get<Optin[]>('/messenger/marketing/optins'),
        apiClientClient.get<Campaign[]>('/messenger/marketing/campaigns'),
      ]);
      setOptins(os);
      setCampaigns(cs);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Không tải được dữ liệu' });
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 15000);
    return () => window.clearInterval(t);
  }, [load]);

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTplId(tplId);
    const found = MARKETING_TEMPLATES.find((t) => t.id === tplId) || MARKETING_TEMPLATES[0];
    setName(found.campaignTitle);
    setTemplateBody(found.content);
    setParamValues({ ...found.defaultParams });
  };

  // Trích xuất danh sách biến {{placeholder}} từ templateBody
  const placeholders = useMemo(() => {
    const matches = templateBody.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim())));
  }, [templateBody]);

  // Tính toán nội dung tin nhắn sau khi điền biến placeholders
  const renderedMessage = useMemo(() => {
    let result = templateBody;
    for (const p of placeholders) {
      const val = paramValues[p] !== undefined ? paramValues[p] : `[${p}]`;
      result = result.replaceAll(`{{${p}}}`, val);
    }
    return result;
  }, [templateBody, placeholders, paramValues]);

  const displayedOptins = isDemo ? DEMO_OPTINS : optins;
  const displayedCampaigns = isDemo ? demoCampaigns : campaigns;

  const toggle = (id: string, status: string) => {
    if (status !== 'OPTED_IN') return; // opt-out không chọn được
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleDemoMode = () => {
    setIsDemo((prev) => {
      const next = !prev;
      if (next) {
        setSelected(new Set(['demo-optin-1']));
        setMsg({
          ok: true,
          text: '🎬 Đã bật Chế độ Demo App Review (marketing_messages_messenger & paid_marketing_messages)! Đã chọn sẵn người nhận mẫu Nguyễn Thu Hà.',
        });
      } else {
        setSelected(new Set());
        setMsg({ ok: true, text: 'Đã tắt chế độ dữ liệu mẫu.' });
      }
      return next;
    });
  };

  const send = async () => {
    if (!name.trim() || !renderedMessage.trim() || selected.size === 0) {
      setMsg({ ok: false, text: 'Cần tên chiến dịch, nội dung mẫu tin và ít nhất 1 người nhận Opt-in.' });
      return;
    }
    setSending(true);
    setMsg(null);

    if (isDemo) {
      const newCamp: Campaign = {
        id: `demo-camp-${Date.now()}`,
        name: name.trim(),
        text: renderedMessage.trim(),
        status: 'DELIVERED',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        total: selected.size,
        sent: selected.size,
        delivered: selected.size,
        read: selected.size,
        failedCount: 0,
      };
      setDemoCampaigns((prev) => [newCamp, ...prev]);
      setMsg({
        ok: true,
        text: `✅ [Demo App Review] Đã gửi chiến dịch mẫu tin "${name.trim()}" tới ${selected.size} khách hàng qua Meta Marketing Messages API!`,
      });
      setSending(false);
      return;
    }

    try {
      const r = await apiClientClient.post<{ sent: number; failed: number }>('/messenger/marketing/campaigns', {
        name: name.trim(),
        text: renderedMessage.trim(),
        optinIds: [...selected],
      });
      setMsg({ ok: true, text: `✅ Đã gửi chiến dịch: ${r.sent} thành công, ${r.failed} lỗi/chặn.` });
      setSelected(new Set());
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Gửi chiến dịch thất bại' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">
              📣 Marketing Messages & Template Builder
            </h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
              marketing_messages_messenger · paid_marketing_messages
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#6b7280]">
            (1) Chọn khách hàng đã Opt-in ➔ (2) Chọn mẫu tin (Template) & điền biến Placeholders (Name, Order ID, Code) ➔ (3) Xem trước Live Preview & Gửi qua Meta Messenger API.
          </p>
        </div>

        <button
          type="button"
          data-testid="marketing-demo-toggle"
          onClick={toggleDemoMode}
          title="Enable Demo App Review Mode with pre-populated Opt-in recipients and Template Placeholders"
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-xs flex items-center gap-1.5 ${
            isDemo
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span>{isDemo ? '✓ Đang bật Demo App Review' : '🎬 Dữ liệu mẫu (Quay App Review)'}</span>
        </button>
      </div>

      {msg && (
        <div
          data-testid="marketing-flash-msg"
          className={`rounded-[10px] border px-4 py-2.5 text-[13px] ${
            msg.ok
              ? 'border-[#a7f3d0] bg-[#d1fae5] text-[#047857]'
              : 'border-[#fecaca] bg-[#fee2e2] text-[#dc2626]'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Cột 1: Khách đã opt-in */}
        <div className={card}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-extrabold">
              1. Chọn Người Nhận Opt-in · Select Opt-in Recipients ({displayedOptins.filter((o) => o.status === 'OPTED_IN').length})
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              NOTIFICATION_MESSAGES Token
            </span>
          </div>
          <p className="mb-3 mt-0.5 text-[12px] text-[#6b7280]">
            Tick chọn khách hàng đã đồng ý nhận thông báo (OPTED_IN). Khách hủy đăng ký (OPTED_OUT) tự động bị khóa chọn.
          </p>
          {displayedOptins.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#9ca3af]">
              Chưa có khách nào opt-in — vào hội thoại bấm nút 📣 để gửi lời mời hoặc bật <strong>🎬 Dữ liệu mẫu (Quay App Review)</strong> ở góc phải phía trên.
            </div>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {displayedOptins.map((o) => (
                <label
                  key={o.id}
                  data-testid={`optin-row-${o.id}`}
                  className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 ${
                    o.status === 'OPTED_IN'
                      ? 'cursor-pointer border-[#e6e9f2] hover:bg-[#f5f7ff]'
                      : 'opacity-50 border-[#f1f5f9] cursor-not-allowed'
                  } ${selected.has(o.id) ? 'border-[#3c55e6] bg-[#eef2ff]' : ''}`}
                >
                  <input
                    type="checkbox"
                    data-testid={`optin-checkbox-${o.id}`}
                    disabled={o.status !== 'OPTED_IN'}
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id, o.status)}
                    className="h-4 w-4 accent-[#3c55e6]"
                  />
                  <StaffAvatar src={o.contact.avatarUrl} name={o.contact.name || o.contact.phone} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">
                      {o.contact.name || o.contact.phone || 'Khách'}
                    </span>
                    <span className="block text-[11px] text-[#9ca3af]">
                      {o.page.name} · Frequency: {o.frequency || 'DAILY'} · {fmtTime(o.updatedAt)}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                      o.status === 'OPTED_IN'
                        ? 'bg-[#d1fae5] text-[#047857]'
                        : 'bg-[#fee2e2] text-[#dc2626]'
                    }`}
                  >
                    {o.status === 'OPTED_IN' ? '✓ OPTED_IN (Đã đồng ý)' : '✕ OPTED_OUT (Chặn)'}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Cột 2: Tạo chiến dịch với Template & Placeholders */}
        <div className={card}>
          <h3 className="mb-3 text-[15px] font-extrabold">
            2. Chọn Mẫu Tin & Điền Biến · Select Template & Populate Placeholders
          </h3>
          <div className="space-y-3.5">
            {/* Bước 2A: Chọn Mẫu Tin */}
            <div>
              <label className="mb-1 block text-[12px] font-bold text-[#374151]">
                A. Chọn Mẫu Tin Tiếp Thị / Tiện Ích (Select Marketing / Utility Template)
              </label>
              <select
                data-testid="marketing-template-select"
                value={selectedTplId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                title="Select a Marketing or Utility Message Template"
                className={`${inp} w-full font-semibold text-gray-800`}
              >
                {MARKETING_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    [{tpl.category}] {tpl.campaignTitle}
                  </option>
                ))}
              </select>
            </div>

            {/* Tên chiến dịch */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#374151]">
                Tên chiến dịch (Campaign Name) <span className="text-[#dc2626]">*</span>
              </label>
              <input
                data-testid="marketing-campaign-name"
                className={`${inp} w-full`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Summer Product Update"
              />
            </div>

            {/* Khung mẫu tin gốc có biến {{...}} */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#374151]">
                Cấu trúc mẫu tin có biến (Template Structure with {'{{placeholders}}'}) <span className="text-[#dc2626]">*</span>
              </label>
              <textarea
                data-testid="marketing-template-body"
                rows={2}
                className={`${inp} w-full font-mono text-xs`}
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
              />
            </div>

            {/* Bước 2B: Điền các biến Placeholders */}
            <div>
              <label className="mb-1.5 block text-[12px] font-bold text-[#374151]">
                B. Điền Dữ Liệu Biến Cá Nhân Hóa (Populate Template Placeholders)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl bg-[#f8fafc] p-3 border border-[#e2e8f0]">
                {placeholders.length === 0 ? (
                  <div className="col-span-2 text-xs text-gray-400 italic">
                    Không có biến placeholder nào trong mẫu tin.
                  </div>
                ) : (
                  placeholders.map((key) => (
                    <div key={key}>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Placeholder: <span className="font-mono text-blue-600">{`{{${key}}}`}</span>
                      </label>
                      <input
                        type="text"
                        data-testid={`marketing-placeholder-${key}`}
                        value={paramValues[key] || ''}
                        onChange={(e) =>
                          setParamValues((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={`Enter ${key}...`}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-600"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bước 2C: Xem trước trên Messenger (Live Native Preview) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-bold text-[#374151]">
                  C. Xem Trước Tin Nhắn Thực Tế (Live Native Client Preview)
                </label>
                <span className="text-[11px] text-gray-500">Messenger Native View</span>
              </div>
              <div className="rounded-xl bg-[#f1f5f9] p-3.5 border border-[#e2e8f0]">
                <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-xs bg-[#2563eb] px-4 py-2.5 text-white shadow-xs">
                  <p
                    data-testid="marketing-live-preview"
                    className="whitespace-pre-wrap text-[13px] leading-relaxed"
                  >
                    {renderedMessage}
                  </p>
                  <div className="mt-1.5 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-blue-100">
                    <span>📣 Marketing Message · Unsubscribe anytime</span>
                    <span>✓✓ Delivered</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12.5px] text-[#6b7280]">
                Đã chọn (Selected): <b>{selected.size}</b> người nhận Opt-in
              </span>
              <button
                type="button"
                data-testid="marketing-send-btn"
                onClick={() => void send()}
                disabled={sending || selected.size === 0 || !name.trim() || !renderedMessage.trim()}
                title="Send populated Marketing Message Template to selected Opt-in recipients"
                className="rounded-[10px] bg-[#4f68ee] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#3c55e6] disabled:opacity-50"
              >
                {sending ? 'Đang gửi (Sending)…' : '📨 Gửi Chiến Dịch (Send Template Campaign)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng 3: Danh sách chiến dịch đã gửi */}
      <div className={card}>
        <h3 className="mb-3 text-[15px] font-extrabold">
          3. Lịch Sử Chiến Dịch Đã Gửi & Trạng Thái Giao Tin (Sent Campaigns & Delivery Receipts)
        </h3>
        {displayedCampaigns.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-[#9ca3af]">Chưa có chiến dịch nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table data-testid="marketing-campaigns-table" className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-[#6b7280]">
                    Chiến dịch (Campaign)
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-[#6b7280]">
                    Nội dung đã điền biến (Delivered Template Message)
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-[#6b7280]">
                    Gửi lúc (Sent At)
                  </th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-[#6b7280]">Sent</th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-[#6b7280]">Delivered</th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-[#6b7280]">Read</th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase text-[#6b7280]">Lỗi/Chặn</th>
                </tr>
              </thead>
              <tbody>
                {displayedCampaigns.map((c, i) => (
                  <tr
                    key={c.id}
                    data-testid={`campaign-row-${c.id}`}
                    className={`border-t border-[#f1f5f9] ${i % 2 === 1 ? 'bg-[#f9fafb]' : ''}`}
                  >
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{c.name}</td>
                    <td className="max-w-[360px] px-3 py-2.5 text-[#4b5563]" title={c.text}>
                      {c.text}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-[#6b7280]">{fmtTime(c.sentAt)}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#1d4ed8]">{c.sent}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#047857]">{c.delivered}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#7c3aed]">{c.read}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-[#dc2626]">{c.failedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

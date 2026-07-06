'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  MessageTemplateRecord,
  messagingChannelOptions,
  templateKindOptions,
} from '@/lib/adminMessaging';

const emptyForm = {
  channelCode: 'SMS',
  name: '',
  kind: 'CUSTOM',
  content: '',
  isActive: true,
};

const supportedTemplateVariables = [
  { variable: '{{customer_name}}', description: 'Tên khách hàng.' },
  { variable: '{{phone}}', description: 'Số điện thoại của khách hàng hoặc người nhận.' },
  { variable: '{{email}}', description: 'Email của khách hàng.' },
  { variable: '{{order_code}}', description: 'Mã đơn hàng.' },
  { variable: '{{order_amount}}', description: 'Tổng tiền đơn hàng.' },
  { variable: '{{voucher_value}}', description: 'Tổng tiền được giảm từ voucher.' },
  { variable: '{{discount_amount}}', description: 'Số tiền giảm giá của đơn hàng.' },
  { variable: '{{shipping_fee}}', description: 'Phí vận chuyển của đơn hàng.' },
  { variable: '{{subtotal}}', description: 'Tiền hàng trước khi cộng phí ship hoặc trừ giảm giá.' },
  { variable: '{{total_amount}}', description: 'Số tiền cuối cùng khách cần thanh toán.' },
  { variable: '{{total_spent}}', description: 'Tổng số tiền khách đã chi tiêu trên hệ thống.' },
  { variable: '{{shipping_name}}', description: 'Tên người nhận hàng.' },
  { variable: '{{shipping_phone}}', description: 'Số điện thoại người nhận hàng.' },
  { variable: '{{shipping_address}}', description: 'Địa chỉ giao hàng ghép từ đường, phường/xã, tỉnh/thành.' },
  { variable: '{{customer_rank}}', description: 'Hạng hiện tại của khách hàng như MEMBER, VIP...' },
  { variable: '{{order_count}}', description: 'Tổng số đơn đã gắn với khách hàng trên hệ thống.' },
  { variable: '{{last_order_date}}', description: 'Ngày giờ mua gần nhất của khách hàng.' },
  { variable: '{{store_name}}', description: 'Tên shop hoặc cửa hàng đang gửi tin.' },
  { variable: '{{product_names}}', description: 'Danh sách tên sản phẩm trong đơn, nối bằng dấu phẩy.' },
  { variable: '{{product_summary}}', description: 'Tóm tắt sản phẩm trong đơn, hiện dùng cùng dữ liệu với product_names.' },
];

const automationOnlyVariables = [
  { variable: '{{trigger_source}}', description: 'Nguồn kích hoạt tin tự động, ví dụ sinh nhật hoặc đổi trạng thái đơn.' },
  { variable: '{{order_status}}', description: 'Trạng thái đơn hàng tại thời điểm rule tự động chạy.' },
  { variable: '{{payment_status}}', description: 'Trạng thái thanh toán tại thời điểm rule tự động chạy.' },
  { variable: '{{previous_order_status}}', description: 'Trạng thái đơn hàng trước khi thay đổi.' },
  { variable: '{{previous_payment_status}}', description: 'Trạng thái thanh toán trước khi thay đổi.' },
];

interface CustomerCareTemplateFormClientProps {
  templateId?: string;
}

function extractTemplateVariables(content: string) {
  const matches = content.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) || [];
  return Array.from(new Set(matches.map((item) => item.trim())));
}

export default function CustomerCareTemplateFormClient({
  templateId,
}: CustomerCareTemplateFormClientProps) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [showVariableGuide, setShowVariableGuide] = useState(false);

  useEffect(() => {
    if (!templateId) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const template = await apiClientClient.get<MessageTemplateRecord>(
          `/admin/messaging/templates/${templateId}`,
        );
        if (!cancelled) {
          setForm({
            channelCode: template.channel.code,
            name: template.name,
            kind: template.kind,
            content: template.content,
            isActive: template.isActive,
          });
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được template');
          router.push('/admin/customer-care/templates');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, templateId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const variables = extractTemplateVariables(form.content);

    const payload = {
      channelCode: form.channelCode,
      name: form.name,
      kind: form.kind,
      content: form.content,
      variables,
      isActive: form.isActive,
    };

    try {
      if (templateId) {
        await apiClientClient.patch(`/admin/messaging/templates/${templateId}`, payload);
      } else {
        await apiClientClient.post('/admin/messaging/templates', payload);
      }
      router.push('/admin/customer-care/templates');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không lưu được template');
    } finally {
      setSaving(false);
    }
  };

  const usedVariables = extractTemplateVariables(form.content);

  return (
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">
              {templateId ? 'Sửa template' : 'Tạo template'}
            </h1>
            <p className="mt-1 text-[12.5px] text-[#9ca3af]">
              Tạo mẫu tin nhắn để dùng lại cho gửi cá nhân, campaign và tin tự động.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin/customer-care/templates')}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#eceef2] bg-white p-[22px]">
        {loading ? (
          <div className="py-10 text-center text-[13px] text-[#9ca3af]">Đang tải template...</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Tên template</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              />
            </label>

            <label className="space-y-2">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Kênh</span>
              <select
                value={form.channelCode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, channelCode: event.target.value }))
                }
                className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              >
                {messagingChannelOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Loại</span>
              <select
                value={form.kind}
                onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}
                className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              >
                {templateKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2.5 self-end rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] font-bold text-gray-900">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                className="accent-[#2563eb]"
              />
              Đang hoạt động
            </label>

            <div className="space-y-2 md:col-span-2">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Biến trong nội dung</span>
              <div className="rounded-[10px] border border-[#eceef2] px-3.5 py-2.5 text-[12.5px] font-mono text-[#4b5563]">
                {usedVariables.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {usedVariables.map((variable) => (
                      <span
                        key={variable}
                        className="rounded-md bg-[#f1f5f9] px-2 py-1 font-bold text-[#64748b]"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span>Chưa có biến nào trong nội dung template.</span>
                )}
              </div>
              <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] text-[12.5px] text-[#2563eb]">
                <button
                  type="button"
                  onClick={() => setShowVariableGuide((prev) => !prev)}
                  className="flex w-full items-center justify-between px-3.5 py-[11px] text-left font-bold text-[#1d4ed8]"
                >
                  <span>Hướng dẫn dùng biến trong template</span>
                  <span>{showVariableGuide ? 'Ẩn' : 'Xem'}</span>
                </button>
                {showVariableGuide ? (
                  <div className="space-y-2 border-t border-[#bfdbfe] px-3.5 py-3 text-[#374151]">
                    <p>
                      Dùng cú pháp <span className="font-semibold">{'{{ten_bien}}'}</span> để chèn
                      dữ liệu vào nội dung tin nhắn.
                    </p>
                    <p>
                      Ví dụ: <span className="font-semibold">{'{{customer_name}}'}</span>,{' '}
                      <span className="font-semibold">{'{{order_code}}'}</span>,{' '}
                      <span className="font-semibold">{'{{total_amount}}'}</span>,{' '}
                      <span className="font-semibold">{'{{customer_rank}}'}</span>
                    </p>
                    <p className="font-semibold text-gray-900">Biến hệ thống đang hỗ trợ:</p>
                    <div className="rounded-lg border border-blue-100 bg-white">
                      <div className="grid grid-cols-1 divide-y divide-blue-100 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
                        {supportedTemplateVariables.map((item) => (
                          <div key={item.variable} className="px-3 py-2">
                            <div className="font-semibold text-gray-900">{item.variable}</div>
                            <div className="mt-1 text-gray-600">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">Biến chỉ dùng cho tin tự động:</p>
                    <div className="rounded-lg border border-amber-100 bg-amber-50">
                      <div className="grid grid-cols-1 divide-y divide-amber-100 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
                        {automationOnlyVariables.map((item) => (
                          <div key={item.variable} className="px-3 py-2">
                            <div className="font-semibold text-gray-900">{item.variable}</div>
                            <div className="mt-1 text-gray-600">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p>
                      Nếu mẫu tin có nội dung liên quan đến đơn hàng thì nên dùng các biến như{' '}
                      <span className="font-semibold">{'{{order_code}}'}</span>,{' '}
                      <span className="font-semibold">{'{{total_amount}}'}</span>,{' '}
                      <span className="font-semibold">{'{{shipping_fee}}'}</span>,{' '}
                      <span className="font-semibold">{'{{product_names}}'}</span>.
                    </p>
                    <p>
                      Nếu mẫu tin chỉ gửi theo thông tin khách hàng, bạn nên ưu tiên{' '}
                      <span className="font-semibold">{'{{customer_name}}'}</span>,{' '}
                      <span className="font-semibold">{'{{phone}}'}</span>,{' '}
                      <span className="font-semibold">{'{{email}}'}</span>,{' '}
                      <span className="font-semibold">{'{{customer_rank}}'}</span>,{' '}
                      <span className="font-semibold">{'{{total_spent}}'}</span>.
                    </p>
                    <p>
                      Nếu bạn gửi tay hoặc import ngoài, có thể truyền thêm biến riêng ở bước gửi
                      tin bằng JSON, ví dụ <span className="font-semibold">campaign_name</span>,{' '}
                      <span className="font-semibold">coupon_code</span>,{' '}
                      <span className="font-semibold">shop_note</span>.
                    </p>
                    <p>
                      Biến nào không có dữ liệu thực tế thì khi gửi tin có thể bị để trống, nên
                      tránh dùng quá nhiều biến nếu chưa chắc dữ liệu đang có đủ.
                    </p>
                  </div>
                ) : (
                  <div className="px-3.5 pb-3 text-[#2563eb]">
                    Nhấn <span className="font-bold">Xem</span> để mở danh sách biến và ý nghĩa
                    từng biến.
                  </div>
                )}
              </div>
            </div>

            <label className="space-y-2 md:col-span-2">
              <span className="mb-1.5 block text-[12.5px] font-bold text-gray-900">Nội dung</span>
              <textarea
                rows={10}
                required
                placeholder="Ví dụ: CHY xác nhận đơn {{order_code}} của {{customer_name}} đã được tiếp nhận."
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              />
            </label>

            <div className="flex justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={() => router.push('/admin/customer-care/templates')}
                className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-[10px] bg-[#2563eb] px-[18px] py-2.5 text-[13px] font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu template'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

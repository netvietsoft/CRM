'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  AudiencePurchaseState,
  MessageAutomationRuleDetailRecord,
  MessageTemplateRecord,
  messagingChannelOptions,
  purchaseStateOptions,
  triggerTypeOptions,
} from '@/lib/adminMessaging';

type AutomationFormState = {
  channelCode: string;
  name: string;
  triggerType: string;
  templateId: string;
  messageContent: string;
  isActive: boolean;
  search: string;
  purchaseState: AudiencePurchaseState | '';
  skipPartialOrders: boolean;
  skipExchangeOrders: boolean;
};

const emptyForm: AutomationFormState = {
  channelCode: 'SMS',
  name: '',
  triggerType: 'BIRTHDAY',
  templateId: '',
  messageContent: '',
  isActive: true,
  search: '',
  purchaseState: '' as AudiencePurchaseState | '',
  skipPartialOrders: true,
  skipExchangeOrders: true,
};

function isOrderLikeTrigger(triggerType: string) {
  return (
    triggerType === 'ORDER_SHIPPING_STATUS' ||
    triggerType === 'ORDER_DELIVERED_PAID' ||
    triggerType.startsWith('ORDER_') ||
    triggerType.startsWith('PAYMENT_')
  );
}

interface CustomerCareAutomationFormClientProps {
  ruleId?: string;
}

function getRuleForm(rule: MessageAutomationRuleDetailRecord): AutomationFormState {
  return {
    channelCode: rule.channel.code,
    name: rule.name,
    triggerType: rule.triggerType,
    templateId: rule.template?.id || '',
    messageContent:
      typeof rule.metadata?.messageContent === 'string' ? rule.metadata.messageContent : '',
    isActive: rule.isActive,
    search: typeof rule.audienceFilter?.search === 'string' ? rule.audienceFilter.search : '',
    purchaseState:
      typeof rule.audienceFilter?.purchaseState === 'string'
        ? (rule.audienceFilter.purchaseState as AudiencePurchaseState)
        : '',
    skipPartialOrders: rule.triggerConfig?.skipPartialOrders !== false,
    skipExchangeOrders: rule.triggerConfig?.skipExchangeOrders !== false,
  };
}

async function fetchTemplates() {
  const response = await apiClientClient.get<{ items: MessageTemplateRecord[] }>(
    '/admin/messaging/templates',
    {
      params: {
        page: 1,
        limit: 100,
        channelCode: 'SMS',
        isActive: true,
      },
    },
  );

  return response.items || [];
}

export default function CustomerCareAutomationFormClient({
  ruleId,
}: CustomerCareAutomationFormClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<AutomationFormState>(emptyForm);
  const [templates, setTemplates] = useState<MessageTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [templateData, ruleData] = await Promise.all([
          fetchTemplates(),
          ruleId
            ? apiClientClient.get<MessageAutomationRuleDetailRecord>(
                `/admin/messaging/automation-rules/${ruleId}`,
              )
            : Promise.resolve(null),
        ]);

        if (cancelled) {
          return;
        }

        setTemplates(templateData);
        if (ruleData) {
          setForm(getRuleForm(ruleData));
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được rule tự động');
          router.push('/admin/customer-care/automations');
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
  }, [router, ruleId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      channelCode: form.channelCode,
      name: form.name.trim(),
      triggerType: form.triggerType,
      templateId: form.templateId || undefined,
      isActive: form.isActive,
      triggerConfig:
        isOrderLikeTrigger(form.triggerType)
          ? {
              skipPartialOrders: form.skipPartialOrders,
              skipExchangeOrders: form.skipExchangeOrders,
            }
          : {},
      audienceFilter: {
        search: form.search.trim() || undefined,
        purchaseState: form.purchaseState || undefined,
      },
      metadata: {
        messageContent: form.messageContent.trim() || undefined,
      },
    };

    try {
      if (ruleId) {
        await apiClientClient.patch(`/admin/messaging/automation-rules/${ruleId}`, payload);
      } else {
        await apiClientClient.post('/admin/messaging/automation-rules', payload);
      }

      router.push('/admin/customer-care/automations');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không lưu được rule tự động');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {ruleId ? 'Sửa tin tự động' : 'Tạo tin tự động'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Cấu hình rule SMS theo trigger nghiệp vụ, template và điều kiện lọc khách hàng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin/customer-care/automations')}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Đang tải rule tự động...</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Tên rule</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ví dụ: Nhắn cảm ơn sau khi giao hàng thành công"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Kênh gửi</span>
              <select
                value={form.channelCode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, channelCode: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {messagingChannelOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Trigger</span>
              <select
                value={form.triggerType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, triggerType: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {triggerTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Template</span>
              <select
                value={form.templateId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, templateId: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Tự soạn nội dung</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-gray-700">
                Nội dung khi không dùng template
              </span>
              <textarea
                rows={5}
                value={form.messageContent}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, messageContent: event.target.value }))
                }
                placeholder="Nhập nội dung SMS nếu rule này không dùng template có sẵn"
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Tìm trong tệp nhận</span>
              <input
                value={form.search}
                onChange={(event) => setForm((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Tên khách, số điện thoại hoặc email"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Trạng thái mua</span>
              <select
                value={form.purchaseState}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    purchaseState: event.target.value as AudiencePurchaseState | '',
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Không lọc</option>
                {purchaseStateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {isOrderLikeTrigger(form.triggerType) ? (
              <>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.skipPartialOrders}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        skipPartialOrders: event.target.checked,
                      }))
                    }
                  />
                  Bỏ qua đơn một phần
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.skipExchangeOrders}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        skipExchangeOrders: event.target.checked,
                      }))
                    }
                  />
                  Bỏ qua đơn đổi
                </label>
              </>
            ) : (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-800 md:col-span-2">
                Trigger sinh nhật không dùng bộ lọc đơn một phần hoặc đơn đổi.
              </div>
            )}

            <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
              Bật rule tự động ngay sau khi lưu
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu rule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

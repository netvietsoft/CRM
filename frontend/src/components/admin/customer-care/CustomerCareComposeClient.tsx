'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  MessageAudiencePreviewResponse,
  CustomerSearchResponse,
  formatPercent,
  getMessagePurposeHint,
  getMessagePurposeLabel,
  MessageCampaignRecord,
  MessagePurpose,
  MessagingOperationsDashboard,
  MessagingOperationsHealth,
  messagePurposeOptions,
  MessageTemplateRecord,
  formatDateTime,
  messagingChannelOptions,
  PaginatedResponse,
  parseJsonInput,
  purchaseStateOptions,
  recipientSourceOptions,
} from '@/lib/adminMessaging';
import { formatNumber } from '@/lib/format';

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return '—';
  }

  return formatNumber(value);
}

function sanitizeNumericInput(value: string) {
  return value.replace(/\D/g, '');
}

function formatNumericInput(value: string) {
  if (!value) {
    return '';
  }

  return formatNumber(Number(value));
}

async function fetchComposeData() {
  const [templateData, campaignData, dashboardData, healthData] = await Promise.all([
    apiClientClient.get<PaginatedResponse<MessageTemplateRecord>>('/admin/messaging/templates', {
      params: { page: 1, limit: 100, channelCode: 'SMS', isActive: true },
    }),
    apiClientClient.get<PaginatedResponse<MessageCampaignRecord>>('/admin/messaging/campaigns', {
      params: { page: 1, limit: 8, channelCode: 'SMS' },
    }),
    apiClientClient.get<MessagingOperationsDashboard>('/admin/messaging/operations/dashboard', {
      params: { days: 30 },
    }),
    apiClientClient.get<MessagingOperationsHealth>('/admin/messaging/operations/health'),
  ]);

  return {
    templates: templateData.items || [],
    campaigns: campaignData.items || [],
    dashboard: dashboardData,
    health: healthData,
  };
}

async function fetchCustomerSearchResults(search: string) {
  const data = await apiClientClient.get<CustomerSearchResponse>('/admin/customers', {
    params: {
      page: 1,
      limit: 8,
      search,
    },
  });

  return data.customers || [];
}

interface CustomerPick {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

const defaultSingleForm = {
  channelCode: 'SMS',
  purpose: 'TRANSACTIONAL' as MessagePurpose,
  recipient: '',
  recipientName: '',
  userId: '',
  orderId: '',
  templateId: '',
  messageContent: '',
  templateVariables: '{}',
};

const defaultCampaignForm = {
  channelCode: 'SMS',
  purpose: 'MARKETING' as MessagePurpose,
  name: '',
  source: 'CUSTOMERS',
  templateId: '',
  messageContent: '',
  scheduledAt: '',
  search: '',
  purchaseState: '',
  purchasedFrom: '',
  purchasedTo: '',
  minOrderAmount: '',
  maxOrderAmount: '',
  minTotalSpent: '',
  maxTotalSpent: '',
  minOrderCount: '',
  maxOrderCount: '',
  limit: '200',
  templateVariables: '{}',
};

type MoneyFieldKey =
  | 'minOrderAmount'
  | 'maxOrderAmount'
  | 'minTotalSpent'
  | 'maxTotalSpent';

export default function CustomerCareComposeClient() {
  const [mode, setMode] = useState<'single' | 'campaign'>('single');
  const [templates, setTemplates] = useState<MessageTemplateRecord[]>([]);
  const [campaigns, setCampaigns] = useState<MessageCampaignRecord[]>([]);
  const [dashboard, setDashboard] = useState<MessagingOperationsDashboard | null>(null);
  const [health, setHealth] = useState<MessagingOperationsHealth | null>(null);
  const [singleForm, setSingleForm] = useState(defaultSingleForm);
  const [campaignForm, setCampaignForm] = useState(defaultCampaignForm);
  const [sendingSingle, setSendingSingle] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerPick[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [previewingAudience, setPreviewingAudience] = useState(false);
  const [audiencePreview, setAudiencePreview] = useState<MessageAudiencePreviewResponse | null>(null);
  const [activeMoneyField, setActiveMoneyField] = useState<MoneyFieldKey | null>(null);
  const trimmedCustomerSearch = customerSearch.trim();

  const campaignFilters = useMemo(
    () => ({
      search: campaignForm.search || undefined,
      purchaseState: campaignForm.purchaseState || undefined,
      purchasedFrom: campaignForm.purchasedFrom || undefined,
      purchasedTo: campaignForm.purchasedTo || undefined,
      minOrderAmount: campaignForm.minOrderAmount ? Number(campaignForm.minOrderAmount) : undefined,
      maxOrderAmount: campaignForm.maxOrderAmount ? Number(campaignForm.maxOrderAmount) : undefined,
      minTotalSpent: campaignForm.minTotalSpent ? Number(campaignForm.minTotalSpent) : undefined,
      maxTotalSpent: campaignForm.maxTotalSpent ? Number(campaignForm.maxTotalSpent) : undefined,
      minOrderCount: campaignForm.minOrderCount ? Number(campaignForm.minOrderCount) : undefined,
      maxOrderCount: campaignForm.maxOrderCount ? Number(campaignForm.maxOrderCount) : undefined,
      limit: campaignForm.limit ? Number(campaignForm.limit) : undefined,
    }),
    [
      campaignForm.search,
      campaignForm.purchaseState,
      campaignForm.purchasedFrom,
      campaignForm.purchasedTo,
      campaignForm.minOrderAmount,
      campaignForm.maxOrderAmount,
      campaignForm.minTotalSpent,
      campaignForm.maxTotalSpent,
      campaignForm.minOrderCount,
      campaignForm.maxOrderCount,
      campaignForm.limit,
    ],
  );

  const hasAudienceFilters = Boolean(
    campaignForm.search ||
      campaignForm.purchaseState ||
      campaignForm.purchasedFrom ||
      campaignForm.purchasedTo ||
      campaignForm.minOrderAmount ||
      campaignForm.maxOrderAmount ||
      campaignForm.minTotalSpent ||
      campaignForm.maxTotalSpent ||
      campaignForm.minOrderCount ||
      campaignForm.maxOrderCount,
  );

  const audiencePreviewQuery = useMemo(
    () =>
      JSON.stringify({
        mode,
        channelCode: campaignForm.channelCode,
        source: campaignForm.source,
        filters: campaignFilters,
        hasAudienceFilters,
      }),
    [
      mode,
      campaignForm.channelCode,
      campaignForm.source,
      campaignFilters,
      hasAudienceFilters,
    ],
  );
  const debouncedAudiencePreviewQuery = useDebounce(audiencePreviewQuery, 400);

  const activeTemplate = useMemo(
    () =>
      templates.find((template) =>
        template.id ===
        (mode === 'single' ? singleForm.templateId : campaignForm.templateId),
      ),
    [campaignForm.templateId, mode, singleForm.templateId, templates],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const data = await fetchComposeData();
        if (cancelled) {
          return;
        }

        setTemplates(data.templates);
        setCampaigns(data.campaigns);
        setDashboard(data.dashboard);
        setHealth(data.health);
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được dữ liệu chăm sóc khách hàng');
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
  }, []);

  useEffect(() => {
    if (!trimmedCustomerSearch) {
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      setSearchingCustomers(true);
      void fetchCustomerSearchResults(trimmedCustomerSearch)
        .then((results) => {
          if (active) {
            setCustomerResults(results);
          }
        })
        .catch(() => {
          if (active) {
            setCustomerResults([]);
          }
        })
        .finally(() => {
          if (active) {
            setSearchingCustomers(false);
          }
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [trimmedCustomerSearch]);

  useEffect(() => {
    let active = true;

    async function run() {
      const query = JSON.parse(debouncedAudiencePreviewQuery) as {
        mode: 'single' | 'campaign';
        channelCode: string;
        source: string;
        filters: Record<string, unknown>;
        hasAudienceFilters: boolean;
      };

      if (query.mode !== 'campaign' || !query.hasAudienceFilters) {
        if (active) {
          setAudiencePreview(null);
          setPreviewingAudience(false);
        }
        return;
      }

      if (active) {
        setPreviewingAudience(true);
      }

      try {
        const data = await apiClientClient.post<MessageAudiencePreviewResponse>(
          '/admin/messaging/audience-preview',
          {
            channelCode: query.channelCode,
            source: query.source,
            filters: query.filters,
          },
        );

        if (active) {
          setAudiencePreview(data);
        }
      } catch {
        if (active) {
          setAudiencePreview(null);
        }
      } finally {
        if (active) {
          setPreviewingAudience(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [debouncedAudiencePreviewQuery]);

  const handleSingleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendingSingle(true);

    try {
      await apiClientClient.post('/admin/messaging/send-single', {
        channelCode: singleForm.channelCode,
        purpose: singleForm.purpose,
        recipient: singleForm.recipient,
        recipientName: singleForm.recipientName || undefined,
        userId: singleForm.userId || undefined,
        orderId: singleForm.orderId || undefined,
        templateId: singleForm.templateId || undefined,
        messageContent: singleForm.messageContent || undefined,
        templateVariables: parseJsonInput<Record<string, unknown>>(singleForm.templateVariables, {}),
      });
      alert('Đã xếp hàng gửi tin nhắn cá nhân');
      setSingleForm(defaultSingleForm);
      setCustomerSearch('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không gửi được tin cá nhân');
    } finally {
      setSendingSingle(false);
    }
  };

  const handleCampaignSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendingCampaign(true);

    try {
      await apiClientClient.post('/admin/messaging/campaigns', {
        channelCode: campaignForm.channelCode,
        purpose: campaignForm.purpose,
        name: campaignForm.name,
        source: campaignForm.source,
        templateId: campaignForm.templateId || undefined,
        messageContent: campaignForm.messageContent || undefined,
        scheduledAt: campaignForm.scheduledAt || undefined,
        templateVariables: parseJsonInput<Record<string, unknown>>(
          campaignForm.templateVariables,
          {},
        ),
        filters: campaignFilters,
      });
      alert('Đã tạo chiến dịch gửi tin');
      setCampaignForm(defaultCampaignForm);
      const data = await fetchComposeData();
      setTemplates(data.templates);
      setCampaigns(data.campaigns);
      setDashboard(data.dashboard);
      setHealth(data.health);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không tạo được chiến dịch');
    } finally {
      setSendingCampaign(false);
    }
  };

  const handleSendCampaignNow = async (campaignId: string) => {
    try {
      await apiClientClient.post(`/admin/messaging/campaigns/${campaignId}/send-now`, {});
      alert('Đã kích hoạt gửi ngay cho campaign');
      const data = await fetchComposeData();
      setTemplates(data.templates);
      setCampaigns(data.campaigns);
      setDashboard(data.dashboard);
      setHealth(data.health);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không gửi được campaign');
    }
  };

  const applyCustomer = (customer: CustomerPick) => {
    setSingleForm((prev) => ({
      ...prev,
      userId: customer.id,
      recipient: customer.phone || prev.recipient,
      recipientName: customer.name || prev.recipientName,
    }));
    setCustomerSearch(customer.name || customer.phone || customer.email || '');
    setCustomerResults([]);
  };

  const getMoneyInputValue = (field: MoneyFieldKey) => {
    const value = campaignForm[field];
    return activeMoneyField === field ? value : formatNumericInput(value);
  };

  const selectedChannelLabel =
    messagingChannelOptions.find((option) => option.value === singleForm.channelCode)?.label || 'SMS';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tổng log 30 ngày</div>
          <div className="mt-3 text-2xl font-bold text-gray-900">{dashboard?.totalCount || 0}</div>
          <div className="mt-1 text-sm text-gray-500">Attempted: {dashboard?.attemptedCount || 0}</div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tỷ lệ thành công</div>
          <div className="mt-3 text-2xl font-bold text-emerald-700">
            {formatPercent(dashboard?.successRate || 0)}
          </div>
          <div className="mt-1 text-sm text-gray-500">Success: {dashboard?.successCount || 0}</div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tỷ lệ lỗi</div>
          <div className="mt-3 text-2xl font-bold text-rose-700">
            {formatPercent(dashboard?.errorRate || 0)}
          </div>
          <div className="mt-1 text-sm text-gray-500">Failed: {dashboard?.failedCount || 0}</div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Provider health</div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {health?.providerStatuses[0]?.configured ? 'OK' : 'Thiếu config'}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {health?.providerStatuses[0]?.source || 'NONE'} / {health?.providerStatuses[0]?.providerKey || '—'}
          </div>
        </div>
      </div>

      {health && health.warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Cảnh báo vận hành</div>
          <div className="mt-2 space-y-1">
            {health.warnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        </div>
      ) : null}

      {dashboard && dashboard.channelBreakdown.length > 0 ? (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Hiệu suất theo kênh</h2>
              <p className="mt-1 text-sm text-gray-500">Hiện tại ưu tiên SMS nhưng breakdown đã sẵn sàng theo channel.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-3 py-2">Kênh</th>
                  <th className="px-3 py-2">Tổng</th>
                  <th className="px-3 py-2">Success</th>
                  <th className="px-3 py-2">Failed</th>
                  <th className="px-3 py-2">Queued</th>
                  <th className="px-3 py-2">Skipped</th>
                  <th className="px-3 py-2">Success rate</th>
                  <th className="px-3 py-2">Error rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {dashboard.channelBreakdown.map((item) => (
                  <tr key={item.channelId}>
                    <td className="px-3 py-3 font-semibold text-gray-900">{item.channelName}</td>
                    <td className="px-3 py-3 text-gray-700">{item.totalCount}</td>
                    <td className="px-3 py-3 text-emerald-700">{item.successCount}</td>
                    <td className="px-3 py-3 text-rose-700">{item.failedCount}</td>
                    <td className="px-3 py-3 text-gray-700">{item.queuedCount}</td>
                    <td className="px-3 py-3 text-gray-700">{item.skippedCount}</td>
                    <td className="px-3 py-3 text-gray-700">{formatPercent(item.successRate)}</td>
                    <td className="px-3 py-3 text-gray-700">{formatPercent(item.errorRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chăm sóc khách hàng</h1>
            <p className="mt-1 text-sm text-gray-500">
              Soạn và gửi tin nhắn theo khách cá nhân hoặc theo tập lọc. Kênh đang triển khai thực tế là SMS.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  mode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Khách cá nhân
              </button>
              <button
                type="button"
                onClick={() => setMode('campaign')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  mode === 'campaign'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tệp khách hàng
              </button>
            </div>
          </div>

          {mode === 'single' ? (
            <form
              onSubmit={handleSingleSend}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Kênh gửi</span>
                  <select
                    value={singleForm.channelCode}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, channelCode: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {messagingChannelOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                        {option.disabled ? ' (chưa hỗ trợ)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Loại gửi</span>
                  <select
                    value={singleForm.purpose}
                    onChange={(event) =>
                      setSingleForm((prev) => ({
                        ...prev,
                        purpose: event.target.value as MessagePurpose,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {messagePurposeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    {getMessagePurposeHint(singleForm.purpose as MessagePurpose)}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Template</span>
                  <select
                    value={singleForm.templateId}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, templateId: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Không dùng template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-gray-700">Chọn khách cá nhân</span>
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Nhập tên, số điện thoại hoặc email để tìm khách"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  {trimmedCustomerSearch && (searchingCustomers || customerResults.length > 0) && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                      {searchingCustomers ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Đang tìm khách hàng...</div>
                      ) : (
                        customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => applyCustomer(customer)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white"
                          >
                            <span className="font-semibold text-gray-800">
                              {customer.name || customer.phone || customer.email || customer.id}
                            </span>
                            <span className="text-gray-500">
                              {customer.phone || customer.email || 'Không có SĐT'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Số nhận</span>
                  <input
                    required
                    value={singleForm.recipient}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, recipient: event.target.value }))
                    }
                    placeholder="098..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Tên người nhận</span>
                  <input
                    value={singleForm.recipientName}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, recipientName: event.target.value }))
                    }
                    placeholder="Tên hiển thị"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">User ID</span>
                  <input
                    value={singleForm.userId}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, userId: event.target.value }))
                    }
                    placeholder="Tự điền khi cần"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Order ID</span>
                  <input
                    value={singleForm.orderId}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, orderId: event.target.value }))
                    }
                    placeholder="Nếu muốn render theo đơn hàng"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-gray-700">Nội dung tin</span>
                  <textarea
                    rows={5}
                    value={singleForm.messageContent}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, messageContent: event.target.value }))
                    }
                    placeholder="Nhập nội dung SMS hoặc dùng template"
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Biến dữ liệu cho template (JSON)
                  </span>
                  <textarea
                    rows={4}
                    value={singleForm.templateVariables}
                    onChange={(event) =>
                      setSingleForm((prev) => ({
                        ...prev,
                        templateVariables: event.target.value,
                      }))
                    }
                    placeholder={`{\n  "customer_name": "Nguyen Van A",\n  "order_code": "DH001234"\n}`}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 font-mono text-xs"
                  />
                  <p className="text-xs text-gray-500">
                    Ví dụ: <span className="font-mono">customer_name</span>,{' '}
                    <span className="font-mono">order_code</span>,{' '}
                    <span className="font-mono">voucher_value</span>
                  </p>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  Kênh hiện hành: <span className="font-semibold text-gray-800">{selectedChannelLabel}</span>
                </div>
                <button
                  type="submit"
                  disabled={sendingSingle}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {sendingSingle ? 'Đang gửi...' : 'Gửi khách cá nhân'}
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleCampaignSend}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Tên chiến dịch</span>
                  <input
                    required
                    value={campaignForm.name}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Ví dụ: SMS khách mua tháng này"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Loại gửi</span>
                  <select
                    value={campaignForm.purpose}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        purpose: event.target.value as MessagePurpose,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {messagePurposeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    {getMessagePurposeHint(campaignForm.purpose as MessagePurpose)}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Nguồn dữ liệu</span>
                  <select
                    value={campaignForm.source}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, source: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {recipientSourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Kênh gửi</span>
                  <select
                    value={campaignForm.channelCode}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, channelCode: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {messagingChannelOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                        {option.disabled ? ' (chưa hỗ trợ)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Template</span>
                  <select
                    value={campaignForm.templateId}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, templateId: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Không dùng template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-gray-700">Nội dung tin</span>
                  <textarea
                    rows={5}
                    value={campaignForm.messageContent}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, messageContent: event.target.value }))
                    }
                    placeholder="Nhập nội dung SMS hoặc để trống để dùng nội dung của template"
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Lên lịch gửi</span>
                  <input
                    type="datetime-local"
                    value={campaignForm.scheduledAt}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, scheduledAt: event.target.value }))
                    }
                    placeholder="Chọn ngày giờ nếu muốn gửi sau"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Tìm kiếm</span>
                  <input
                    value={campaignForm.search}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, search: event.target.value }))
                    }
                    placeholder="Tên, SĐT, email, mã đơn"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Trạng thái mua</span>
                  <select
                    value={campaignForm.purchaseState}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, purchaseState: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Không lọc</option>
                    {purchaseStateOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={
                          campaignForm.source === 'ORDERS' && option.value === 'NOT_PURCHASED'
                        }
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Số lượng tối đa</span>
                  <input
                    type="number"
                    min="1"
                    value={campaignForm.limit}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, limit: event.target.value }))
                    }
                    placeholder="Ví dụ: 200"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Ngày mua từ</span>
                  <input
                    type="date"
                    value={campaignForm.purchasedFrom}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, purchasedFrom: event.target.value }))
                    }
                    placeholder="Từ ngày"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Ngày mua đến</span>
                  <input
                    type="date"
                    value={campaignForm.purchasedTo}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, purchasedTo: event.target.value }))
                    }
                    placeholder="Đến ngày"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Giá trị đơn từ</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getMoneyInputValue('minOrderAmount')}
                    onFocus={() => setActiveMoneyField('minOrderAmount')}
                    onBlur={() => setActiveMoneyField((prev) => (prev === 'minOrderAmount' ? null : prev))}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        minOrderAmount: sanitizeNumericInput(event.target.value),
                      }))
                    }
                    placeholder="Ví dụ: 100.000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Giá trị đơn đến</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getMoneyInputValue('maxOrderAmount')}
                    onFocus={() => setActiveMoneyField('maxOrderAmount')}
                    onBlur={() => setActiveMoneyField((prev) => (prev === 'maxOrderAmount' ? null : prev))}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        maxOrderAmount: sanitizeNumericInput(event.target.value),
                      }))
                    }
                    placeholder="Ví dụ: 500.000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Tổng chi tiêu từ</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getMoneyInputValue('minTotalSpent')}
                    onFocus={() => setActiveMoneyField('minTotalSpent')}
                    onBlur={() => setActiveMoneyField((prev) => (prev === 'minTotalSpent' ? null : prev))}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        minTotalSpent: sanitizeNumericInput(event.target.value),
                      }))
                    }
                    placeholder="Ví dụ: 1.000.000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Tổng chi tiêu đến</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getMoneyInputValue('maxTotalSpent')}
                    onFocus={() => setActiveMoneyField('maxTotalSpent')}
                    onBlur={() => setActiveMoneyField((prev) => (prev === 'maxTotalSpent' ? null : prev))}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        maxTotalSpent: sanitizeNumericInput(event.target.value),
                      }))
                    }
                    placeholder="Ví dụ: 5.000.000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Số lần mua từ</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={campaignForm.minOrderCount}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, minOrderCount: event.target.value }))
                    }
                    placeholder="Ví dụ: 1"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-gray-700">Số lần mua đến</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={campaignForm.maxOrderCount}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, maxOrderCount: event.target.value }))
                    }
                    placeholder="Ví dụ: 10"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Biến dữ liệu cho template (JSON)
                  </span>
                  <textarea
                    rows={4}
                    value={campaignForm.templateVariables}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        templateVariables: event.target.value,
                      }))
                    }
                    placeholder={`{\n  "voucher_value": 50000,\n  "campaign_name": "Khach than thiet"\n}`}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 font-mono text-xs"
                  />
                  <p className="text-xs text-gray-500">
                    Ví dụ: <span className="font-mono">customer_name</span>,{' '}
                    <span className="font-mono">order_code</span>,{' '}
                    <span className="font-mono">voucher_value</span>
                  </p>
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={sendingCampaign}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {sendingCampaign ? 'Đang tạo...' : 'Tạo chiến dịch'}
                </button>
              </div>
            </form>
          )}

        </div>

        <div className="space-y-6">
          {mode === 'campaign' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Danh sách tệp khách hàng phù hợp</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Hệ thống tự query theo bộ lọc hiện tại sau một nhịp ngắn khi bạn nhập dữ liệu.
                  </p>
                </div>
                {previewingAudience ? (
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    Đang query...
                  </div>
                ) : audiencePreview ? (
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    {audiencePreview.totalCount} bản ghi / {audiencePreview.uniqueRecipientCount || audiencePreview.totalCount} số duy nhất
                  </div>
                ) : null}
              </div>

              {audiencePreview ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Bản ghi hợp lệ
                    </div>
                    <div className="mt-2 text-lg font-bold text-gray-900">
                      {audiencePreview.totalCount}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                      Số duy nhất sau dedupe
                    </div>
                    <div className="mt-2 text-lg font-bold text-emerald-900">
                      {audiencePreview.uniqueRecipientCount || audiencePreview.totalCount}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                      Bản ghi trùng bị gộp
                    </div>
                    <div className="mt-2 text-lg font-bold text-amber-900">
                      {audiencePreview.duplicateRecipientCount || 0}
                    </div>
                  </div>
                </div>
              ) : null}

              {!hasAudienceFilters ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500">
                  Nhập bộ lọc như tổng chi tiêu, ngày mua, giá trị đơn hoặc số lần mua để xem ngay danh sách tệp khách hàng.
                </div>
              ) : audiencePreview ? (
                <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-gray-100">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="text-left text-sm text-gray-500">
                        <th className="px-4 py-3">Khách hàng</th>
                        <th className="px-4 py-3">Liên hệ</th>
                        <th className="px-4 py-3">Đơn hàng</th>
                        <th className="px-4 py-3">Chi tiêu / Giá trị</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {audiencePreview.items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            Không có khách hàng phù hợp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        audiencePreview.items.map((item, index) => (
                          <tr key={`${item.userId || item.orderId || item.recipient}-${index}`}>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">
                                {item.customerName || item.recipientName || 'Không có tên'}
                              </div>
                              <div className="mt-1 text-gray-500">{item.recipient}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <div>{item.phone || '—'}</div>
                              <div className="mt-1 text-gray-500">{item.email || '—'}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <div>{item.orderCode || '—'}</div>
                              <div className="mt-1 text-gray-500">
                                {item.orderStatus || item.paymentStatus
                                  ? `${item.orderStatus || '—'} / ${item.paymentStatus || '—'}`
                                  : '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <div>Tổng chi tiêu: {formatCurrency(item.totalSpent)}</div>
                              <div className="mt-1 text-gray-500">
                                Giá trị đơn: {formatCurrency(item.totalAmount)}
                                {item.orderCount !== null && item.orderCount !== undefined
                                  ? ` / Số lần mua: ${item.orderCount}`
                                  : ''}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500">
                  Chưa có dữ liệu preview cho bộ lọc hiện tại.
                </div>
              )}

              <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Loại gửi hiện tại: <span className="font-semibold">{getMessagePurposeLabel(campaignForm.purpose as MessagePurpose)}</span>.
                <div className="mt-1 text-blue-800">{getMessagePurposeHint(campaignForm.purpose as MessagePurpose)}</div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Template đang có</h2>
                <p className="text-sm text-gray-500">Dùng để gửi nhanh mà không phải soạn lại.</p>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                {templates.length} template
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-gray-500">Đang tải...</div>
              ) : templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  Chưa có template SMS nào.
                </div>
              ) : (
                templates.slice(0, 5).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      if (mode === 'single') {
                        setSingleForm((prev) => ({ ...prev, templateId: template.id }));
                      } else {
                        setCampaignForm((prev) => ({ ...prev, templateId: template.id }));
                      }
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      activeTemplate?.id === template.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold text-gray-800">{template.name}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                        {template.kind}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-3 text-sm text-gray-500">{template.content}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Campaign gần đây</h2>
                <p className="text-sm text-gray-500">Theo dõi nhanh các chiến dịch SMS vừa tạo.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-gray-500">Đang tải...</div>
              ) : campaigns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  Chưa có campaign nào.
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-800">{campaign.name}</div>
                        <div className="mt-1 text-sm text-gray-500">
                          {formatDateTime(campaign.createdAt)}
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {campaign.status}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      {campaign.messageContent || 'Dùng template để gửi'}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {getMessagePurposeLabel(campaign.purpose)} • {campaign._count?.logs || 0} logs
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/customer-care/campaigns/${campaign.id}`}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-200"
                        >
                          Chi tiết
                        </Link>
                        {(campaign.status === 'READY' || campaign.status === 'SCHEDULED') && (
                          <button
                            type="button"
                            onClick={() => handleSendCampaignNow(campaign.id)}
                            className="rounded-lg bg-gray-900 px-3 py-1.5 font-semibold text-white hover:bg-black"
                          >
                            Gửi ngay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

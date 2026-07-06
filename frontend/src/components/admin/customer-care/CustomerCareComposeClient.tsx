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
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
          <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">Tổng log 30 ngày</div>
          <div className="text-[22px] font-extrabold text-gray-900">{dashboard?.totalCount || 0}</div>
          <div className="mt-[3px] text-[11.5px] text-[#6b7280]">Attempted: {dashboard?.attemptedCount || 0}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
          <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">Tỷ lệ thành công</div>
          <div className="text-[22px] font-extrabold text-[#059669]">
            {formatPercent(dashboard?.successRate || 0)}
          </div>
          <div className="mt-[3px] text-[11.5px] text-[#6b7280]">Success: {dashboard?.successCount || 0}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
          <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">Tỷ lệ lỗi</div>
          <div className="text-[22px] font-extrabold text-[#dc2626]">
            {formatPercent(dashboard?.errorRate || 0)}
          </div>
          <div className="mt-[3px] text-[11.5px] text-[#6b7280]">Failed: {dashboard?.failedCount || 0}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
          <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">Provider health</div>
          <div className="text-[22px] font-extrabold text-gray-900">
            {health?.providerStatuses[0]?.configured ? 'OK' : 'Thiếu config'}
          </div>
          <div className="mt-[3px] text-[11.5px] text-[#6b7280]">
            {health?.providerStatuses[0]?.source || 'NONE'} / {health?.providerStatuses[0]?.providerKey || '—'}
          </div>
        </div>
      </div>

      {health && health.warnings.length > 0 ? (
        <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
          <div className="text-[13px] font-bold text-[#92400e]">Cảnh báo vận hành</div>
          <div className="mt-1 space-y-1 text-[12.5px] text-[#b45309]">
            {health.warnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        </div>
      ) : null}

      {dashboard && dashboard.channelBreakdown.length > 0 ? (
        <div className="rounded-[14px] border border-[#eceef2] bg-white px-5 py-[18px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-extrabold text-gray-900">Hiệu suất theo kênh</h2>
              <p className="mt-0.5 text-[12px] text-[#9ca3af]">Hiện tại ưu tiên SMS nhưng breakdown đã sẵn sàng theo channel.</p>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#f1f5f9] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                  <th className="px-3 py-2">Kênh</th>
                  <th className="px-3 py-2 text-right">Tổng</th>
                  <th className="px-3 py-2 text-right">Success</th>
                  <th className="px-3 py-2 text-right">Failed</th>
                  <th className="px-3 py-2 text-right">Queued</th>
                  <th className="px-3 py-2 text-right">Skipped</th>
                  <th className="px-3 py-2 text-right">Success rate</th>
                  <th className="px-3 py-2 text-right">Error rate</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {dashboard.channelBreakdown.map((item) => (
                  <tr key={item.channelId} className="border-b border-[#f1f5f9] hover:bg-[#eff6ff]">
                    <td className="px-3 py-2.5 font-extrabold text-gray-900">{item.channelName}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{item.totalCount}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[#059669]">{item.successCount}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[#dc2626]">{item.failedCount}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{item.queuedCount}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{item.skippedCount}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-700">{formatPercent(item.successRate)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#dc2626]">{formatPercent(item.errorRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
            <div className="text-base font-extrabold text-gray-900">Chăm sóc khách hàng</div>
            <div className="mt-0.5 text-[12.5px] text-[#9ca3af]">
              Soạn và gửi tin nhắn theo khách cá nhân hoặc theo tập lọc. Kênh đang triển khai thực tế là SMS.
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`rounded-lg px-4 py-2 text-[13px] font-bold ${
                  mode === 'single'
                    ? 'bg-[#2563eb] text-white'
                    : 'border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]'
                }`}
              >
                Khách cá nhân
              </button>
              <button
                type="button"
                onClick={() => setMode('campaign')}
                className={`rounded-lg px-4 py-2 text-[13px] font-bold ${
                  mode === 'campaign'
                    ? 'bg-[#2563eb] text-white'
                    : 'border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]'
                }`}
              >
                Tệp khách hàng
              </button>
            </div>
          </div>

          {mode === 'single' ? (
            <form
              onSubmit={handleSingleSend}
              className="rounded-[14px] border border-[#eceef2] bg-white p-5"
            >
              <div className="grid gap-3.5 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Kênh gửi</span>
                  <select
                    value={singleForm.channelCode}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, channelCode: event.target.value }))
                    }
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  >
                    {messagingChannelOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                        {option.disabled ? ' (chưa hỗ trợ)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Loại gửi</span>
                  <select
                    value={singleForm.purpose}
                    onChange={(event) =>
                      setSingleForm((prev) => ({
                        ...prev,
                        purpose: event.target.value as MessagePurpose,
                      }))
                    }
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  >
                    {messagePurposeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#9ca3af]">
                    {getMessagePurposeHint(singleForm.purpose as MessagePurpose)}
                  </p>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Template</span>
                  <select
                    value={singleForm.templateId}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, templateId: event.target.value }))
                    }
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  >
                    <option value="">Không dùng template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="block text-[12.5px] font-bold text-gray-900">Chọn khách cá nhân</span>
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Nhập tên, số điện thoại hoặc email để tìm khách"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                  {trimmedCustomerSearch && (searchingCustomers || customerResults.length > 0) && (
                    <div className="rounded-[10px] border border-[#f1f5f9] bg-white">
                      {searchingCustomers ? (
                        <div className="px-3 py-2 text-[12.5px] text-[#9ca3af]">Đang tìm khách hàng...</div>
                      ) : (
                        customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => applyCustomer(customer)}
                            className="flex w-full items-center justify-between gap-2.5 border-b border-[#f1f5f9] px-3 py-2 text-left text-[12.5px] last:border-b-0 hover:bg-[#eff6ff]"
                          >
                            <span className="font-semibold text-gray-800">
                              {customer.name || customer.phone || customer.email || customer.id}
                            </span>
                            <span className="text-[#9ca3af]">
                              {customer.phone || customer.email || 'Không có SĐT'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Số nhận</span>
                  <input
                    required
                    value={singleForm.recipient}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, recipient: event.target.value }))
                    }
                    placeholder="098..."
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Tên người nhận</span>
                  <input
                    value={singleForm.recipientName}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, recipientName: event.target.value }))
                    }
                    placeholder="Tên hiển thị"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">User ID</span>
                  <input
                    value={singleForm.userId}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, userId: event.target.value }))
                    }
                    placeholder="Tự điền khi cần"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Order ID</span>
                  <input
                    value={singleForm.orderId}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, orderId: event.target.value }))
                    }
                    placeholder="Nếu muốn render theo đơn hàng"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="block text-[12.5px] font-bold text-gray-900">Nội dung tin</span>
                  <textarea
                    rows={5}
                    value={singleForm.messageContent}
                    onChange={(event) =>
                      setSingleForm((prev) => ({ ...prev, messageContent: event.target.value }))
                    }
                    placeholder="Nhập nội dung SMS hoặc dùng template"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-3 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="block text-[12.5px] font-bold text-gray-900">
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
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-3 font-mono text-[12.5px] outline-none focus:border-[#2563eb]"
                  />
                  <p className="text-[11px] text-[#9ca3af]">
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
                  className="rounded-[10px] bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {sendingSingle ? 'Đang gửi...' : 'Gửi khách cá nhân'}
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleCampaignSend}
              className="rounded-[14px] border border-[#eceef2] bg-white p-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Tên chiến dịch</span>
                  <input
                    required
                    value={campaignForm.name}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Ví dụ: SMS khách mua tháng này"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Loại gửi</span>
                  <select
                    value={campaignForm.purpose}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({
                        ...prev,
                        purpose: event.target.value as MessagePurpose,
                      }))
                    }
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  >
                    {messagePurposeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#9ca3af]">
                    {getMessagePurposeHint(campaignForm.purpose as MessagePurpose)}
                  </p>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Nguồn dữ liệu</span>
                  <select
                    value={campaignForm.source}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, source: event.target.value }))
                    }
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  >
                    {recipientSourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Kênh gửi</span>
                  <select
                    value={campaignForm.channelCode}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, channelCode: event.target.value }))
                    }
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  >
                    {messagingChannelOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                        {option.disabled ? ' (chưa hỗ trợ)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Template</span>
                  <select
                    value={campaignForm.templateId}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, templateId: event.target.value }))
                    }
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  >
                    <option value="">Không dùng template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="block text-[12.5px] font-bold text-gray-900">Nội dung tin</span>
                  <textarea
                    rows={5}
                    value={campaignForm.messageContent}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, messageContent: event.target.value }))
                    }
                    placeholder="Nhập nội dung SMS hoặc để trống để dùng nội dung của template"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-3 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Lên lịch gửi</span>
                  <input
                    type="datetime-local"
                    value={campaignForm.scheduledAt}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, scheduledAt: event.target.value }))
                    }
                    placeholder="Chọn ngày giờ nếu muốn gửi sau"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Tìm kiếm</span>
                  <input
                    value={campaignForm.search}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, search: event.target.value }))
                    }
                    placeholder="Tên, SĐT, email, mã đơn"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Trạng thái mua</span>
                  <select
                    value={campaignForm.purchaseState}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, purchaseState: event.target.value }))
                    }
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
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

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Số lượng tối đa</span>
                  <input
                    type="number"
                    min="1"
                    value={campaignForm.limit}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, limit: event.target.value }))
                    }
                    placeholder="Ví dụ: 200"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Ngày mua từ</span>
                  <input
                    type="date"
                    value={campaignForm.purchasedFrom}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, purchasedFrom: event.target.value }))
                    }
                    placeholder="Từ ngày"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Ngày mua đến</span>
                  <input
                    type="date"
                    value={campaignForm.purchasedTo}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, purchasedTo: event.target.value }))
                    }
                    placeholder="Đến ngày"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Giá trị đơn từ</span>
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
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Giá trị đơn đến</span>
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
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Tổng chi tiêu từ</span>
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
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Tổng chi tiêu đến</span>
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
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Số lần mua từ</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={campaignForm.minOrderCount}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, minOrderCount: event.target.value }))
                    }
                    placeholder="Ví dụ: 1"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[12.5px] font-bold text-gray-900">Số lần mua đến</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={campaignForm.maxOrderCount}
                    onChange={(event) =>
                      setCampaignForm((prev) => ({ ...prev, maxOrderCount: event.target.value }))
                    }
                    placeholder="Ví dụ: 10"
                    className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="block text-[12.5px] font-bold text-gray-900">
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
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-3 font-mono text-[12.5px] outline-none focus:border-[#2563eb]"
                  />
                  <p className="text-[11px] text-[#9ca3af]">
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
                  className="rounded-[10px] bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {sendingCampaign ? 'Đang tạo...' : 'Tạo chiến dịch'}
                </button>
              </div>
            </form>
          )}

        </div>

        <div className="flex flex-col gap-4">
          {mode === 'campaign' ? (
            <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-extrabold text-gray-900">Danh sách tệp khách hàng phù hợp</h2>
                  <p className="mt-0.5 text-[12px] text-[#9ca3af]">
                    Hệ thống tự query theo bộ lọc hiện tại sau một nhịp ngắn khi bạn nhập dữ liệu.
                  </p>
                </div>
                {previewingAudience ? (
                  <div className="rounded-[10px] bg-[#eff6ff] px-3.5 py-2 text-[12.5px] font-bold text-[#2563eb]">
                    Đang query...
                  </div>
                ) : audiencePreview ? (
                  <div className="rounded-[10px] bg-[#eff6ff] px-3.5 py-2 text-[12.5px] font-bold text-[#2563eb]">
                    {audiencePreview.totalCount} bản ghi / {audiencePreview.uniqueRecipientCount || audiencePreview.totalCount} số duy nhất
                  </div>
                ) : null}
              </div>

              {audiencePreview ? (
                <div className="mt-3.5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[12px] border border-[#eceef2] bg-white px-4 py-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                      Bản ghi hợp lệ
                    </div>
                    <div className="mt-1.5 text-lg font-extrabold text-gray-900">
                      {audiencePreview.totalCount}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-[#a7f3d0] bg-[#ecfdf5] px-4 py-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#059669]">
                      Số duy nhất sau dedupe
                    </div>
                    <div className="mt-1.5 text-lg font-extrabold text-[#047857]">
                      {audiencePreview.uniqueRecipientCount || audiencePreview.totalCount}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#c2410c]">
                      Bản ghi trùng bị gộp
                    </div>
                    <div className="mt-1.5 text-lg font-extrabold text-[#92400e]">
                      {audiencePreview.duplicateRecipientCount || 0}
                    </div>
                  </div>
                </div>
              ) : null}

              {!hasAudienceFilters ? (
                <div className="mt-3.5 rounded-[10px] border border-[#eceef2] px-4 py-8 text-[12.5px] leading-[1.6] text-[#6b7280]">
                  Nhập bộ lọc như tổng chi tiêu, ngày mua, giá trị đơn hoặc số lần mua để xem ngay danh sách tệp khách hàng.
                </div>
              ) : audiencePreview ? (
                <div className="mt-3.5 overflow-x-auto rounded-[10px] border border-[#eceef2]">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-[#f1f5f9] bg-[#f9fafb] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                        <th className="px-4 py-2.5">Khách hàng</th>
                        <th className="px-4 py-2.5">Liên hệ</th>
                        <th className="px-4 py-2.5">Đơn hàng</th>
                        <th className="px-4 py-2.5">Chi tiêu / Giá trị</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13px]">
                      {audiencePreview.items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[#9ca3af]">
                            Không có khách hàng phù hợp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        audiencePreview.items.map((item, index) => (
                          <tr key={`${item.userId || item.orderId || item.recipient}-${index}`} className="border-b border-[#f1f5f9] hover:bg-[#eff6ff]">
                            <td className="px-4 py-3">
                              <div className="font-bold text-gray-900">
                                {item.customerName || item.recipientName || 'Không có tên'}
                              </div>
                              <div className="mt-1 font-mono text-[12px] text-[#6b7280]">{item.recipient}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <div className="font-mono text-[12px]">{item.phone || '—'}</div>
                              <div className="mt-1 text-[#9ca3af]">{item.email || '—'}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <div>{item.orderCode || '—'}</div>
                              <div className="mt-1 text-[#9ca3af]">
                                {item.orderStatus || item.paymentStatus
                                  ? `${item.orderStatus || '—'} / ${item.paymentStatus || '—'}`
                                  : '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <div>Tổng chi tiêu: {formatCurrency(item.totalSpent)}</div>
                              <div className="mt-1 text-[#9ca3af]">
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
                <div className="mt-3.5 rounded-[10px] border border-[#eceef2] px-4 py-8 text-[12.5px] text-[#6b7280]">
                  Chưa có dữ liệu preview cho bộ lọc hiện tại.
                </div>
              )}

              <div className="mt-3.5 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3.5 py-[11px] text-[12.5px] leading-[1.6]">
                <span className="font-bold text-[#1d4ed8]">Loại gửi hiện tại: {getMessagePurposeLabel(campaignForm.purpose as MessagePurpose)}.</span>
                <div className="mt-0.5 text-[#2563eb]">{getMessagePurposeHint(campaignForm.purpose as MessagePurpose)}</div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-extrabold text-gray-900">Template đang có</h2>
                <p className="mt-0.5 text-[12px] text-[#9ca3af]">Dùng để gửi nhanh mà không phải soạn lại.</p>
              </div>
              <span className="rounded-full bg-[#e8ecff] px-2.5 py-[3px] text-[11px] font-bold text-[#3c55e6]">
                {templates.length} template
              </span>
            </div>
            <div className="mt-3.5 space-y-2.5">
              {loading ? (
                <div className="text-[13px] text-[#9ca3af]">Đang tải...</div>
              ) : templates.length === 0 ? (
                <div className="rounded-[10px] border border-[#eceef2] px-4 py-6 text-[12.5px] text-[#9ca3af]">
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
                    className={`w-full rounded-[10px] border px-4 py-3 text-left transition-colors ${
                      activeTemplate?.id === template.id
                        ? 'border-[#2563eb] bg-[#eff6ff]'
                        : 'border-[#eceef2] hover:bg-[#f9fafb]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[13px] font-bold text-gray-800">{template.name}</span>
                      <span className="rounded-md bg-[#f1f5f9] px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.05em] text-[#64748b]">
                        {template.kind}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-3 text-[12px] leading-[1.55] text-[#6b7280]">{template.content}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-extrabold text-gray-900">Campaign gần đây</h2>
                <p className="mt-0.5 text-[12px] text-[#9ca3af]">Theo dõi nhanh các chiến dịch SMS vừa tạo.</p>
              </div>
            </div>
            <div className="mt-3.5 space-y-2.5">
              {loading ? (
                <div className="text-[13px] text-[#9ca3af]">Đang tải...</div>
              ) : campaigns.length === 0 ? (
                <div className="rounded-[10px] border border-[#eceef2] px-4 py-6 text-[12.5px] text-[#9ca3af]">
                  Chưa có campaign nào.
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-[10px] border border-[#eceef2] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[13px] font-bold text-gray-800">{campaign.name}</div>
                        <div className="mt-1 text-[12px] text-[#9ca3af]">
                          {formatDateTime(campaign.createdAt)}
                        </div>
                      </div>
                      <span className="rounded-full bg-[#f1f5f9] px-2.5 py-[3px] text-[11px] font-bold text-[#64748b]">
                        {campaign.status}
                      </span>
                    </div>
                    <div className="mt-3 text-[12.5px] text-[#4b5563]">
                      {campaign.messageContent || 'Dùng template để gửi'}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[12.5px] text-[#9ca3af]">
                      <span>
                        {getMessagePurposeLabel(campaign.purpose)} • {campaign._count?.logs || 0} logs
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/customer-care/campaigns/${campaign.id}`}
                          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
                        >
                          Chi tiết
                        </Link>
                        {(campaign.status === 'READY' || campaign.status === 'SCHEDULED') && (
                          <button
                            type="button"
                            onClick={() => handleSendCampaignNow(campaign.id)}
                            className="rounded-lg bg-[#111827] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#374151]"
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

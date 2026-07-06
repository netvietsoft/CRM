'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  automationExecutionStatusOptions,
  formatDateTime,
  MessageAutomationExecutionRecord,
  MessageAutomationRuleDetailRecord,
  PaginatedResponse,
  triggerTypeOptions,
} from '@/lib/adminMessaging';

interface CustomerCareAutomationDetailClientProps {
  ruleId: string;
  initialRule: MessageAutomationRuleDetailRecord | null;
  initialExecutions: PaginatedResponse<MessageAutomationExecutionRecord>;
}

function getExecutionStatusClassName(status: string) {
  if (status === 'PENDING') {
    return 'bg-[#fef3c7] text-[#92400e]';
  }
  if (status === 'QUEUED') {
    return 'bg-[#dbeafe] text-[#1d4ed8]';
  }
  if (status === 'SENT') {
    return 'bg-[#d1fae5] text-[#047857]';
  }
  if (status === 'SKIPPED') {
    return 'bg-[#f1f5f9] text-[#64748b]';
  }
  if (status === 'FAILED') {
    return 'bg-[#fee2e2] text-[#dc2626]';
  }
  return 'bg-[#f1f5f9] text-[#64748b]';
}

function getExecutionStatusLabel(status: string) {
  return automationExecutionStatusOptions.find((option) => option.value === status)?.label || status;
}

function getTriggerLabel(value: string) {
  return triggerTypeOptions.find((option) => option.value === value)?.label || value;
}

export default function CustomerCareAutomationDetailClient({
  ruleId,
  initialRule,
  initialExecutions,
}: CustomerCareAutomationDetailClientProps) {
  const [rule, setRule] = useState<MessageAutomationRuleDetailRecord | null>(initialRule);
  const [executions, setExecutions] = useState<MessageAutomationExecutionRecord[]>(
    initialExecutions.items || [],
  );
  const [pagination, setPagination] = useState(initialExecutions.pagination);
  const [loading, setLoading] = useState(!initialRule);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedStatus = useDebounce(status, 200);
  const firstExecutionLoadRef = useRef(true);

  useEffect(() => {
    if (firstExecutionLoadRef.current && !debouncedStatus && page === 1) {
      firstExecutionLoadRef.current = false;
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);

      try {
        const data = await apiClientClient.get<PaginatedResponse<MessageAutomationExecutionRecord>>(
          `/admin/messaging/automation-rules/${ruleId}/executions`,
          {
            params: {
              page,
              limit: 20,
              status: debouncedStatus || undefined,
            },
          },
        );

        if (!cancelled) {
          setExecutions(data.items || []);
          setPagination(data.pagination);
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được execution log');
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
  }, [debouncedStatus, page, ruleId]);

  useEffect(() => {
    if (initialRule) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const ruleData = await apiClientClient.get<MessageAutomationRuleDetailRecord>(
          `/admin/messaging/automation-rules/${ruleId}`,
        );

        if (!cancelled) {
          setRule(ruleData);
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được rule tự động');
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [initialRule, ruleId]);

  return (
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Chi tiết tin tự động</h1>
            <p className="mt-1 text-[12.5px] text-[#9ca3af]">
              Theo dõi rule, điều kiện áp dụng và lịch sử kích hoạt thực tế.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rule ? (
              <Link
                href={`/admin/customer-care/automations/${rule.id}/edit`}
                className="rounded-[10px] bg-[#2563eb] px-[18px] py-2.5 text-[13px] font-bold text-white hover:bg-[#1d4ed8]"
              >
                Sửa rule
              </Link>
            ) : null}
            <Link
              href="/admin/customer-care/automations"
              className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        {!rule ? (
          <div className="px-4 py-8 text-center text-[#9ca3af]">Không tìm thấy automation rule.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5 lg:col-span-2">
                <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#9ca3af]">
                  Rule
                </div>
                <div className="mt-2 text-[15px] font-extrabold text-gray-900">{rule.name}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[#6b7280]">
                  <span className="rounded-md bg-[#f3f4f6] px-2 py-[3px] text-[11px] font-bold text-[#4b5563]">
                    {rule.channel.code}
                  </span>
                  <span className="rounded-md bg-[#f3f4f6] px-2 py-[3px] text-[11px] font-bold text-[#4b5563]">
                    {getTriggerLabel(rule.triggerType)}
                  </span>
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#9ca3af]">
                  Lần chạy gần nhất
                </div>
                <div className="mt-2 text-[13px] font-bold text-gray-900">
                  {formatDateTime(rule.lastRunAt)}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#9ca3af]">
                  Trạng thái
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
                      rule.isActive ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#f1f5f9] text-[#64748b]'
                    }`}
                  >
                    {rule.isActive ? 'Đang bật' : 'Đã tắt'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#9ca3af]">
                  Template
                </div>
                <div className="mt-2 text-[13px] font-semibold text-gray-900">
                  {rule.template?.name || 'Tự soạn nội dung'}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#9ca3af]">
                  Nhà cung cấp
                </div>
                <div className="mt-2 text-[13px] font-semibold text-gray-900">
                  {rule.providerConfig?.name || 'Dùng cấu hình mặc định'}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#9ca3af]">
                  Tổng execution
                </div>
                <div className="mt-2 text-[22px] font-extrabold text-gray-900">{pagination.total}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5 text-[13px] text-[#6b7280]">
                Người tạo:{' '}
                <span className="font-semibold text-gray-900">
                  {rule.createdBy?.name || rule.createdBy?.phone || 'Không rõ'}
                </span>
              </div>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] lg:max-w-xs"
              >
                <option value="">Tất cả trạng thái execution</option>
                {automationExecutionStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-[14px] border border-[#eceef2]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f1f5f9] bg-[#f9fafb] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                    <th className="px-4 py-2.5">Khách / đơn</th>
                    <th className="px-4 py-2.5">Trigger key</th>
                    <th className="px-4 py-2.5">Trạng thái</th>
                    <th className="px-4 py-2.5">Lý do</th>
                    <th className="px-4 py-2.5">Log gửi tin</th>
                    <th className="px-4 py-2.5">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">
                        Đang tải execution log...
                      </td>
                    </tr>
                  ) : executions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">
                        Chưa có execution nào.
                      </td>
                    </tr>
                  ) : (
                    executions.map((execution) => (
                      <tr key={execution.id} className="border-b border-[#f1f5f9] hover:bg-[#eff6ff]">
                        <td className="px-4 py-3.5 text-[13px]">
                          <div className="font-semibold text-gray-900">
                            {execution.user?.name || execution.messageLog?.recipientName || 'Không có tên'}
                          </div>
                          <div className="mt-1 font-mono text-[12px] text-[#6b7280]">
                            {execution.order?.orderCode ||
                              execution.user?.phone ||
                              execution.messageLog?.recipientValue ||
                              '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-mono text-[#374151]">{execution.triggerKey}</td>
                        <td className="px-4 py-3.5 text-[13px]">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-bold ${getExecutionStatusClassName(execution.status)}`}
                          >
                            {getExecutionStatusLabel(execution.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-[#6b7280]">{execution.reason || '—'}</td>
                        <td className="px-4 py-3.5 text-[13px]">
                          {execution.messageLog?.id ? (
                            <Link
                              href={`/admin/customer-care/logs/${execution.messageLog.id}`}
                              className="font-semibold text-[#2563eb] hover:underline"
                            >
                              {getExecutionStatusLabel(execution.status)}
                            </Link>
                          ) : (
                            <span className="text-[#9ca3af]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-[#6b7280]">
                          <div>Tạo: {formatDateTime(execution.createdAt)}</div>
                          <div className="mt-1">Chạy: {formatDateTime(execution.executedAt)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[13px] text-[#6b7280]">
                Trang {pagination.page}/{Math.max(pagination.totalPages, 1)} • {pagination.total} bản ghi
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  disabled={page >= Math.max(pagination.totalPages, 1)}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            </div>

            <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
              <div className="text-[12px] font-bold uppercase tracking-[0.05em] text-[#9ca3af]">
                Trigger config / audience filter / metadata
              </div>
              <pre className="mt-3 overflow-x-auto rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-4 font-mono text-[12px] text-[#374151]">
                {JSON.stringify(
                  {
                    triggerConfig: rule.triggerConfig || {},
                    audienceFilter: rule.audienceFilter || {},
                    metadata: rule.metadata || {},
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

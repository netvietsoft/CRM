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
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  if (status === 'QUEUED') {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }
  if (status === 'SENT') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (status === 'SKIPPED') {
    return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
  if (status === 'FAILED') {
    return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
  return 'bg-gray-100 text-gray-700 ring-gray-200';
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
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết tin tự động</h1>
            <p className="mt-1 text-sm text-gray-500">
              Theo dõi rule, điều kiện áp dụng và lịch sử kích hoạt thực tế.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rule ? (
              <Link
                href={`/admin/customer-care/automations/${rule.id}/edit`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sửa rule
              </Link>
            ) : null}
            <Link
              href="/admin/customer-care/automations"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {!rule ? (
          <div className="py-8 text-center text-sm text-gray-500">Không tìm thấy automation rule.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-xl bg-gray-50 p-4 lg:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Rule
                </div>
                <div className="mt-2 text-lg font-bold text-gray-900">{rule.name}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span>{rule.channel.code}</span>
                  <span>•</span>
                  <span>{getTriggerLabel(rule.triggerType)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Lần chạy gần nhất
                </div>
                <div className="mt-2 text-sm font-bold text-blue-900">
                  {formatDateTime(rule.lastRunAt)}
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                  Trạng thái
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      rule.isActive ? 'bg-white text-emerald-700' : 'bg-white text-gray-600'
                    }`}
                  >
                    {rule.isActive ? 'Đang bật' : 'Đã tắt'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Template
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {rule.template?.name || 'Tự soạn nội dung'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Nhà cung cấp
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {rule.providerConfig?.name || 'Dùng cấu hình mặc định'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Tổng execution
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{pagination.total}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm lg:max-w-xs"
              >
                <option value="">Tất cả trạng thái execution</option>
                {automationExecutionStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Khách / đơn</th>
                    <th className="px-4 py-3">Trigger key</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Lý do</th>
                    <th className="px-4 py-3">Log gửi tin</th>
                    <th className="px-4 py-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        Đang tải execution log...
                      </td>
                    </tr>
                  ) : executions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        Chưa có execution nào.
                      </td>
                    </tr>
                  ) : (
                    executions.map((execution) => (
                      <tr key={execution.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {execution.user?.name || execution.messageLog?.recipientName || 'Không có tên'}
                          </div>
                          <div className="mt-1 text-gray-500">
                            {execution.order?.orderCode ||
                              execution.user?.phone ||
                              execution.messageLog?.recipientValue ||
                              '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{execution.triggerKey}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getExecutionStatusClassName(execution.status)}`}
                          >
                            {getExecutionStatusLabel(execution.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{execution.reason || '—'}</td>
                        <td className="px-4 py-3">
                          {execution.messageLog?.id ? (
                            <Link
                              href={`/admin/customer-care/logs/${execution.messageLog.id}`}
                              className="font-semibold text-blue-700 hover:underline"
                            >
                              {getExecutionStatusLabel(execution.status)}
                            </Link>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
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
              <div className="text-sm text-gray-500">
                Trang {pagination.page}/{Math.max(pagination.totalPages, 1)} • {pagination.total} bản ghi
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  disabled={page >= Math.max(pagination.totalPages, 1)}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Trigger config / audience filter / metadata
              </div>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-4 text-xs text-gray-700 ring-1 ring-gray-200">
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

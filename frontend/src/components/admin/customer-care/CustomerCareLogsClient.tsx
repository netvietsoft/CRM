'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  formatDateTime,
  getMessagePurposeLabel,
  logStatusOptions,
  MessageLogRecord,
  PaginatedResponse,
} from '@/lib/adminMessaging';
import { createXlsxBlob } from '@/lib/spreadsheet';

interface CustomerCareLogsClientProps {
  initialData: PaginatedResponse<MessageLogRecord>;
}

async function fetchLogs(params: {
  page: number;
  limit: number;
  channelCode: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return apiClientClient.get<PaginatedResponse<MessageLogRecord>>('/admin/messaging/logs', {
    params,
  });
}

function getLogStatusLabel(status: string) {
  return logStatusOptions.find((option) => option.value === status)?.label || status;
}

function getLogStatusClassName(status: string) {
  if (status === 'QUEUED') {
    return 'bg-[#fef3c7] text-[#92400e]';
  }
  if (status === 'SENT') {
    return 'bg-[#dbeafe] text-[#1d4ed8]';
  }
  if (status === 'DELIVERED' || status === 'READ') {
    return 'bg-[#d1fae5] text-[#047857]';
  }
  if (status === 'FAILED') {
    return 'bg-[#fee2e2] text-[#dc2626]';
  }
  if (status === 'SKIPPED') {
    return 'bg-[#f1f5f9] text-[#64748b]';
  }
  return 'bg-[#f1f5f9] text-[#64748b]';
}

function getLogIssueSummary(log: MessageLogRecord) {
  if (log.metadata?.skippedReason === 'RECIPIENT_COOLDOWN') {
    const latestMessageAt =
      typeof log.metadata.latestMessageAt === 'string' ? log.metadata.latestMessageAt : null;
    return latestMessageAt
      ? `Bị chặn cooldown, lần gần nhất: ${formatDateTime(latestMessageAt)}`
      : 'Bị chặn cooldown chống spam';
  }

  if (log.metadata?.skippedReason === 'RECIPIENT_OPTED_OUT') {
    return 'Người nhận đã từ chối nhận tin';
  }

  return log.errorMessage || log.errorCode || 'Không có lỗi';
}

export default function CustomerCareLogsClient({ initialData }: CustomerCareLogsClientProps) {
  const [logs, setLogs] = useState<MessageLogRecord[]>(initialData.items || []);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [loading, setLoading] = useState((initialData.items || []).length === 0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const firstLoadRef = useRef(true);
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);

      try {
        const data = await fetchLogs({
          page,
          limit: 20,
          channelCode: 'SMS',
          status: status || undefined,
          search: debouncedSearch.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });

        if (!cancelled) {
          setLogs(data.items || []);
          setPagination(data.pagination);
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được log tin nhắn');
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
  }, [dateFrom, dateTo, debouncedSearch, page, status]);

  const handleExport = async () => {
    setExporting(true);

    try {
      const exportData = await fetchLogs({
        page: 1,
        limit: 5000,
        channelCode: 'SMS',
        status: status || undefined,
        search: debouncedSearch.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      const blob = await createXlsxBlob(
        'Message Logs',
        [
          { key: 'createdAt', label: 'Thời điểm tạo log' },
          { key: 'sentAt', label: 'Thời điểm gửi' },
          { key: 'channelCode', label: 'Kênh' },
          { key: 'campaignName', label: 'Campaign' },
          { key: 'purpose', label: 'Loại gửi' },
          { key: 'recipientName', label: 'Tên người nhận' },
          { key: 'recipientValue', label: 'Số nhận tin' },
          { key: 'status', label: 'Trạng thái' },
          { key: 'providerMessageId', label: 'Mã provider' },
          { key: 'orderCode', label: 'Mã đơn' },
          { key: 'createdBy', label: 'Người tạo' },
          { key: 'errorCode', label: 'Mã lỗi' },
          { key: 'errorMessage', label: 'Nội dung lỗi' },
          { key: 'content', label: 'Nội dung tin' },
        ],
        (exportData.items || []).map((item) => ({
          createdAt: item.createdAt,
          sentAt: item.sentAt || '',
          channelCode: item.channel.code,
          campaignName: item.campaign?.name || '',
          purpose: getMessagePurposeLabel(item.purpose),
          recipientName: item.recipientName || '',
          recipientValue: item.recipientValue,
          status: getLogStatusLabel(item.status),
          providerMessageId: item.providerMessageId || '',
          orderCode: item.order?.orderCode || '',
          createdBy: item.createdBy?.name || item.createdBy?.phone || '',
          errorCode: item.errorCode || '',
          errorMessage: item.errorMessage || '',
          content: item.content,
        })),
      );
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `message-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không xuất được file XLSX');
    } finally {
      setExporting(false);
    }
  };

  const handleRetry = async (logId: string) => {
    setRetryingLogId(logId);

    try {
      await apiClientClient.post(`/admin/messaging/logs/${logId}/retry`, {});
      const data = await fetchLogs({
        page,
        limit: 20,
        channelCode: 'SMS',
        status: status || undefined,
        search: debouncedSearch.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setLogs(data.items || []);
      setPagination(data.pagination);
      alert('Đã xếp hàng retry log lỗi');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không retry được log');
    } finally {
      setRetryingLogId(null);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <h1 className="text-lg font-extrabold text-gray-900">Tin đã gửi</h1>
        <p className="mt-1 text-[12.5px] text-[#9ca3af]">
          Theo dõi log gửi SMS thực tế, kiểm tra lỗi, retry thủ công và xuất Excel chuẩn.
        </p>
      </div>

      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tên khách, số điện thoại, nội dung"
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] xl:col-span-2"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
          >
            <option value="">Tất cả trạng thái</option>
            {logStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[12.5px] outline-none focus:border-[#2563eb]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[12.5px] outline-none focus:border-[#2563eb]"
          />
          <div className="flex items-center justify-center rounded-[10px] bg-[#eff6ff] px-3.5 py-2 text-[12.5px] font-bold text-[#2563eb]">
            {pagination.total} log
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center justify-center rounded-[9px] bg-[#111827] px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-[#374151] disabled:opacity-60"
          >
            {exporting ? 'Đang xuất...' : 'Xuất Excel (XLSX)'}
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#f1f5f9] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                <th className="px-4 py-2.5">Người nhận</th>
                <th className="px-4 py-2.5">Nguồn gửi</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5">Thời gian</th>
                <th className="px-4 py-2.5">Lỗi</th>
                <th className="px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">
                    Đang tải log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">
                    Chưa có log nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#f1f5f9] align-top text-[13px] hover:bg-[#eff6ff]">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">
                        {log.recipientName || 'Không có tên'}
                      </div>
                      <div className="mt-1 font-mono text-[#6b7280]">{log.recipientValue}</div>
                      {log.user?.id ? (
                        <Link
                          href={`/admin/customers/${log.user.id}`}
                          className="mt-2 inline-block text-[12px] font-bold text-[#2563eb] hover:text-[#1d4ed8]"
                        >
                          Xem khách hàng
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">
                        {log.campaign?.name || log.automationRule?.name || 'Gửi thủ công'}
                      </div>
                      <div className="mt-1 max-w-sm line-clamp-2 text-[#6b7280]">{log.content}</div>
                      <div className="mt-1 text-[11px] font-bold text-[#9ca3af]">
                        {getMessagePurposeLabel(log.purpose)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                        {log.campaign?.id ? (
                          <Link
                            href={`/admin/customer-care/campaigns/${log.campaign.id}`}
                            className="font-bold text-[#2563eb] hover:text-[#1d4ed8]"
                          >
                            Campaign
                          </Link>
                        ) : null}
                        {log.automationRule?.id ? (
                          <Link
                            href={`/admin/customer-care/automations/${log.automationRule.id}`}
                            className="font-bold text-[#2563eb] hover:text-[#1d4ed8]"
                          >
                            Tin tự động
                          </Link>
                        ) : null}
                        {log.order?.id ? (
                          <Link
                            href={`/admin/orders/${log.order.id}`}
                            className="font-bold text-[#2563eb] hover:text-[#1d4ed8]"
                          >
                            Đơn {log.order.orderCode}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-bold ${getLogStatusClassName(log.status)}`}
                      >
                        {getLogStatusLabel(log.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-[#374151]">Tạo: {formatDateTime(log.createdAt)}</div>
                      <div className="mt-1 text-[#6b7280]">Gửi: {formatDateTime(log.sentAt)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[#6b7280]">
                      <div className="max-w-xs">
                        {getLogIssueSummary(log)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        {log.status === 'FAILED' ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(log.id)}
                            disabled={retryingLogId === log.id}
                            className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-[12px] font-bold text-[#b45309] hover:bg-[#fef3c7] disabled:opacity-60"
                          >
                            {retryingLogId === log.id ? 'Đang retry...' : 'Retry'}
                          </button>
                        ) : null}
                        <Link
                          href={`/admin/customer-care/logs/${log.id}`}
                          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-[12.5px] text-[#9ca3af]">
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
      </div>
    </div>
  );
}

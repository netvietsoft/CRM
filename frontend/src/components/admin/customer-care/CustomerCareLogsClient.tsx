'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  formatDateTime,
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
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  if (status === 'SENT') {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }
  if (status === 'DELIVERED' || status === 'READ') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (status === 'FAILED') {
    return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
  if (status === 'SKIPPED') {
    return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
  return 'bg-gray-100 text-gray-700 ring-gray-200';
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
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Tin đã gửi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi log gửi SMS thực tế, kiểm tra lỗi, retry thủ công và xuất Excel chuẩn.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tên khách, số điện thoại, nội dung"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm xl:col-span-2"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
            {pagination.total} log
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {exporting ? 'Đang xuất...' : 'Xuất Excel (XLSX)'}
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3">Người nhận</th>
                <th className="px-4 py-3">Nguồn gửi</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Lỗi</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Đang tải log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Chưa có log nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">
                        {log.recipientName || 'Không có tên'}
                      </div>
                      <div className="mt-1 text-gray-500">{log.recipientValue}</div>
                      {log.user?.id ? (
                        <Link
                          href={`/admin/customers/${log.user.id}`}
                          className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Xem khách hàng
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">
                        {log.campaign?.name || log.automationRule?.name || 'Gửi thủ công'}
                      </div>
                      <div className="mt-1 max-w-sm line-clamp-2 text-gray-500">{log.content}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        {log.campaign?.id ? (
                          <Link
                            href={`/admin/customer-care/campaigns/${log.campaign.id}`}
                            className="font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Campaign
                          </Link>
                        ) : null}
                        {log.automationRule?.id ? (
                          <Link
                            href={`/admin/customer-care/automations/${log.automationRule.id}`}
                            className="font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Tin tự động
                          </Link>
                        ) : null}
                        {log.order?.id ? (
                          <Link
                            href={`/admin/orders/${log.order.id}`}
                            className="font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Đơn {log.order.orderCode}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getLogStatusClassName(log.status)}`}
                      >
                        {getLogStatusLabel(log.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-gray-700">Tạo: {formatDateTime(log.createdAt)}</div>
                      <div className="mt-1 text-gray-500">Gửi: {formatDateTime(log.sentAt)}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-500">
                      <div className="max-w-xs">
                        {log.errorMessage || log.errorCode || 'Không có lỗi'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {log.status === 'FAILED' ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(log.id)}
                            disabled={retryingLogId === log.id}
                            className="rounded-lg bg-amber-100 px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                          >
                            {retryingLogId === log.id ? 'Đang retry...' : 'Retry'}
                          </button>
                        ) : null}
                        <Link
                          href={`/admin/customer-care/logs/${log.id}`}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-200"
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
      </div>
    </div>
  );
}

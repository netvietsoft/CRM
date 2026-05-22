'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatDateTime, logStatusOptions, MessageLogRecord } from '@/lib/adminMessaging';

interface CustomerCareLogDetailClientProps {
  logId: string;
  initialLog: MessageLogRecord | null;
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

export default function CustomerCareLogDetailClient({
  logId,
  initialLog,
}: CustomerCareLogDetailClientProps) {
  const [log, setLog] = useState<MessageLogRecord | null>(initialLog);
  const [loading, setLoading] = useState(!initialLog);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (initialLog) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const data = await apiClientClient.get<MessageLogRecord>(`/admin/messaging/logs/${logId}`);
        if (!cancelled) {
          setLog(data);
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được log');
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
  }, [initialLog, logId]);

  const handleRetry = async () => {
    setRetrying(true);

    try {
      await apiClientClient.post(`/admin/messaging/logs/${logId}/retry`, {});
      const data = await apiClientClient.get<MessageLogRecord>(`/admin/messaging/logs/${logId}`);
      setLog(data);
      alert('Đã xếp hàng retry log lỗi');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không retry được log');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết tin đã gửi</h1>
            <p className="mt-1 text-sm text-gray-500">
              Xem trạng thái gửi, nội dung SMS, dữ liệu đã render và các liên kết nghiệp vụ liên quan.
            </p>
          </div>
          <Link
            href="/admin/customer-care/logs"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Đang tải chi tiết log...</div>
        ) : !log ? (
          <div className="py-8 text-center text-sm text-gray-500">Không tìm thấy log.</div>
        ) : (
          <div className="space-y-6">
            {log.status === 'FAILED' ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-amber-900">
                      Log này đang lỗi và có thể retry thủ công
                    </div>
                    <div className="mt-1 text-sm text-amber-800">
                      Khi retry, hệ thống sẽ tạo một log gửi mới và vẫn giữ nguyên lịch sử log cũ.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={retrying}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {retrying ? 'Đang retry...' : 'Retry log này'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-xl bg-gray-50 p-4 lg:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Người nhận
                </div>
                <div className="mt-2 text-lg font-bold text-gray-900">
                  {log.recipientName || 'Không có tên'}
                </div>
                <div className="mt-1 text-sm text-gray-600">{log.recipientValue}</div>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Trạng thái
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getLogStatusClassName(log.status)}`}
                  >
                    {getLogStatusLabel(log.status)}
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                  Kênh gửi
                </div>
                <div className="mt-2 text-sm font-bold text-emerald-900">{log.channel.code}</div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Thời gian tạo log
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {formatDateTime(log.createdAt)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Thời gian gửi
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {formatDateTime(log.sentAt)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Người tạo
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {log.createdBy?.name || log.createdBy?.phone || 'Không rõ'}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Liên kết nghiệp vụ
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div>
                      Campaign:{' '}
                      {log.campaign?.id ? (
                        <Link
                          href={`/admin/customer-care/campaigns/${log.campaign.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {log.campaign.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </div>
                    <div>
                      Template: <span className="font-semibold text-gray-900">{log.template?.name || '—'}</span>
                    </div>
                    <div>
                      Tin tự động:{' '}
                      {log.automationRule?.id ? (
                        <Link
                          href={`/admin/customer-care/automations/${log.automationRule.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {log.automationRule.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </div>
                    <div>
                      Đơn hàng:{' '}
                      {log.order?.id ? (
                        <Link
                          href={`/admin/orders/${log.order.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {log.order.orderCode}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Thông tin provider và lỗi
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div>Provider message ID: {log.providerMessageId || '—'}</div>
                    <div>Mã lỗi: {log.errorCode || '—'}</div>
                    <div>Nội dung lỗi: {log.errorMessage || 'Không có lỗi'}</div>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Nội dung tin nhắn
                  </div>
                  <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-gray-800 ring-1 ring-gray-200">
                    {log.content}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Biến đã render vào template
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-4 text-xs text-gray-700 ring-1 ring-gray-200">
                    {JSON.stringify(log.renderedVariables || {}, null, 2)}
                  </pre>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Metadata log
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-4 text-xs text-gray-700 ring-1 ring-gray-200">
                    {JSON.stringify(log.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

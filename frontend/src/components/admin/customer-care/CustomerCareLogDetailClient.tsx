'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  formatDateTime,
  getMessagePurposeHint,
  getMessagePurposeLabel,
  logStatusOptions,
  MessageLogRecord,
} from '@/lib/adminMessaging';

interface CustomerCareLogDetailClientProps {
  logId: string;
  initialLog: MessageLogRecord | null;
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

export default function CustomerCareLogDetailClient({
  logId,
  initialLog,
}: CustomerCareLogDetailClientProps) {
  const [log, setLog] = useState<MessageLogRecord | null>(initialLog);
  const [loading, setLoading] = useState(!initialLog);
  const [retrying, setRetrying] = useState(false);
  const skippedReason = typeof log?.metadata?.skippedReason === 'string' ? log.metadata.skippedReason : null;
  const cooldownWindowMs =
    typeof log?.metadata?.cooldownWindowMs === 'number' ? log.metadata.cooldownWindowMs : null;
  const latestMessageAt =
    typeof log?.metadata?.latestMessageAt === 'string' ? log.metadata.latestMessageAt : null;

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
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Chi tiết tin đã gửi</h1>
            <p className="mt-1 text-[12.5px] text-[#9ca3af]">
              Xem trạng thái gửi, nội dung SMS, dữ liệu đã render và các liên kết nghiệp vụ liên quan.
            </p>
          </div>
          <Link
            href="/admin/customer-care/logs"
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        {loading ? (
          <div className="py-8 text-center text-[13px] text-[#9ca3af]">Đang tải chi tiết log...</div>
        ) : !log ? (
          <div className="py-8 text-center text-[13px] text-[#9ca3af]">Không tìm thấy log.</div>
        ) : (
          <div className="space-y-6">
            {log.status === 'FAILED' ? (
              <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-[#92400e]">
                      Log này đang lỗi và có thể retry thủ công
                    </div>
                    <div className="mt-1 text-[12.5px] text-[#b45309]">
                      Khi retry, hệ thống sẽ tạo một log gửi mới và vẫn giữ nguyên lịch sử log cũ.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={retrying}
                    className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-[12px] font-bold text-[#b45309] hover:bg-[#fef3c7] disabled:opacity-60"
                  >
                    {retrying ? 'Đang retry...' : 'Retry log này'}
                  </button>
                </div>
              </div>
            ) : null}

            {log.status === 'SKIPPED' && skippedReason === 'RECIPIENT_COOLDOWN' ? (
              <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
                <div className="text-[13px] font-bold text-[#92400e]">Tin nhắn bị chặn bởi cooldown chống spam</div>
                <div className="mt-1 text-[12.5px] text-[#b45309]">
                  {cooldownWindowMs ? `Cửa sổ chặn hiện tại: ${Math.round(cooldownWindowMs / 3600000)} giờ.` : null}
                  {latestMessageAt ? ` Lần gửi gần nhất: ${formatDateTime(latestMessageAt)}.` : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-5">
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5 lg:col-span-2">
                <div className="text-[12.5px] text-[#6b7280]">Người nhận</div>
                <div className="mt-2 text-[15px] font-extrabold text-gray-900">
                  {log.recipientName || 'Không có tên'}
                </div>
                <div className="mt-1 text-[13px] font-mono text-gray-900">{log.recipientValue}</div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12.5px] text-[#6b7280]">Trạng thái</div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-bold ${getLogStatusClassName(log.status)}`}
                  >
                    {getLogStatusLabel(log.status)}
                  </span>
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12.5px] text-[#6b7280]">Kênh gửi</div>
                <div className="mt-2 text-[13px] font-bold text-gray-900">{log.channel.code}</div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12.5px] text-[#6b7280]">Loại gửi</div>
                <div className="mt-2 text-[13px] font-bold text-gray-900">
                  {getMessagePurposeLabel(log.purpose)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12.5px] text-[#6b7280]">Thời gian tạo log</div>
                <div className="mt-2 text-[13px] font-semibold text-gray-900">
                  {formatDateTime(log.createdAt)}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12.5px] text-[#6b7280]">Thời gian gửi</div>
                <div className="mt-2 text-[13px] font-semibold text-gray-900">
                  {formatDateTime(log.sentAt)}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[12.5px] text-[#6b7280]">Người tạo</div>
                <div className="mt-2 text-[13px] font-semibold text-gray-900">
                  {log.createdBy?.name || log.createdBy?.phone || 'Không rõ'}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                  <div className="text-[15px] font-extrabold text-gray-900">Liên kết nghiệp vụ</div>
                  <div className="mt-3 space-y-2 text-[13px] text-gray-900">
                    <div>
                      Campaign:{' '}
                      {log.campaign?.id ? (
                        <Link
                          href={`/admin/customer-care/campaigns/${log.campaign.id}`}
                          className="font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
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
                      Loại gửi: <span className="font-semibold text-gray-900">{getMessagePurposeLabel(log.purpose)}</span>
                    </div>
                    <div>
                      Tin tự động:{' '}
                      {log.automationRule?.id ? (
                        <Link
                          href={`/admin/customer-care/automations/${log.automationRule.id}`}
                          className="font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
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
                          className="font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                        >
                          {log.order.orderCode}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                  <div className="text-[15px] font-extrabold text-gray-900">Thông tin provider và lỗi</div>
                  <div className="mt-3 space-y-2 text-[13px] text-gray-900">
                    <div>Provider message ID: <span className="font-mono">{log.providerMessageId || '—'}</span></div>
                    <div>Mã lỗi: <span className="font-mono">{log.errorCode || '—'}</span></div>
                    <div>Nội dung lỗi: {log.errorMessage || 'Không có lỗi'}</div>
                    <div>Ghi chú loại gửi: {getMessagePurposeHint(log.purpose)}</div>
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                  <div className="text-[15px] font-extrabold text-gray-900">Nội dung tin nhắn</div>
                  <div className="mt-3 whitespace-pre-wrap rounded-[10px] border border-[#eceef2] bg-[#f9fafb] p-3 text-[13px] text-gray-900">
                    {log.content}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                  <div className="text-[15px] font-extrabold text-gray-900">Biến đã render vào template</div>
                  <pre className="mt-3 overflow-x-auto rounded-[10px] border border-[#eceef2] bg-[#f9fafb] p-3 text-[12px] font-mono text-gray-900">
                    {JSON.stringify(log.renderedVariables || {}, null, 2)}
                  </pre>
                </div>

                <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                  <div className="text-[15px] font-extrabold text-gray-900">Metadata log</div>
                  <pre className="mt-3 overflow-x-auto rounded-[10px] border border-[#eceef2] bg-[#f9fafb] p-3 text-[12px] font-mono text-gray-900">
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

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import { formatDateTime, MessageCampaignDetailRecord } from '@/lib/adminMessaging';

export default function CustomerCareCampaignDetailClient({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<MessageCampaignDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const data = await apiClientClient.get<MessageCampaignDetailRecord>(
          `/admin/messaging/campaigns/${campaignId}`,
        );
        if (!cancelled) {
          setCampaign(data);
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được chi tiết campaign');
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
  }, [campaignId]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết campaign</h1>
            <p className="mt-1 text-sm text-gray-500">
              Xem audience import hoặc filter, lịch gửi và log thực tế của một campaign.
            </p>
          </div>
          <Link
            href="/admin/customer-care"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Quay lại compose
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Đang tải campaign...</div>
        ) : !campaign ? (
          <div className="py-8 text-center text-sm text-gray-500">Không tìm thấy campaign.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-xl bg-gray-50 p-4 lg:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Campaign
                </div>
                <div className="mt-2 text-lg font-bold text-gray-900">{campaign.name}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span>{campaign.channel.code}</span>
                  <span>•</span>
                  <span>{campaign.audienceSource}</span>
                  <span>•</span>
                  <span>{campaign.sendMode}</span>
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Audience
                </div>
                <div className="mt-2 text-2xl font-bold text-blue-900">
                  {campaign.audiences.length}
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                  Logs
                </div>
                <div className="mt-2 text-2xl font-bold text-emerald-900">
                  {campaign.logs.length}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Trạng thái
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">{campaign.status}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Tạo lúc
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {formatDateTime(campaign.createdAt)}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Lịch gửi
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {formatDateTime(campaign.scheduledAt)}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Nội dung gửi
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-gray-800 ring-1 ring-gray-200">
                {campaign.messageContent || 'Dùng template'}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200">
                  <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                    Audience
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-left text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Người nhận</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Đơn hàng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {campaign.audiences.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                              Chưa có audience.
                            </td>
                          </tr>
                        ) : (
                          campaign.audiences.slice(0, 50).map((audience) => (
                            <tr key={audience.id}>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">
                                  {audience.recipientName || 'Không có tên'}
                                </div>
                                <div className="mt-1 text-gray-500">{audience.recipientValue}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">{audience.status}</td>
                              <td className="px-4 py-3 text-gray-700">
                                {audience.order?.orderCode || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200">
                  <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                    Logs gần nhất
                  </div>
                  <div className="divide-y divide-gray-100">
                    {campaign.logs.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500">Chưa có log nào.</div>
                    ) : (
                      campaign.logs.slice(0, 20).map((log) => (
                        <div key={log.id} className="flex items-center justify-between gap-4 px-4 py-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900">
                              {log.recipientName || log.recipientValue}
                            </div>
                            <div className="mt-1 truncate text-sm text-gray-500">{log.content}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-sm text-gray-500">
                              <div>{log.status}</div>
                              <div>{formatDateTime(log.sentAt || log.createdAt)}</div>
                            </div>
                            <Link
                              href={`/admin/customer-care/logs/${log.id}`}
                              className="rounded-lg bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-200"
                            >
                              Xem
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200">
                  <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                    Schedules
                  </div>
                  <div className="divide-y divide-gray-100">
                    {campaign.schedules.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500">Không có lịch gửi.</div>
                    ) : (
                      campaign.schedules.map((schedule) => (
                        <div key={schedule.id} className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{schedule.status}</div>
                          <div className="mt-1 text-sm text-gray-500">
                            {formatDateTime(schedule.runAt)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Metadata
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-4 text-xs text-gray-700 ring-1 ring-gray-200">
                    {JSON.stringify(campaign.metadata || {}, null, 2)}
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

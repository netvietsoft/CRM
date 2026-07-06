'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  formatDateTime,
  getMessagePurposeHint,
  getMessagePurposeLabel,
  MessageCampaignDetailRecord,
} from '@/lib/adminMessaging';

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
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Chi tiết campaign</h1>
            <p className="mt-1 text-[12.5px] text-[#9ca3af]">
              Xem audience import hoặc filter, lịch gửi và log thực tế của một campaign.
            </p>
          </div>
          <Link
            href="/admin/customer-care"
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
          >
            Quay lại compose
          </Link>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        {loading ? (
          <div className="px-4 py-8 text-center text-[#9ca3af]">Đang tải campaign...</div>
        ) : !campaign ? (
          <div className="px-4 py-8 text-center text-[#9ca3af]">Không tìm thấy campaign.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3.5 lg:grid-cols-4">
              <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px] lg:col-span-2">
                <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                  Campaign
                </div>
                <div className="text-[22px] font-extrabold text-gray-900">{campaign.name}</div>
                <div className="mt-[3px] flex flex-wrap items-center gap-2 text-[11.5px] text-[#6b7280]">
                  <span>{campaign.channel.code}</span>
                  <span>•</span>
                  <span>{campaign.audienceSource}</span>
                  <span>•</span>
                  <span>{campaign.sendMode}</span>
                  <span>•</span>
                  <span>{getMessagePurposeLabel(campaign.purpose)}</span>
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                  Audience
                </div>
                <div className="text-[22px] font-extrabold text-[#2563eb]">
                  {campaign.audiences.length}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                  Logs
                </div>
                <div className="text-[22px] font-extrabold text-[#059669]">
                  {campaign.logs.length}
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 lg:grid-cols-3">
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                  Trạng thái
                </div>
                <div className="mt-2">
                  <span className="inline-flex rounded-full bg-[#dbeafe] px-2.5 py-[3px] text-[11px] font-bold text-[#1d4ed8]">
                    {campaign.status}
                  </span>
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                  Tạo lúc
                </div>
                <div className="mt-2 text-[13px] font-bold text-gray-900">
                  {formatDateTime(campaign.createdAt)}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                  Lịch gửi
                </div>
                <div className="mt-2 text-[13px] font-bold text-gray-900">
                  {formatDateTime(campaign.scheduledAt)}
                </div>
              </div>
            </div>

            <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3.5 py-[11px] text-[12.5px] text-[#2563eb]">
              Loại gửi của campaign: <span className="font-bold text-[#1d4ed8]">{getMessagePurposeLabel(campaign.purpose)}</span>
              <div className="mt-1 text-[#2563eb]">{getMessagePurposeHint(campaign.purpose)}</div>
            </div>

            {campaign.metadata?.audienceSummary ? (
              <div className="grid gap-3.5 lg:grid-cols-3">
                <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                  <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                    Bản ghi nguồn
                  </div>
                  <div className="text-[22px] font-extrabold text-gray-900">
                    {String((campaign.metadata.audienceSummary as Record<string, unknown>).originalCount || '—')}
                  </div>
                </div>
                <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                  <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                    Sau dedupe
                  </div>
                  <div className="text-[22px] font-extrabold text-[#059669]">
                    {String((campaign.metadata.audienceSummary as Record<string, unknown>).deduplicatedCount || '—')}
                  </div>
                </div>
                <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                  <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                    Bị gộp do trùng
                  </div>
                  <div className="text-[22px] font-extrabold text-[#dc2626]">
                    {String((campaign.metadata.audienceSummary as Record<string, unknown>).duplicateCount || 0)}
                  </div>
                </div>
              </div>
            ) : campaign.metadata?.importSummary ? (
              <div className="grid gap-3.5 lg:grid-cols-3">
                <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                  <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                    Dòng file gốc
                  </div>
                  <div className="text-[22px] font-extrabold text-gray-900">
                    {String((campaign.metadata.importSummary as Record<string, unknown>).originalCount || '—')}
                  </div>
                </div>
                <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                  <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                    Dòng hợp lệ
                  </div>
                  <div className="text-[22px] font-extrabold text-[#059669]">
                    {String((campaign.metadata.importSummary as Record<string, unknown>).validCount || '—')}
                  </div>
                </div>
                <div className="rounded-[14px] border border-[#eceef2] bg-white px-[18px] py-[15px]">
                  <div className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9ca3af]">
                    Dòng trùng bị gộp
                  </div>
                  <div className="text-[22px] font-extrabold text-[#dc2626]">
                    {String((campaign.metadata.importSummary as Record<string, unknown>).duplicateCount || 0)}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
              <div className="text-[15px] font-extrabold text-gray-900">Nội dung gửi</div>
              <div className="mt-3 whitespace-pre-wrap rounded-[10px] border border-[#e5e7eb] bg-white p-4 text-[13px] text-gray-800">
                {campaign.messageContent || 'Dùng template'}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-[14px] border border-[#eceef2] bg-white">
                  <div className="border-b border-[#f1f5f9] px-5 py-4 text-[15px] font-extrabold text-gray-900">
                    Audience
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[13px]">
                      <thead className="bg-[#f9fafb] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                        <tr className="border-b border-[#f1f5f9]">
                          <th className="px-4 py-2.5">Người nhận</th>
                          <th className="px-4 py-2.5">Trạng thái</th>
                          <th className="px-4 py-2.5">Đơn hàng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaign.audiences.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-[#9ca3af]">
                              Chưa có audience.
                            </td>
                          </tr>
                        ) : (
                          campaign.audiences.slice(0, 50).map((audience) => (
                            <tr key={audience.id} className="border-b border-[#f1f5f9] hover:bg-[#eff6ff]">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-gray-900">
                                  {audience.recipientName || 'Không có tên'}
                                </div>
                                <div className="mt-1 font-mono text-[#6b7280]">{audience.recipientValue}</div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-[3px] text-[11px] font-bold text-[#64748b]">
                                  {audience.status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[#374151]">
                                {audience.order?.orderCode || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#eceef2] bg-white">
                  <div className="border-b border-[#f1f5f9] px-5 py-4 text-[15px] font-extrabold text-gray-900">
                    Logs gần nhất
                  </div>
                  <div>
                    {campaign.logs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[#9ca3af]">Chưa có log nào.</div>
                    ) : (
                      campaign.logs.slice(0, 20).map((log) => (
                        <div key={log.id} className="flex items-center justify-between gap-4 border-b border-[#f1f5f9] px-4 py-3.5 hover:bg-[#eff6ff]">
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900">
                              {log.recipientName || log.recipientValue}
                            </div>
                            <div className="mt-1 truncate text-[13px] text-[#6b7280]">{log.content}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-[12px] text-[#6b7280]">
                              <div>
                                <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-[3px] text-[11px] font-bold text-[#64748b]">
                                  {log.status}
                                </span>
                              </div>
                              <div className="mt-1">{formatDateTime(log.sentAt || log.createdAt)}</div>
                            </div>
                            <Link
                              href={`/admin/customer-care/logs/${log.id}`}
                              className="rounded-lg border border-[#bfdbfe] bg-white px-3 py-1.5 text-[12px] font-bold text-[#2563eb] hover:bg-[#eff6ff]"
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
                <div className="rounded-[14px] border border-[#eceef2] bg-white">
                  <div className="border-b border-[#f1f5f9] px-5 py-4 text-[15px] font-extrabold text-gray-900">
                    Schedules
                  </div>
                  <div>
                    {campaign.schedules.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[#9ca3af]">Không có lịch gửi.</div>
                    ) : (
                      campaign.schedules.map((schedule) => (
                        <div key={schedule.id} className="border-b border-[#f1f5f9] px-4 py-3.5 hover:bg-[#eff6ff]">
                          <div>
                            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-[3px] text-[11px] font-bold text-[#64748b]">
                              {schedule.status}
                            </span>
                          </div>
                          <div className="mt-1 text-[13px] text-[#6b7280]">
                            {formatDateTime(schedule.runAt)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
                  <div className="text-[15px] font-extrabold text-gray-900">Metadata</div>
                  <pre className="mt-3 overflow-x-auto rounded-[10px] border border-[#e5e7eb] bg-white p-4 font-mono text-[12px] text-[#374151]">
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

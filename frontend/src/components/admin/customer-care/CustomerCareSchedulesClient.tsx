'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  formatDateTime,
  MessageScheduleRecord,
  PaginatedResponse,
  scheduleStatusOptions,
} from '@/lib/adminMessaging';

async function fetchSchedules(params: {
  page: number;
  status: string;
  search: string;
  runFrom: string;
  runTo: string;
}) {
  return apiClientClient.get<PaginatedResponse<MessageScheduleRecord>>('/admin/messaging/schedules', {
    params: {
      page: params.page,
      limit: 20,
      status: params.status || undefined,
      search: params.search || undefined,
      runFrom: params.runFrom || undefined,
      runTo: params.runTo || undefined,
      channelCode: 'SMS',
    },
  });
}

interface CustomerCareSchedulesClientProps {
  initialData: PaginatedResponse<MessageScheduleRecord>;
}

function getScheduleStatusMeta(status: string) {
  if (status === 'PENDING') {
    return 'bg-[#fef3c7] text-[#92400e]';
  }
  if (status === 'PROCESSING') {
    return 'bg-[#dbeafe] text-[#1d4ed8]';
  }
  if (status === 'COMPLETED') {
    return 'bg-[#d1fae5] text-[#047857]';
  }
  if (status === 'CANCELLED') {
    return 'bg-[#f1f5f9] text-[#64748b]';
  }
  if (status === 'FAILED') {
    return 'bg-[#fee2e2] text-[#dc2626]';
  }
  return 'bg-[#f1f5f9] text-[#64748b]';
}

function getScheduleStatusLabel(status: string) {
  return scheduleStatusOptions.find((option) => option.value === status)?.label || status;
}

function getRunAtMeta(schedule: MessageScheduleRecord) {
  const runAt = new Date(schedule.runAt);
  const diffMs = runAt.getTime() - Date.now();

  if (schedule.status === 'CANCELLED') {
    return { text: 'Lịch đã hủy', className: 'text-gray-500' };
  }
  if (schedule.status === 'COMPLETED') {
    return { text: 'Đã chạy xong', className: 'text-emerald-600' };
  }
  if (schedule.status === 'FAILED') {
    return { text: 'Gửi lỗi', className: 'text-rose-600' };
  }
  if (schedule.status === 'PROCESSING') {
    return { text: 'Đang xử lý', className: 'text-blue-600' };
  }
  if (diffMs < 0) {
    return { text: 'Quá thời điểm gửi', className: 'text-rose-600' };
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    return { text: `Sắp chạy sau ${diffMinutes} phút`, className: 'text-amber-600' };
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return { text: `Sắp chạy sau ${diffHours} giờ`, className: 'text-amber-600' };
  }

  return { text: 'Đã lên lịch', className: 'text-gray-500' };
}

export default function CustomerCareSchedulesClient({
  initialData,
}: CustomerCareSchedulesClientProps) {
  const [schedules, setSchedules] = useState<MessageScheduleRecord[]>(initialData.items || []);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [loading, setLoading] = useState((initialData.items || []).length === 0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [runFrom, setRunFrom] = useState('');
  const [runTo, setRunTo] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState('');
  const [runAt, setRunAt] = useState('');
  const firstLoadRef = useRef(true);
  const debouncedSearch = useDebounce(search, 350);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        page,
        status,
        search: debouncedSearch.trim(),
        runFrom,
        runTo,
      }),
    [page, status, debouncedSearch, runFrom, runTo],
  );

  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);

      try {
        const params = JSON.parse(queryKey) as {
          page: number;
          status: string;
          search: string;
          runFrom: string;
          runTo: string;
        };
        const data = await fetchSchedules(params);
        if (!cancelled) {
          setSchedules(data.items || []);
          setPagination(data.pagination);
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được lịch gửi');
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
  }, [queryKey]);

  const refreshSchedules = async () => {
    const data = await fetchSchedules({
      page,
      status,
      search: debouncedSearch.trim(),
      runFrom,
      runTo,
    });
    setSchedules(data.items || []);
    setPagination(data.pagination);
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Hủy lịch gửi này?')) {
      return;
    }

    try {
      await apiClientClient.patch(`/admin/messaging/schedules/${id}/cancel`, {});
      await refreshSchedules();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không hủy được lịch gửi');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await apiClientClient.patch(`/admin/messaging/schedules/${id}`, {
        runAt: new Date(runAt).toISOString(),
      });
      setEditingId('');
      setRunAt('');
      await refreshSchedules();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không cập nhật được lịch gửi');
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <h1 className="text-lg font-extrabold text-gray-900">Lịch gửi</h1>
        <p className="mt-1 text-[12.5px] text-[#9ca3af]">
          Quản lý các campaign SMS đang được hẹn giờ gửi, đổi lịch hoặc hủy trước khi chạy.
        </p>
      </div>

      <div className="rounded-[14px] border border-[#eceef2] bg-white px-5 py-4">
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên campaign"
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px]"
          >
            <option value="">Tất cả trạng thái</option>
            {scheduleStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={runFrom}
            onChange={(event) => {
              setRunFrom(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[12.5px]"
          />

          <input
            type="date"
            value={runTo}
            onChange={(event) => {
              setRunTo(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[12.5px]"
          />

          <div className="flex items-center justify-center rounded-[10px] bg-[#eff6ff] px-3 py-2 text-[12.5px] font-bold text-[#2563eb]">
            {pagination.total} lịch gửi
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#f1f5f9] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                <th className="px-4 py-2.5">Campaign</th>
                <th className="px-4 py-2.5">Kênh</th>
                <th className="px-4 py-2.5">Run at</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#9ca3af]">
                    Đang tải lịch gửi...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#9ca3af]">
                    Chưa có lịch gửi nào.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => {
                  const runAtMeta = getRunAtMeta(schedule);

                  return (
                    <tr key={schedule.id} className="border-b border-[#f1f5f9] hover:bg-[#eff6ff]">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">
                          {schedule.campaign?.name || 'Không có campaign'}
                        </div>
                        <div className="mt-2">
                          {schedule.campaign?.id ? (
                            <Link
                              href={`/admin/customer-care/campaigns/${schedule.campaign.id}`}
                              className="text-[12.5px] font-bold text-[#2563eb] hover:text-[#1d4ed8]"
                            >
                              Xem chi tiết campaign
                            </Link>
                          ) : (
                            <span className="text-[12.5px] text-[#9ca3af]">Không có liên kết</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold">{schedule.channel.code}</td>
                      <td className="px-4 py-3.5">
                        {editingId === schedule.id ? (
                          <input
                            type="datetime-local"
                            value={runAt}
                            onChange={(event) => setRunAt(event.target.value)}
                            className="rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px]"
                          />
                        ) : (
                          <div>
                            <div className="font-semibold text-gray-900">{formatDateTime(schedule.runAt)}</div>
                            <div className={`mt-1 text-[11.5px] font-semibold ${runAtMeta.className}`}>
                              {runAtMeta.text}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${getScheduleStatusMeta(schedule.status)}`}
                        >
                          {getScheduleStatusLabel(schedule.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-[7px]">
                          {editingId === schedule.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdate(schedule.id)}
                                className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#1d4ed8]"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId('');
                                  setRunAt('');
                                }}
                                className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
                              >
                                Bỏ
                              </button>
                            </>
                          ) : (
                            <>
                              {schedule.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(schedule.id);
                                    setRunAt(schedule.runAt.slice(0, 16));
                                  }}
                                  className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
                                >
                                  Đổi lịch
                                </button>
                              )}
                              {schedule.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(schedule.id)}
                                  className="rounded-lg border border-[#fecaca] bg-white px-3 py-1.5 text-[12px] font-bold text-[#dc2626] hover:bg-[#fef2f2]"
                                >
                                  Hủy
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12.5px] text-[#6b7280]">
              Trang {pagination.page}/{pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12.5px] font-bold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12.5px] font-bold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  if (status === 'PROCESSING') {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }
  if (status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (status === 'CANCELLED') {
    return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
  if (status === 'FAILED') {
    return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
  return 'bg-gray-100 text-gray-700 ring-gray-200';
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
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Lịch gửi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý các campaign SMS đang được hẹn giờ gửi, đổi lịch hoặc hủy trước khi chạy.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên campaign"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={runTo}
            onChange={(event) => {
              setRunTo(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
            {pagination.total} lịch gửi
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Kênh</th>
                <th className="px-4 py-3">Run at</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Đang tải lịch gửi...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Chưa có lịch gửi nào.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => {
                  const runAtMeta = getRunAtMeta(schedule);

                  return (
                    <tr key={schedule.id}>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">
                          {schedule.campaign?.name || 'Không có campaign'}
                        </div>
                        <div className="mt-2">
                          {schedule.campaign?.id ? (
                            <Link
                              href={`/admin/customer-care/campaigns/${schedule.campaign.id}`}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Xem chi tiết campaign
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500">Không có liên kết</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">{schedule.channel.code}</td>
                      <td className="px-4 py-4">
                        {editingId === schedule.id ? (
                          <input
                            type="datetime-local"
                            value={runAt}
                            onChange={(event) => setRunAt(event.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        ) : (
                          <div>
                            <div className="font-medium text-gray-900">{formatDateTime(schedule.runAt)}</div>
                            <div className={`mt-1 text-xs font-semibold ${runAtMeta.className}`}>
                              {runAtMeta.text}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getScheduleStatusMeta(schedule.status)}`}
                        >
                          {getScheduleStatusLabel(schedule.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {editingId === schedule.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdate(schedule.id)}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId('');
                                  setRunAt('');
                                }}
                                className="rounded-lg bg-gray-100 px-3 py-1.5 font-semibold text-gray-700"
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
                                  className="rounded-lg bg-gray-100 px-3 py-1.5 font-semibold text-gray-700"
                                >
                                  Đổi lịch
                                </button>
                              )}
                              {schedule.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(schedule.id)}
                                  className="rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-600"
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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-500">
              Trang {pagination.page}/{pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
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

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  formatDateTime,
  MessageTemplateRecord,
  PaginatedResponse,
} from '@/lib/adminMessaging';

async function fetchTemplates(search: string) {
  const data = await apiClientClient.get<PaginatedResponse<MessageTemplateRecord>>(
    '/admin/messaging/templates',
    {
      params: {
        page: 1,
        limit: 100,
        search,
      },
    },
  );

  return data.items || [];
}

interface CustomerCareTemplatesClientProps {
  initialTemplates?: MessageTemplateRecord[];
}

export default function CustomerCareTemplatesClient({
  initialTemplates = [],
}: CustomerCareTemplatesClientProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplateRecord[]>(initialTemplates);
  const [loading, setLoading] = useState(initialTemplates.length === 0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    if (!debouncedSearch) {
      return;
    }

    let cancelled = false;

    async function run() {
      if (!cancelled) {
        setLoading(true);
      }

      try {
        const items = await fetchTemplates(debouncedSearch);
        if (!cancelled) {
          setTemplates(items);
        }
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được template');
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
  }, [debouncedSearch, initialTemplates]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa template này?')) {
      return;
    }

    try {
      await apiClientClient.delete(`/admin/messaging/templates/${id}`);
      setTemplates(await fetchTemplates(debouncedSearch));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không xóa được template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Template tin nhắn</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý mẫu tin cho gửi cá nhân, campaign và tin tự động.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSearch(nextValue);

              if (!nextValue.trim()) {
                setTemplates(initialTemplates);
                setLoading(false);
              }
            }}
            placeholder="Tìm theo tên hoặc nội dung"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm lg:max-w-sm"
          />
          <button
            type="button"
            onClick={() => router.push('/admin/customer-care/templates/create')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Tạo template
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Kênh</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Cập nhật</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Đang tải template...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Chưa có template nào.
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{template.name}</div>
                      <div className="mt-1 max-w-xl line-clamp-2 text-gray-500">
                        {template.content}
                      </div>
                    </td>
                    <td className="px-4 py-4">{template.channel.code}</td>
                    <td className="px-4 py-4">{template.kind}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          template.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {template.isActive ? 'Đang dùng' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500">{formatDateTime(template.createdAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/customer-care/templates/${template.id}`)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-200"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(template.id)}
                          className="rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-600 hover:bg-red-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

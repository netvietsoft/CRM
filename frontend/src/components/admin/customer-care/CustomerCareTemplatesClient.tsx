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
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <h1 className="text-lg font-extrabold text-gray-900">Template tin nhắn</h1>
        <p className="mt-1 text-[12.5px] text-[#9ca3af]">
          Quản lý mẫu tin cho gửi cá nhân, campaign và tin tự động.
        </p>
      </div>

      <div className="rounded-[14px] border border-[#eceef2] bg-white px-5 py-4">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
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
            className="w-[280px] max-w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
          />
          <button
            type="button"
            onClick={() => router.push('/admin/customer-care/templates/create')}
            className="rounded-[10px] bg-[#2563eb] px-[18px] py-2.5 text-[13px] font-bold text-white hover:bg-[#1d4ed8]"
          >
            Tạo template
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#f1f5f9] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                <th className="px-4 py-2.5">Tên</th>
                <th className="px-4 py-2.5">Kênh</th>
                <th className="px-4 py-2.5">Loại</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5">Cập nhật</th>
                <th className="px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">
                    Đang tải template...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">
                    Chưa có template nào.
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id} className="border-b border-[#f1f5f9] align-top hover:bg-[#eff6ff]">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">{template.name}</div>
                      <div className="mt-1 line-clamp-2 max-w-xl text-[12px] leading-[1.5] text-[#6b7280]">
                        {template.content}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold">{template.channel.code}</td>
                    <td className="px-4 py-3.5 font-semibold text-[#64748b]">{template.kind}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
                          template.isActive
                            ? 'bg-[#d1fae5] text-[#047857]'
                            : 'bg-[#f1f5f9] text-[#64748b]'
                        }`}
                      >
                        {template.isActive ? 'Đang dùng' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-[#6b7280]">{formatDateTime(template.createdAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-[7px]">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/customer-care/templates/${template.id}`)}
                          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(template.id)}
                          className="rounded-lg border border-[#fecaca] bg-white px-3 py-1.5 text-[12px] font-bold text-[#dc2626] hover:bg-[#fef2f2]"
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

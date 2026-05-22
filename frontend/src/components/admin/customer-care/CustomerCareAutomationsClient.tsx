'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  MessageAutomationRuleRecord,
  triggerTypeOptions,
} from '@/lib/adminMessaging';

interface CustomerCareAutomationsClientProps {
  initialRules?: MessageAutomationRuleRecord[];
}

async function fetchAutomationRules() {
  return apiClientClient.get<MessageAutomationRuleRecord[]>('/admin/messaging/automation-rules');
}

function getTriggerLabel(value: string) {
  return triggerTypeOptions.find((option) => option.value === value)?.label || value;
}

function getTriggerClassName(value: string) {
  if (value === 'BIRTHDAY') {
    return 'bg-pink-50 text-pink-700 ring-pink-200';
  }
  if (value === 'ORDER_SHIPPING_STATUS') {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }
  if (value === 'ORDER_DELIVERED_PAID') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  return 'bg-gray-100 text-gray-700 ring-gray-200';
}

export default function CustomerCareAutomationsClient({
  initialRules = [],
}: CustomerCareAutomationsClientProps) {
  const router = useRouter();
  const [rules, setRules] = useState<MessageAutomationRuleRecord[]>(initialRules);
  const [loading, setLoading] = useState(initialRules.length === 0);
  const [search, setSearch] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const shouldFetch = initialRules.length === 0 || Boolean(debouncedSearch.trim() || triggerType || activeFilter);
      if (!shouldFetch) {
        return;
      }

      setLoading(true);

      try {
        const items = await fetchAutomationRules();
        if (cancelled) {
          return;
        }

        setRules(items || []);
      } catch (error) {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được rule tự động');
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
  }, [activeFilter, debouncedSearch, initialRules.length, triggerType]);

  const filteredRules = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesSearch =
        !keyword ||
        rule.name.toLowerCase().includes(keyword) ||
        rule.template?.name?.toLowerCase().includes(keyword) ||
        rule.channel.code.toLowerCase().includes(keyword);
      const matchesTrigger = !triggerType || rule.triggerType === triggerType;
      const matchesActive =
        !activeFilter ||
        (activeFilter === 'active' && rule.isActive) ||
        (activeFilter === 'inactive' && !rule.isActive);

      return matchesSearch && matchesTrigger && matchesActive;
    });
  }, [activeFilter, debouncedSearch, rules, triggerType]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa rule tự động này?')) {
      return;
    }

    try {
      await apiClientClient.delete(`/admin/messaging/automation-rules/${id}`);
      const items = await fetchAutomationRules();
      setRules(items || []);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không xóa được rule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Tin tự động</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý rule SMS cho sinh nhật khách hàng, vận chuyển và hoàn tất đơn hàng.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid w-full gap-3 md:grid-cols-2 xl:max-w-4xl xl:grid-cols-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên rule hoặc template"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />

            <select
              value={triggerType}
              onChange={(event) => setTriggerType(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Tất cả trigger</option>
              {triggerTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang bật</option>
              <option value="inactive">Đã tắt</option>
            </select>

            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              {filteredRules.length} rule phù hợp
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/admin/customer-care/automations/create')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Tạo rule
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3">Tên rule</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Lần chạy gần nhất</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Đang tải rule tự động...
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Chưa có rule phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{rule.name}</div>
                      <div className="mt-1 text-gray-500">{rule.channel.code}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getTriggerClassName(rule.triggerType)}`}
                      >
                        {getTriggerLabel(rule.triggerType)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{rule.template?.name || 'Tự soạn'}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-500">
                      {rule.lastRunAt ? (
                        <div>{new Intl.DateTimeFormat('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(rule.lastRunAt))}</div>
                      ) : (
                        'Chưa chạy lần nào'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          rule.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rule.isActive ? 'Đang bật' : 'Đã tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/customer-care/automations/${rule.id}/edit`)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-200"
                        >
                          Sửa
                        </button>
                        <Link
                          href={`/admin/customer-care/automations/${rule.id}`}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Xem log
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id)}
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

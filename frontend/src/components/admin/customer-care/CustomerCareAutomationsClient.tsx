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
  if (value === 'BIRTHDAY' || value === 'BIRTHDAY_TODAY') {
    return 'bg-[#fce7f3] text-[#be185d]';
  }
  if (value === 'ORDER_SHIPPING_STATUS' || value === 'ORDER_SHIPPED') {
    return 'bg-[#dbeafe] text-[#1d4ed8]';
  }
  if (
    value === 'ORDER_DELIVERED_PAID' ||
    value === 'ORDER_DELIVERED' ||
    value === 'PAYMENT_SUCCESS' ||
    value === 'VOUCHER_ACTIVATED'
  ) {
    return 'bg-[#d1fae5] text-[#047857]';
  }
  if (value.startsWith('ORDER_') || value === 'PAYMENT_FAILED') {
    return 'bg-[#fef3c7] text-[#92400e]';
  }
  if (value.startsWith('VOUCHER_')) {
    return 'bg-[#ede9fe] text-[#6d28d9]';
  }
  if (value.startsWith('CUSTOMER_')) {
    return 'bg-[#cffafe] text-[#0e7490]';
  }
  return 'bg-[#f3f4f6] text-[#4b5563]';
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

  const openRow = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="switch"]')) return;
    router.push(`/admin/customer-care/automations/${id}`);
  };

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
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <h1 className="text-lg font-extrabold text-gray-900">Tin tự động</h1>
        <p className="mt-1 text-[12.5px] text-[#9ca3af]">
          Quản lý rule SMS cho sinh nhật khách hàng, vận chuyển và hoàn tất đơn hàng.
        </p>
      </div>

      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên rule hoặc template"
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] md:w-64"
          />

          <select
            value={triggerType}
            onChange={(event) => setTriggerType(event.target.value)}
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] md:w-56"
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
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb] md:w-44"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang bật</option>
            <option value="inactive">Đã tắt</option>
          </select>

          <div className="rounded-[10px] bg-[#eff6ff] px-3.5 py-2 text-[12.5px] font-bold text-[#2563eb]">
            {filteredRules.length} rule phù hợp
          </div>

          <button
            type="button"
            onClick={() => router.push('/admin/customer-care/automations/create')}
            className="ml-auto rounded-[10px] bg-[#2563eb] px-[18px] py-2.5 text-[13px] font-bold text-white hover:bg-[#1d4ed8]"
          >
            Tạo rule
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#f1f5f9] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#6b7280]">
                <th className="px-4 py-2.5">Tên rule</th>
                <th className="px-4 py-2.5">Trigger</th>
                <th className="px-4 py-2.5">Template</th>
                <th className="px-4 py-2.5">Lần chạy gần nhất</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">
                    Đang tải rule tự động...
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">
                    Chưa có rule phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr
                    key={rule.id}
                    onClick={(e) => openRow(e, rule.id)}
                    className="cursor-pointer border-b border-[#f1f5f9] align-top hover:bg-[#eff6ff]"
                  >
                    <td className="px-4 py-3.5 text-[13px]">
                      <div className="font-bold text-gray-900">{rule.name}</div>
                      <div className="mt-1 text-[12px] text-[#9ca3af]">{rule.channel.code}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px]">
                      <span
                        className={`inline-flex rounded-md px-2 py-[3px] text-[11px] font-bold ${getTriggerClassName(rule.triggerType)}`}
                      >
                        {getTriggerLabel(rule.triggerType)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px]">
                      <div className="font-medium text-gray-900">{rule.template?.name || 'Tự soạn'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#2563eb]">
                      {rule.lastRunAt ? (
                        <div>{new Intl.DateTimeFormat('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(rule.lastRunAt))}</div>
                      ) : (
                        <span className="text-[#9ca3af]">Chưa chạy lần nào</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[13px]">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
                          rule.isActive ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#f1f5f9] text-[#64748b]'
                        }`}
                      >
                        {rule.isActive ? 'Đang bật' : 'Đã tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px]">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/customer-care/automations/${rule.id}/edit`)}
                          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-bold text-[#374151] hover:bg-[#f9fafb]"
                        >
                          Sửa
                        </button>
                        <Link
                          href={`/admin/customer-care/automations/${rule.id}`}
                          className="rounded-lg border border-[#bfdbfe] bg-white px-3 py-1.5 text-[12px] font-bold text-[#2563eb] hover:bg-[#eff6ff]"
                        >
                          Xem log
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id)}
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

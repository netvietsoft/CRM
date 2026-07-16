'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, SearchIcon } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import { getApiErrorMessage } from '@/lib/apiError';

type FieldType = 'text' | 'textarea' | 'email' | 'checkbox';

type MasterRecord = {
  id: string;
};

interface FieldConfig {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | boolean;
}

interface ColumnConfig {
  key: string;
  label: string;
  render?: (item: MasterRecord & Record<string, unknown>) => string;
  // Định dạng cột theo tên (serializable) — dùng khi truyền từ Server Component (không truyền được hàm `render`).
  format?: 'activeStatus';
}

interface MasterDataManagerProps {
  title: string;
  description: string;
  resource: string;
  entityLabel: string;
  items: MasterRecord[];
  fields: FieldConfig[];
  columns: ColumnConfig[];
  defaultSortKey?: string;
}

function buildInitialForm(fields: FieldConfig[]) {
  return fields.reduce<Record<string, string | boolean>>((acc, field) => {
    acc[field.key] = field.defaultValue ?? (field.type === 'checkbox' ? true : '');
    return acc;
  }, {});
}

function getItemValue(item: MasterRecord, key: string) {
  return (item as Record<string, unknown>)[key];
}

export default function MasterDataManager({
  title,
  description,
  resource,
  entityLabel,
  items,
  fields,
  columns,
  defaultSortKey = 'name',
}: MasterDataManagerProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteItem, setDeleteItem] = useState<MasterRecord | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => buildInitialForm(fields));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  // Sort theo cột (click header): key + hướng.
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const searchableKeys = useMemo(() => {
    return Array.from(new Set(columns.map((column) => column.key).filter((key) => key !== 'isActive')));
  }, [columns]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const isActive = getItemValue(item, 'isActive') !== false;

      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;

      if (!normalizedSearch) return true;

      return searchableKeys.some((key) => {
        const value = getItemValue(item, key);
        return String(value ?? '').toLowerCase().includes(normalizedSearch);
      });
    });
  }, [items, searchTerm, searchableKeys, statusFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((left, right) => {
      const lv = getItemValue(left, sortKey);
      const rv = getItemValue(right, sortKey);
      // Boolean (isActive) và số so trực tiếp; còn lại so chuỗi vi-VN.
      let r: number;
      if (typeof lv === 'boolean' || typeof rv === 'boolean') r = Number(lv !== false) - Number(rv !== false);
      else if (typeof lv === 'number' && typeof rv === 'number') r = lv - rv;
      else r = String(lv ?? '').toLowerCase().localeCompare(String(rv ?? '').toLowerCase(), 'vi');
      return sortDir === 'asc' ? r : -r;
    });
  }, [sortKey, sortDir, filteredItems]);

  const onSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const activeCount = useMemo(() => {
    return items.filter((item) => getItemValue(item, 'isActive') !== false).length;
  }, [items]);

  const resetForm = () => {
    setForm(buildInitialForm(fields));
    setEditingItem(null);
    setError('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: MasterRecord) => {
    const nextForm = buildInitialForm(fields);
    for (const field of fields) {
      const value = getItemValue(item, field.key);
      if (field.type === 'checkbox') {
        nextForm[field.key] = value === undefined ? true : Boolean(value);
      } else {
        nextForm[field.key] = value == null ? '' : String(value);
      }
    }
    setForm(nextForm);
    setEditingItem(item);
    setError('');
    setShowModal(true);
  };

  const openRow = (e: React.MouseEvent, item: MasterRecord) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="switch"]')) return;
    openEditModal(item);
  };

  const update = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => {
    return fields.reduce<Record<string, string | boolean>>((acc, field) => {
      const value = form[field.key];
      acc[field.key] = field.type === 'checkbox' ? Boolean(value) : String(value ?? '');
      return acc;
    }, {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = buildPayload();
      if (editingItem) {
        await apiClientClient.patch(`/${resource}/${editingItem.id}`, payload);
      } else {
        await apiClientClient.post(`/${resource}`, payload);
      }

      setShowModal(false);
      resetForm();
      router.refresh();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, `Lỗi lưu ${entityLabel.toLowerCase()}`));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setLoading(true);
    setError('');
    try {
      await apiClientClient.delete(`/${resource}/${deleteItem.id}`);
      setDeleteItem(null);
      router.refresh();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, `Lỗi xóa ${entityLabel.toLowerCase()}`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.4px] text-gray-900">{title}</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">{description}</p>
        </div>
        <button
          className="cursor-pointer rounded-[10px] bg-[#2563eb] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
          onClick={openCreateModal}
        >
          + Thêm mới
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-[14px] sm:grid-cols-3">
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-[18px]">
          <div className="mb-2 text-[13px] text-[#6b7280]">Tổng bản ghi</div>
          <div className="text-[26px] font-extrabold text-gray-900">{items.length}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-[18px]">
          <div className="mb-2 text-[13px] text-[#6b7280]">Đang hoạt động</div>
          <div className="text-[26px] font-extrabold text-[#047857]">{activeCount}</div>
        </div>
        <div className="rounded-[14px] border border-[#eceef2] bg-white p-[18px]">
          <div className="mb-2 text-[13px] text-[#6b7280]">Đang tắt</div>
          <div className="text-[26px] font-extrabold text-gray-900">{items.length - activeCount}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Tìm ${entityLabel.toLowerCase()}...`}
            className="w-full rounded-[10px] border border-[#eceef2] bg-white py-[9px] pl-10 pr-4 text-[13px] text-gray-800 outline-none placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </div>

        <div className="flex items-center gap-1 rounded-[10px] bg-[#eef0f4] p-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-[8px] px-3 py-[7px] text-[13px] font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-[#6b7280] hover:text-gray-900'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`rounded-[8px] px-3 py-[7px] text-[13px] font-semibold transition-colors ${
              statusFilter === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-[#6b7280] hover:text-gray-900'
            }`}
          >
            Hoạt động
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`rounded-[8px] px-3 py-[7px] text-[13px] font-semibold transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-[#6b7280] hover:text-gray-900'
            }`}
          >
            Đang tắt
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
        <div className="border-b border-[#f3f4f6] px-[18px] py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-bold text-gray-900">Danh sách {entityLabel}</span>
            <span className="text-[12px] font-semibold text-[#6b7280]">{sortedItems.length} bản ghi</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                {columns.map((column) => {
                  const active = sortKey === column.key;
                  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                  return (
                    <th
                      key={column.key}
                      className="px-4 py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.05em]"
                    >
                      <button
                        type="button"
                        onClick={() => onSort(column.key)}
                        className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 -ml-1 transition-colors ${active ? 'text-[#2563eb]' : 'text-[#6b7280] hover:text-gray-900'}`}
                        title={`Sắp xếp theo ${column.label.toLowerCase()}`}
                      >
                        <span>{column.label}</span>
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  );
                })}
                <th className="px-4 py-[10px]"></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-[13px] text-[#6b7280]">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              )}
              {sortedItems.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={(e) => openRow(e, item)}
                  className="cursor-pointer border-t border-[#f3f4f6] transition-colors hover:bg-[#eff6ff]"
                  style={{ background: index % 2 === 1 ? '#f7f9fc' : undefined }}
                >
                  {columns.map((column) => {
                    const isActiveStatus = column.format === 'activeStatus';
                    const isCode = column.key === 'code';
                    const active = (item as Record<string, unknown>).isActive !== false;
                    return (
                      <td
                        key={column.key}
                        className={`px-4 py-[11px] align-middle ${
                          isCode ? "font-mono text-[12px] font-bold text-[#2140da]" : 'text-[#4b5563]'
                        } ${column.key === 'name' ? 'font-semibold text-gray-800' : ''}`}
                      >
                        {column.render ? (
                          column.render(item as MasterRecord & Record<string, unknown>)
                        ) : isActiveStatus ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${
                              active ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#fee2e2] text-[#dc2626]'
                            }`}
                          >
                            {active ? 'Hoạt động' : 'Tắt'}
                          </span>
                        ) : (
                          String(getItemValue(item, column.key) ?? '—')
                        )}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-4 py-[11px] text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="mr-3 cursor-pointer text-[12.5px] font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteItem(item);
                        setError('');
                      }}
                      className="cursor-pointer text-[12.5px] font-semibold text-[#dc2626] hover:opacity-80"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#eceef2] px-6 py-5">
              <h2 className="text-[18px] font-bold text-gray-900">
                {editingItem ? `Sửa ${entityLabel}` : `Thêm ${entityLabel} mới`}
              </h2>
              <button className="cursor-pointer text-2xl leading-none text-[#9ca3af] hover:text-gray-600" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 p-6">
                {error && (
                  <div className="flex items-center gap-2 rounded-[10px] border border-[#fecaca] bg-[#fee2e2] px-4 py-3 text-[13px] text-[#dc2626]">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                {fields.map((field) => (
                  <div key={field.key}>
                    {field.type === 'checkbox' ? (
                      <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[#d1d5db] text-[#2563eb] focus:ring-[#2563eb]"
                          checked={Boolean(form[field.key])}
                          onChange={(e) => update(field.key, e.target.checked)}
                        />
                        <span className="text-gray-700">{field.label}</span>
                      </label>
                    ) : (
                      <>
                        <label className="mb-1 block text-[13px] font-medium text-gray-700">
                          {field.label}
                          {field.required ? ' *' : ''}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            className="w-full rounded-[10px] border border-[#eceef2] px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                            rows={3}
                            required={field.required}
                            value={String(form[field.key] ?? '')}
                            onChange={(e) => update(field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <input
                            type={field.type === 'email' ? 'email' : 'text'}
                            className={`w-full rounded-[10px] border border-[#eceef2] px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 ${
                              field.key === 'code' ? "font-mono" : ''
                            }`}
                            required={field.required}
                            value={String(form[field.key] ?? '')}
                            onChange={(e) => update(field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#eceef2] px-6 py-4">
                <button
                  type="button"
                  className="cursor-pointer rounded-[10px] border border-[#eceef2] px-4 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-[#f7f8fb]"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-[10px] bg-[#2563eb] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Đang lưu...' : editingItem ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteItem(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="p-6">
              <h3 className="mb-2 text-[17px] font-bold text-gray-900">Xoá {entityLabel}?</h3>
              <p className="mb-6 text-[13px] text-[#6b7280]">
                Bạn có chắc chắn muốn xoá <strong className="text-gray-800">{String(getItemValue(deleteItem, 'name') ?? deleteItem.id)}</strong>?
              </p>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#fecaca] bg-[#fee2e2] px-4 py-3 text-[13px] text-[#dc2626]">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex-1 cursor-pointer rounded-[10px] border border-[#eceef2] px-4 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-[#f7f8fb]"
                  onClick={() => setDeleteItem(null)}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="flex-1 cursor-pointer rounded-[10px] bg-[#dc2626] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? 'Đang xoá...' : 'Xoá'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
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
      const leftValue = String(getItemValue(left, defaultSortKey) ?? '').toLowerCase();
      const rightValue = String(getItemValue(right, defaultSortKey) ?? '').toLowerCase();
      return leftValue.localeCompare(rightValue, 'vi');
    });
  }, [defaultSortKey, filteredItems]);

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          onClick={openCreateModal}
        >
          + Tạo {entityLabel}
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-gray-600">Tổng bản ghi</div>
          <div className="text-3xl font-bold text-gray-800">{items.length}</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-gray-600">Đang hoạt động</div>
          <div className="text-3xl font-bold text-green-600">{activeCount}</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-gray-600">Đang tắt</div>
          <div className="text-3xl font-bold text-gray-800">{items.length - activeCount}</div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Tìm ${entityLabel.toLowerCase()}...`}
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-green-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Hoạt động
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-gray-700 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Đang tắt
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-bold text-gray-800">Danh sách {entityLabel}</span>
            <span className="text-sm text-gray-500">{sortedItems.length} bản ghi</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedItems.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-sm text-gray-500">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              )}
              {sortedItems.map((item) => (
                <tr key={item.id}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-gray-700">
                      {column.render
                        ? column.render(item as MasterRecord & Record<string, unknown>)
                        : String(getItemValue(item, column.key) ?? '—')}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteItem(item);
                          setError('');
                        }}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800">
                {editingItem ? `Sửa ${entityLabel}` : `Tạo ${entityLabel} mới`}
              </h2>
              <button className="text-2xl leading-none text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 p-6">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                {fields.map((field) => (
                  <div key={field.key}>
                    {field.type === 'checkbox' ? (
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={Boolean(form[field.key])}
                          onChange={(e) => update(field.key, e.target.checked)}
                        />
                        <span className="text-gray-700">{field.label}</span>
                      </label>
                    ) : (
                      <>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.required ? ' *' : ''}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            required={field.required}
                            value={String(form[field.key] ?? '')}
                            onChange={(e) => update(field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <input
                            type={field.type === 'email' ? 'email' : 'text'}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Đang lưu...' : editingItem ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteItem(null);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="p-6">
              <h3 className="mb-2 text-lg font-bold text-gray-800">Xóa {entityLabel}?</h3>
              <p className="mb-6 text-sm text-gray-600">
                Bạn có chắc chắn muốn xóa <strong>{String(getItemValue(deleteItem, 'name') ?? deleteItem.id)}</strong>?
              </p>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  onClick={() => setDeleteItem(null)}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

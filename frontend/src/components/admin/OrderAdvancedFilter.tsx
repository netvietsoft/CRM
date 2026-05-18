'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Filter, X } from 'lucide-react';
import Select from '@/components/ui/Select';

const dateFieldOptions = [
  { value: 'createdAt', label: 'Ngày tạo' },
  { value: 'updatedAt', label: 'Mới cập nhật' },
] as const;

type DateField = (typeof dateFieldOptions)[number]['value'];
type DateSort = 'desc' | 'asc';
type DateFilterType = '' | 'date' | 'month' | 'year';

function getInputType(filterType: DateFilterType) {
  if (filterType === 'date') return 'date';
  if (filterType === 'month') return 'month';
  return 'number';
}

export default function OrderAdvancedFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [dateField, setDateField] = useState<DateField>(
    searchParams.get('dateField') === 'createdAt' ? 'createdAt' : 'updatedAt',
  );
  const [dateSort, setDateSort] = useState<DateSort>(
    searchParams.get('dateSort') === 'asc' ? 'asc' : 'desc',
  );
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>(
    ['date', 'month', 'year'].includes(searchParams.get('dateFilterType') || '')
      ? (searchParams.get('dateFilterType') as DateFilterType)
      : '',
  );
  const [dateValue, setDateValue] = useState(searchParams.get('dateValue') || '');

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParams.get('dateField') || searchParams.get('dateSort')) count += 1;
    if (searchParams.get('dateFilterType') && searchParams.get('dateValue')) count += 1;
    return count;
  }, [searchParams]);

  const syncFromUrl = () => {
    setDateField(searchParams.get('dateField') === 'createdAt' ? 'createdAt' : 'updatedAt');
    setDateSort(searchParams.get('dateSort') === 'asc' ? 'asc' : 'desc');
    setDateFilterType(
      ['date', 'month', 'year'].includes(searchParams.get('dateFilterType') || '')
        ? (searchParams.get('dateFilterType') as DateFilterType)
        : '',
    );
    setDateValue(searchParams.get('dateValue') || '');
  };

  const openModal = () => {
    syncFromUrl();
    setIsOpen(true);
  };

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dateField', dateField);
    params.set('dateSort', dateSort);

    if (dateFilterType && dateValue) {
      params.set('dateFilterType', dateFilterType);
      params.set('dateValue', dateValue);
    } else {
      params.delete('dateFilterType');
      params.delete('dateValue');
    }

    params.delete('page');
    router.push(`/admin/orders?${params.toString()}`);
    setIsOpen(false);
  };

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dateField');
    params.delete('dateSort');
    params.delete('dateFilterType');
    params.delete('dateValue');
    params.delete('page');

    setDateField('updatedAt');
    setDateSort('desc');
    setDateFilterType('');
    setDateValue('');
    router.push(`/admin/orders?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold transition-all ${
          activeFilterCount > 0
            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Lọc nâng cao</span>
        {activeFilterCount > 0 && (
          <span className="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px]">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng bộ lọc"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Lọc đơn hàng</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Sắp xếp hoặc lọc theo mốc thời gian</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Loại ngày</label>
                <Select
                  value={dateField}
                  onChange={(value) => setDateField(value as DateField)}
                  size="md"
                  options={dateFieldOptions.map((option) => ({ value: option.value, label: option.label }))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Sắp xếp</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDateSort('desc')}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-bold transition-all ${
                      dateSort === 'desc'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Mới nhất
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateSort('asc')}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-bold transition-all ${
                      dateSort === 'asc'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Cũ nhất
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Lọc cụ thể</label>
                  <Select
                    value={dateFilterType}
                    onChange={(value) => {
                      setDateFilterType(value as DateFilterType);
                      setDateValue('');
                    }}
                    size="md"
                    options={[
                      { value: '', label: 'Không lọc mốc cụ thể' },
                      { value: 'date', label: 'Ngày cụ thể' },
                      { value: 'month', label: 'Tháng cụ thể' },
                      { value: 'year', label: 'Năm cụ thể' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giá trị</label>
                  <input
                    type={getInputType(dateFilterType)}
                    min={dateFilterType === 'year' ? '2000' : undefined}
                    max={dateFilterType === 'year' ? '2100' : undefined}
                    placeholder={dateFilterType === 'year' ? 'VD: 2026' : 'Chọn thời gian'}
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    disabled={!dateFilterType}
                    className="w-full bg-white px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={clearFilter}
                className="px-4 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-white border border-transparent hover:border-gray-200"
              >
                Xóa lọc
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={applyFilter}
                  disabled={Boolean(dateFilterType && !dateValue)}
                  className="px-4 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

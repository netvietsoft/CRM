'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';
import { Trash2, Shield, Store, UserCheck, Search, Edit2 } from 'lucide-react';

interface StaffRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string | Date;
  staffStore?: {
    name?: string | null;
  } | null;
  _count?: {
    ordersAsSeller?: number;
  };
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function StaffTableClient() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchName, setSearchName] = useState('');
  const [searchStore, setSearchStore] = useState('');

  const fetchStaff = useCallback(() => {
    return apiClientClient.get<StaffRecord[]>('/admin/staff');
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchStaff()
      .then((data) => {
        if (!cancelled) {
          setStaff(data || []);
        }
      })
      .catch((error) => {
        console.error('Error fetching staff', error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchStaff]);

  const filtered = useMemo(() => {
    let list = staff;
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
      );
    }
    if (searchStore.trim()) {
      const q = searchStore.trim().toLowerCase();
      list = list.filter(s => s.staffStore?.name?.toLowerCase().includes(q));
    }
    return list;
  }, [staff, searchName, searchStore]);

  const handleRemoveStaff = async (id: string, name: string | null) => {
    if (!confirm(`Gỡ quyền nhân viên của "${name}"?\nNgười dùng này sẽ trở lại vai trò Khách hàng.`)) return;
    try {
      await apiClientClient.delete(`/admin/staff/${id}`);
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      alert(getErrorMessage(error, 'Lỗi khi gỡ quyền nhân viên'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-[14px] border border-[#eceef2] p-4 mb-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Tên, Email hoặc SĐT"
                className="pl-9 pr-3 py-2 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent w-64"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={16} />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Tên cửa hàng"
                className="pl-9 pr-3 py-2 border border-[#e5e7eb] rounded-[10px] text-[13px] outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent w-48"
                value={searchStore}
                onChange={e => setSearchStore(e.target.value)}
              />
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={16} />
            </div>
          </div>

          <Link
            href="/admin/staff/assign"
            className="px-4 py-[9px] bg-[#2563eb] text-white text-[13px] font-semibold rounded-[10px] hover:bg-[#1d4ed8] transition-colors flex items-center gap-2"
          >
            <UserCheck size={16} />
            Thêm nhân viên
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-[#eceef2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] min-w-[760px]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="px-4 py-[10px] text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Nhân viên</th>
                <th className="px-3 py-[10px] text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Số điện thoại</th>
                <th className="px-3 py-[10px] text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap text-right">Đơn phụ trách</th>
                <th className="px-3 py-[10px] text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] whitespace-nowrap">Vào làm</th>
                <th className="px-4 py-[10px]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-[#f9fafb] text-[#d1d5db] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-[#111827]">Không tìm thấy nhân viên nào</h3>
                      <p className="text-[#6b7280] mt-2 text-sm max-w-xs mx-auto">Thử thay đổi bộ lọc hoặc thêm nhân viên mới vào hệ thống.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-t border-[#f3f4f6] hover:bg-[#eff6ff] transition-colors"
                  style={{ background: i % 2 === 1 ? '#f7f9fc' : undefined }}
                >
                  <td className="px-4 py-[11px] whitespace-nowrap">
                    <div className="flex items-center gap-[10px]">
                      <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0">
                        {(s.name?.trim()?.charAt(0) || '?').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#111827] whitespace-nowrap">{s.name}</div>
                        <div className="text-[11.5px] text-[#9ca3af]">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-[11px] text-[#4b5563] whitespace-nowrap">
                    {s.phone}
                  </td>
                  <td className="px-3 py-[11px] text-right font-semibold text-[#111827]">
                    {s._count?.ordersAsSeller ?? 0}
                  </td>
                  <td className="px-3 py-[11px] whitespace-nowrap text-[#6b7280]">
                    {fmtDate(s.createdAt)}
                  </td>
                  <td className="px-4 py-[11px] whitespace-nowrap">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/staff/assign?userId=${s.id}`}
                        className="text-[#2563eb] font-semibold hover:underline flex items-center gap-1.5"
                        title="Chỉnh sửa quyền"
                      >
                        <Edit2 size={15} />
                        Phân quyền
                      </Link>
                      <button
                        onClick={() => handleRemoveStaff(s.id, s.name)}
                        className="p-1.5 text-[#dc2626] hover:bg-[#fee2e2] rounded-lg transition-colors"
                        title="Gỡ quyền nhân viên"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

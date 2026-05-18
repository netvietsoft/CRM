'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';
import { Pencil, Trash2, Shield, Mail, Phone, Store, UserCheck, Search, ShieldCheck, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d));
}

export default function StaffTableClient() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Filter state
  const [searchName, setSearchName] = useState('');
  const [searchStore, setSearchStore] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    try {
      setLoading(true);
      const data = await apiClientClient.get<any[]>('/admin/staff');
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff', error);
    } finally {
      setLoading(false);
    }
  }

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

  const handleRemoveStaff = async (id: string, name: string) => {
    if (!confirm(`Gỡ quyền nhân viên của "${name}"?\nNgười dùng này sẽ trở lại vai trò Khách hàng.`)) return;
    try {
      await apiClientClient.delete(`/admin/staff/${id}`);
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gỡ quyền nhân viên');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Tên, Email hoặc SĐT"
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Tên cửa hàng"
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
                value={searchStore}
                onChange={e => setSearchStore(e.target.value)}
              />
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>

          <Link
            href="/admin/staff/assign"
            className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
          >
            <UserCheck size={16} />
            Thêm Nhân viên
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Nhân viên</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Số điện thoại</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">Đơn hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Ngày tham gia</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Không tìm thấy nhân viên nào</h3>
                      <p className="text-gray-500 mt-2 text-sm max-w-xs mx-auto">Thử thay đổi bộ lọc hoặc thêm nhân viên mới vào hệ thống.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                      {s.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 bg-blue-50 text-blue-700 text-sm font-bold rounded-full">
                      {s._count?.ordersAsSeller ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                    {fmtDate(s.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/admin/staff/assign?userId=${s.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa quyền"
                      >
                        <Edit2 size={18} />
                      </Link>
                      <button
                        onClick={() => handleRemoveStaff(s.id, s.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Gỡ quyền nhân viên"
                      >
                        <Trash2 size={18} />
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

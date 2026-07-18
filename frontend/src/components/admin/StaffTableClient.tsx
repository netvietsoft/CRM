'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';
import { Trash2, Shield, Store, UserCheck, Search, Edit2 } from 'lucide-react';

interface StaffRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string | Date;
  staffPermissions?: string[] | null;
  staffStore?: {
    name?: string | null;
  } | null;
  _count?: {
    ordersAsSeller?: number;
  };
}

// Bảng quyền theo module: mỗi hàng 1 module, cột Xem / Sửa / Xoá (ô null = không áp dụng).
const PERM_MODULES: Array<{ name: string; view: string | null; manage: string | null; del: string | null; note?: string }> = [
  { name: 'Đơn hàng', view: 'ORDERS_VIEW', manage: 'ORDERS_MANAGE', del: 'ORDERS_DELETE' },
  { name: 'Đơn hàng — chỉ đơn mình lên', view: 'ORDERS_VIEW_OWN', manage: null, del: null, note: 'NV trực page: chỉ thấy đơn + doanh thu của mình (bỏ tick "Xem" ở hàng trên)' },
  { name: 'Sản phẩm', view: 'PRODUCTS_VIEW', manage: 'PRODUCTS_MANAGE', del: 'PRODUCTS_DELETE' },
  { name: 'Danh mục', view: 'CATEGORIES_VIEW', manage: 'CATEGORIES_MANAGE', del: 'CATEGORIES_DELETE' },
  { name: 'Khách hàng', view: 'CUSTOMERS_VIEW', manage: 'CUSTOMERS_MANAGE', del: 'CUSTOMERS_DELETE' },
  { name: 'Voucher / Khuyến mãi', view: 'VOUCHERS_VIEW', manage: 'VOUCHERS_MANAGE', del: 'VOUCHERS_DELETE' },
  { name: 'Tin nhắn CCM (inbox)', view: 'MESSENGER_VIEW', manage: 'MESSENGER_SEND', del: null, note: 'Sửa = được trả lời tin khách' },
  { name: 'CSKH chiến dịch', view: 'MESSAGING_VIEW', manage: 'MESSAGING_MANAGE', del: null },
  { name: 'Tích hợp', view: 'INTEGRATIONS_VIEW', manage: 'INTEGRATIONS_MANAGE', del: null },
  { name: 'Cài đặt cửa hàng', view: null, manage: 'STORE_SETTINGS', del: null },
];

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
  const router = useRouter();
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

  const openRow = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"], [role="switch"]')) return;
    router.push(`/admin/staff/assign?userId=${id}`);
  };

  // Modal bảng quyền: chọn NV → tick Xem/Sửa/Xoá theo module → lưu (ghi đè staffPermissions).
  const [permStaff, setPermStaff] = useState<StaffRecord | null>(null);
  const [permSet, setPermSet] = useState<Set<string>>(new Set());
  const [permSaving, setPermSaving] = useState(false);

  const openPerm = (s: StaffRecord) => {
    setPermStaff(s);
    setPermSet(new Set(Array.isArray(s.staffPermissions) ? s.staffPermissions : []));
  };
  const togglePerm = (key: string | null) => {
    if (!key) return;
    setPermSet((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };
  const savePerm = async () => {
    if (!permStaff) return;
    setPermSaving(true);
    try {
      const permissions = [...permSet];
      await apiClientClient.post(`/admin/staff/${permStaff.id}/permissions`, { permissions });
      setStaff((prev) => prev.map((s) => (s.id === permStaff.id ? { ...s, staffPermissions: permissions } : s)));
      setPermStaff(null);
    } catch (error) {
      alert(getErrorMessage(error, 'Lưu quyền thất bại'));
    } finally {
      setPermSaving(false);
    }
  };

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
                  onClick={(e) => openRow(e, s.id)}
                  className="border-t border-[#f3f4f6] hover:bg-[#eff6ff] transition-colors cursor-pointer"
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
                      <button
                        onClick={() => openPerm(s)}
                        className="text-[#7c3aed] font-semibold hover:underline flex items-center gap-1.5"
                        title="Bảng quyền theo module (Xem/Sửa/Xoá)"
                      >
                        <Shield size={15} />
                        Phân quyền
                      </button>
                      <Link
                        href={`/admin/staff/assign?userId=${s.id}`}
                        className="text-[#2563eb] font-semibold hover:underline flex items-center gap-1.5"
                        title="Sửa thông tin nhân viên"
                      >
                        <Edit2 size={15} />
                        Sửa
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

      {/* Modal bảng quyền nhân viên — matrix module × Xem/Sửa/Xoá */}
      {permStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setPermStaff(null); }}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f3f4f6] px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#111827]">🛡 Bảng quyền: {permStaff.name}</h3>
                <p className="text-[12px] text-[#6b7280]">Tick quyền theo từng module — Xem / Sửa (tạo + cập nhật) / Xoá.</p>
              </div>
              <button onClick={() => setPermStaff(null)} className="text-2xl leading-none text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    <th className="px-3 py-2 text-left text-[11.5px] font-bold text-[#374151]">Module</th>
                    {['Xem', 'Sửa', 'Xoá'].map((c) => (
                      <th key={c} className="w-[64px] px-2 py-2 text-center text-[11.5px] font-bold text-[#374151]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERM_MODULES.map((m, i) => (
                    <tr key={m.name} className={`border-t border-[#f1f5f9] ${i % 2 === 1 ? 'bg-[#f9fafb]' : ''}`}>
                      <td className="px-3 py-2 font-semibold text-[#111827]">
                        {m.name}
                        {m.note && <div className="text-[10.5px] font-normal text-[#9ca3af]">{m.note}</div>}
                      </td>
                      {[m.view, m.manage, m.del].map((key, ci) => (
                        <td key={ci} className="px-2 py-2 text-center">
                          {key ? (
                            <span
                              onClick={() => togglePerm(key)}
                              className={`inline-flex h-[22px] w-[22px] cursor-pointer select-none items-center justify-center rounded-md text-[12px] font-bold ${permSet.has(key) ? 'bg-[#3c55e6] text-white' : 'bg-[#f1f5f9] text-[#9ca3af]'}`}
                            >
                              {permSet.has(key) ? '✓' : ''}
                            </span>
                          ) : (
                            <span className="text-[#e5e7eb]">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#f3f4f6] px-6 py-4">
              <div className="flex gap-2">
                <button onClick={() => setPermSet(new Set(PERM_MODULES.flatMap((m) => [m.view, m.manage, m.del].filter(Boolean) as string[])))} className="rounded-lg bg-[#f3f4f6] px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-[#e5e7eb]">Chọn tất cả</button>
                <button onClick={() => setPermSet(new Set())} className="rounded-lg bg-[#f3f4f6] px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-[#e5e7eb]">Bỏ hết</button>
              </div>
              <button onClick={() => void savePerm()} disabled={permSaving} className="rounded-[10px] bg-[#2563eb] px-5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50">
                {permSaving ? 'Đang lưu…' : '💾 Lưu quyền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

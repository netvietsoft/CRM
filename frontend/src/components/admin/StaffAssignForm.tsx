'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { User, Lock, Mail, Phone, Check, AlertCircle, Loader2, UserPlus, Eye, EyeOff, ArrowLeft, Store } from 'lucide-react';

interface StoreSummary {
  id: string;
  name: string | null;
}

interface CurrentUser {
  role?: string | null;
  store?: {
    id: string;
  } | null;
}

interface StaffAssignUserDetail {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  staffStoreId?: string | null;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

function getInitialStoreId(currentUser: CurrentUser, stores: StoreSummary[]) {
  if (currentUser.store?.id) {
    return currentUser.store.id;
  }

  if (currentUser.role === 'MODERATOR' && stores.length > 0) {
    return stores[0].id;
  }

  return '';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function StaffAssignForm({ stores, currentUser }: { stores: StoreSummary[]; currentUser: CurrentUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editUserId = searchParams.get('userId');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New User Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => getInitialStoreId(currentUser, stores));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If Edit Mode, fetch user details
  useEffect(() => {
    if (editUserId) {
      const fetchUserDetails = async () => {
        setLoading(true);
        try {
          const user = await apiClientClient.get<StaffAssignUserDetail>(`/admin/customers/${editUserId}`);
          setFormData({
            name: user.name || '',
            phone: user.phone || '',
            email: user.email || '',
            password: ''
          });
          if (user.staffStoreId) setSelectedStoreId(user.staffStoreId);
        } catch {
          setError('Không tìm thấy thông tin người dùng');
        } finally {
          setLoading(false);
        }
      };
      fetchUserDetails();
    }
  }, [editUserId]);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    let storeIdToUse = selectedStoreId;
    if (!storeIdToUse && currentUser?.store?.id) {
      storeIdToUse = currentUser.store.id;
    }

    if (!storeIdToUse) {
      setError('Tài khoản của bạn chưa được liên kết với cửa hàng nào để tạo nhân viên.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editUserId) {
        await apiClientClient.post('/admin/staff/assign', {
          userId: editUserId,
          storeId: storeIdToUse
        });
      } else {
        await apiClientClient.post('/admin/staff', {
          ...formData,
          storeId: storeIdToUse
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/staff');
        router.refresh();
      }, 1500);
    } catch (error) {
      setError(getErrorMessage(error, 'Đã xảy ra lỗi'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-10 h-10 text-[#2563eb] animate-spin mb-4" />
        <p className="text-[#6b7280]">Đang tải thông tin...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto font-[Inter,sans-serif]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[#f3f4f6] rounded-full transition-colors text-[#6b7280]"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[24px] font-extrabold text-[#111827] tracking-[-0.4px]">
              {editUserId ? 'Chỉnh sửa nhân viên' : 'Tạo Nhân Viên'}
            </h1>
          </div>
          <p className="text-[#6b7280] text-[13px] ml-11">
            Thiết lập thông tin tài khoản nhân viên. Quyền hạn sẽ được cấp tự động.
          </p>
        </div>

        <div className="flex items-center gap-3 ml-11 md:ml-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-[10px] font-semibold text-[#6b7280] hover:bg-[#f3f4f6] transition-colors text-[13px]"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[10px] font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-[13px]"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <UserPlus size={18} />
            )}
            {editUserId ? 'Lưu thay đổi' : 'Tạo nhân viên'}
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-6 bg-[#d1fae5] border border-[#a7f3d0] text-[#047857] px-6 py-4 rounded-[14px] flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Check className="text-[#047857]" />
          <span className="font-bold">Thành công!</span> {editUserId ? 'Đã cập nhật thông tin nhân viên.' : 'Đã tạo tài khoản nhân viên thành công.'}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-[#fee2e2] border border-[#fecaca] text-[#dc2626] px-6 py-4 rounded-[14px] flex items-center gap-3">
          <AlertCircle className="text-[#dc2626]" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-1">
        {/* Left Column: User Information */}
        <div className="bg-white rounded-[14px] border border-[#eceef2] overflow-hidden">
          <div className="p-8 border-b border-[#f3f4f6] bg-[#f9fafb]">
            <h3 className="font-bold text-[#111827] flex items-center gap-2 text-lg">
              <User className="text-[#2563eb]" size={20} />
              Thông tin tài khoản
            </h3>
          </div>
          <div className="space-y-2 px-8">
            <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider ml-1">Cửa hàng</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={stores.find(s => s.id === selectedStoreId)?.name || (selectedStoreId ? 'Đang tải...' : 'Chưa xác định')}
                className="w-full pl-10 pr-4 py-3 bg-[#f3f4f6] border border-[#e5e7eb] rounded-[10px] text-[#6b7280] text-sm cursor-not-allowed font-medium"
              />
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
            </div>
          </div>
          <div className="space-y-2 px-8 mt-4">
            <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider ml-1">ID Cửa hàng</label>
            <input
              type="text"
              readOnly
              value={selectedStoreId || 'N/A'}
              className="w-full px-4 py-3 bg-[#f9fafb] border border-[#f3f4f6] rounded-[10px] text-[#9ca3af] text-xs font-[JetBrains_Mono,monospace] cursor-not-allowed"
            />
          </div>
          <div className="px-8 py-4 space-y-4">

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider ml-1">Họ và tên</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px] focus:ring-2 focus:ring-[#2563eb] focus:bg-white transition-all outline-none text-sm"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider ml-1">Số điện thoại</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                  className="w-full pl-10 pr-4 py-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px] focus:ring-2 focus:ring-[#2563eb] focus:bg-white transition-all outline-none text-sm"
                />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nhanvien@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px] focus:ring-2 focus:ring-[#2563eb] focus:bg-white transition-all outline-none text-sm"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider ml-1">{editUserId ? 'Mật khẩu (Để trống nếu không đổi)' : 'Mật khẩu'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editUserId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px] focus:ring-2 focus:ring-[#2563eb] focus:bg-white transition-all outline-none text-sm"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-all"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { User, Lock, Mail, Phone, Check, AlertCircle, Loader2, UserPlus, Eye, EyeOff, ArrowLeft, Store, ShieldCheck } from 'lucide-react';

export default function StaffAssignForm({ stores, currentUser }: { stores: any[], currentUser: any }) {
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
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-select store based on current user
  useEffect(() => {
    if (currentUser?.store?.id) {
      setSelectedStoreId(currentUser.store.id);
    } else if (currentUser?.role === 'MODERATOR' && stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    }
  }, [currentUser, stores]);

  // If Edit Mode, fetch user details
  useEffect(() => {
    if (editUserId) {
      const fetchUserDetails = async () => {
        setLoading(true);
        try {
          const user = await apiClientClient.get<any>(`/admin/customers/${editUserId}`);
          setFormData({
            name: user.name || '',
            phone: user.phone || '',
            email: user.email || '',
            password: ''
          });
          if (user.staffStoreId) setSelectedStoreId(user.staffStoreId);
        } catch (err) {
          setError('Không tìm thấy thông tin người dùng');
        } finally {
          setLoading(false);
        }
      };
      fetchUserDetails();
    }
  }, [editUserId]);

  const handleSubmit = async (e?: React.FormEvent) => {
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
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500">Đang tải thông tin...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {editUserId ? 'Chỉnh sửa nhân viên' : 'Tạo Nhân Viên'}
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-medium ml-11">
            Thiết lập thông tin tài khoản nhân viên. Quyền hạn sẽ được cấp tự động.
          </p>
        </div>

        <div className="flex items-center gap-3 ml-11 md:ml-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors text-sm"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
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
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Check className="text-green-600" />
          <span className="font-bold">Thành công!</span> {editUserId ? 'Đã cập nhật thông tin nhân viên.' : 'Đã tạo tài khoản nhân viên thành công.'}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="text-red-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-1">
        {/* Left Column: User Information */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 bg-gray-50/30">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
              <User className="text-blue-600" size={20} />
              Thông tin tài khoản
            </h3>
          </div>
          <div className="space-y-2 px-8">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Cửa hàng</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={stores.find(s => s.id === selectedStoreId)?.name || (selectedStoreId ? 'Đang tải...' : 'Chưa xác định')}
                className="w-full pl-10 pr-4 py-3.5 bg-gray-100 border border-gray-200 rounded-2xl text-gray-500 text-sm cursor-not-allowed font-medium"
              />
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>
          <div className="space-y-2 px-8 mt-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">ID Cửa hàng</label>
            <input
              type="text"
              readOnly
              value={selectedStoreId || 'N/A'}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 text-xs font-mono cursor-not-allowed"
            />
          </div>
          <div className="px-8 py-4 space-y-4">

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Họ và tên</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Số điện thoại</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm"
                />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nhanvien@gmail.com"
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{editUserId ? 'Mật khẩu (Để trống nếu không đổi)' : 'Mật khẩu'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editUserId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-200/50 transition-all"
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

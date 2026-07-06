'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import ImageUpload from './ImageUpload';
import Select from '@/components/ui/Select';

interface AddressOption {
  code: string;
  name: string;
}

export interface StoreProfileData {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  phone: string;
  email: string;
  addressStreet: string;
  addressWard: string;
  addressProvince: string;
  allowCOD: boolean;
  bankName: string;
  bankAccountNo: string;
  bankOwnerName: string;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function StoreProfileForm({ initialData }: { initialData: StoreProfileData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState(initialData.name || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl || '');

  // Address
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);
  const [province, setProvince] = useState(initialData.addressProvince || '');
  const [ward, setWard] = useState(initialData.addressWard || '');
  const [street, setStreet] = useState(initialData.addressStreet || '');

  // Payment
  const [allowCOD, setAllowCOD] = useState(initialData.allowCOD ?? true);
  const [bankName, setBankName] = useState(initialData.bankName || '');
  const [bankAccountNo, setBankAccountNo] = useState(initialData.bankAccountNo || '');
  const [bankOwnerName, setBankOwnerName] = useState(initialData.bankOwnerName || '');

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load provinces
  useEffect(() => {
    fetch('/internal-api/address?type=provinces')
      .then(res => res.json())
      .then(setProvinces).catch(console.error);
  }, []);

  // Load wards when province changes
  useEffect(() => {
    if (province && provinces.length > 0) {
      const p = provinces.find(x => x.name === province);
      if (p) {
        fetch(`/internal-api/address?type=wards&provinceCode=${p.code}`)
          .then(res => res.json())
          .then(setWards).catch(console.error);
      }
    }
  }, [province, provinces]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await apiClientClient.put('/stores', {
        name,
        description,
        phone,
        email,
        logoUrl,
        addressStreet: street,
        addressWard: ward,
        addressProvince: province,
        allowCOD,
        bankName,
        bankAccountNo,
        bankOwnerName: bankOwnerName.toUpperCase(),
      });

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert(getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật thông tin.'));
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      setPasswordLoading(false);
      return;
    }

    try {
      await apiClientClient.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMsg({
        type: 'error',
        text: getErrorMessage(error, 'Mật khẩu hiện tại không đúng'),
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {success && (
        <div className="bg-[#d1fae5] border border-[#6ee7b7] text-[#047857] px-4 py-3 rounded-[14px] flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span className="text-xl">✅</span>
          <p className="font-medium">Cập nhật thông tin cửa hàng thành công!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Basic Info & Address */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white p-[22px] rounded-[14px] border border-[#eceef2]">
              <h3 className="text-[15px] font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-[9px] bg-[#eff6ff] text-[#2563eb] flex items-center justify-center text-sm">🏪</span>
                Thông tin cơ bản
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Tên cửa hàng</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 outline-none transition-all"
                    placeholder="Ví dụ: Shop Quần Áo XYZ"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="block text-[12.5px] font-semibold text-[#4b5563]">Mô tả ngắn</label>
                    <span className={`text-[10px] font-medium ${description.length > 750 ? 'text-[#dc2626]' : 'text-[#9ca3af]'}`}>
                      {description.length}/800
                    </span>
                  </div>
                  <textarea
                    value={description}
                    maxLength={800}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 outline-none transition-all h-24 resize-y"
                    placeholder="Giới thiệu ngắn về cửa hàng của bạn..."
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Số điện thoại liên hệ</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Email liên hệ</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-[22px] rounded-[14px] border border-[#eceef2]">
              <h3 className="text-[15px] font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-[9px] bg-[#ffedd5] text-[#c2410c] flex items-center justify-center text-sm">📍</span>
                Địa chỉ lấy hàng
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Tỉnh/Thành phố</label>
                  <Select
                    value={province}
                    onChange={(val) => {
                      setProvince(val);
                      setWard('');
                    }}
                    className="w-full"
                    placeholder="Chọn tỉnh/thành"
                    options={provinces.map(p => ({ value: p.name, label: p.name }))}
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Quận/Huyện/Xã</label>
                  <Select
                    value={ward}
                    onChange={(val) => setWard(val)}
                    className="w-full"
                    placeholder="Chọn quận/huyện/xã"
                    options={wards.map(w => ({ value: w.name, label: w.name }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Địa chỉ chi tiết (Số nhà, tên đường...)</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-[22px] rounded-[14px] border border-[#eceef2]">
              <h3 className="text-[15px] font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-[9px] bg-[#d1fae5] text-[#047857] flex items-center justify-center text-sm">💳</span>
                Thông tin thanh toán
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Ngân hàng</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 transition-all"
                    placeholder="Ví dụ: Vietcombank"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Số tài khoản</label>
                  <input
                    type="text"
                    required
                    value={bankAccountNo}
                    onChange={e => setBankAccountNo(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] font-mono border border-[#e5e7eb] rounded-[10px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    required
                    value={bankOwnerName}
                    onChange={e => setBankOwnerName(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 transition-all"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-3 p-3 bg-[#f9fafb] rounded-[10px] cursor-pointer hover:bg-[#f3f4f6] transition-colors w-full">
                    <input
                      type="checkbox"
                      checked={allowCOD}
                      onChange={e => setAllowCOD(e.target.checked)}
                      className="w-5 h-5 text-[#2563eb] rounded focus:ring-[#2563eb]"
                    />
                    <span className="text-[13px] font-medium text-[#374151]">Thanh toán khi nhận hàng (COD)</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2563eb] text-white rounded-[11px] font-bold text-[13px] hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang lưu...
                </>
              ) : '💾 Lưu thay đổi thông tin'}
            </button>
          </form>
        </div>

        {/* Logo & Password */}
        <div className="space-y-4">
          <div className="bg-white p-[22px] rounded-[14px] border border-[#eceef2]">
            <h3 className="text-[15px] font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-[9px] bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center text-sm">📸</span>
              Ảnh đại diện cửa hàng
            </h3>
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              endpoint="storeLogo"
            />
          </div>

          <div className="bg-white p-[22px] rounded-[14px] border border-[#eceef2]">
            <h3 className="text-[15px] font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-[9px] bg-[#fee2e2] text-[#dc2626] flex items-center justify-center text-sm">🔒</span>
              Đổi mật khẩu
            </h3>

            {passwordMsg && (
              <div className={`p-3 rounded-[10px] mb-4 text-[13px] ${passwordMsg.type === 'success'
                ? 'bg-[#d1fae5] text-[#047857] border border-[#6ee7b7]'
                : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#4b5563] mb-1.5">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2.5 text-[13px] border border-[#e5e7eb] rounded-[10px] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 bg-[#1f2937] text-white rounded-[11px] font-bold text-[13px] hover:bg-[#111827] disabled:opacity-50 transition-colors"
              >
                {passwordLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </form>
          </div>

          <div className="p-4 bg-[#fef3c7] rounded-[14px] text-[#92400e] text-[11.5px] leading-relaxed border border-[#fcd34d]">
            <p><strong>Bảo mật:</strong> Nên thay đổi mật khẩu định kỳ và không chia sẻ tài khoản Moderator cho người khác.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

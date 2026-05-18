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

interface StoreData {
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

export default function StoreProfileForm({ initialData }: { initialData: StoreData }) {
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
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin.');
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
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: error.response?.data?.message || 'Mật khẩu hiện tại không đúng' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span className="text-xl">✅</span>
          <p className="font-medium">Cập nhật thông tin cửa hàng thành công!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Basic Info & Address */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">🏪</span>
                Thông tin cơ bản
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ví dụ: Shop Quần Áo XYZ"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-medium text-gray-700">Mô tả ngắn</label>
                    <span className={`text-[10px] font-medium ${description.length > 750 ? 'text-red-500' : 'text-gray-400'}`}>
                      {description.length}/800
                    </span>
                  </div>
                  <textarea
                    value={description}
                    maxLength={800}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24"
                    placeholder="Giới thiệu ngắn về cửa hàng của bạn..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-sm">📍</span>
                Địa chỉ lấy hàng
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện/Xã</label>
                  <Select
                    value={ward}
                    onChange={(val) => setWard(val)}
                    className="w-full"
                    placeholder="Chọn quận/huyện/xã"
                    options={wards.map(w => ({ value: w.name, label: w.name }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết (Số nhà, tên đường...)</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-sm">💳</span>
                Thông tin thanh toán
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Vietcombank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    required
                    value={bankAccountNo}
                    onChange={e => setBankAccountNo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    required
                    value={bankOwnerName}
                    onChange={e => setBankOwnerName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors w-full">
                    <input
                      type="checkbox"
                      checked={allowCOD}
                      onChange={e => setAllowCOD(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Thanh toán khi nhận hàng (COD)</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm">📸</span>
              Ảnh đại diện cửa hàng
            </h3>
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              endpoint="storeLogo"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm">🔒</span>
              Đổi mật khẩu
            </h3>

            {passwordMsg && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${passwordMsg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 disabled:opacity-50 transition-all"
              >
                {passwordLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </form>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 text-xs leading-relaxed border border-amber-100">
            <p><strong>Bảo mật:</strong> Nên thay đổi mật khẩu định kỳ và không chia sẻ tài khoản Moderator cho người khác.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

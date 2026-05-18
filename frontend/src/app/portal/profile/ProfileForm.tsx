'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X, MapPin } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface AddressOption {
  code: string;
  name: string;
}

interface ProfileFormProps {
  user: {
    name: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    dob: string;
    addressStreet: string | null;
    addressWard: string | null;
    addressDistrict: string | null;
    addressProvince: string | null;
  };
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    gender: user.gender || '',
    dob: user.dob || '',
    addressStreet: user.addressStreet || '',
    addressWard: user.addressWard || '',
    addressProvince: user.addressProvince || '',
  });

  // Address dropdown state
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Fetch provinces on mount
  useEffect(() => {
    setLoadingProvinces(true);
    fetch('/internal-api/address?type=provinces')
      .then(res => res.json())
      .then(data => {
        setProvinces(data);
        setLoadingProvinces(false);
      })
      .catch(() => setLoadingProvinces(false));
  }, []);

  const normalizeName = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/^(tỉnh|thành phố|thành\s*phố|quận|huyện|phường|xã|thị trấn|thị\s*trấn)\s+/i, '')
      .replace(/\s+/g, ' ');
  };

  // Fetch wards when province changes
  const fetchWards = useCallback(async (provinceName: string) => {
    if (!provinceName) {
      setWards([]);
      return;
    }
    // Find province code by flexible matching
    const normSearch = normalizeName(provinceName);
    const province = provinces.find(p => normalizeName(p.name) === normSearch || normalizeName(p.name).includes(normSearch));
    
    if (!province) return;

    setLoadingWards(true);
    try {
      const res = await fetch(`/internal-api/address?type=wards&provinceCode=${province.code}`);
      const data = await res.json();
      setWards(data);
      
      // If we matched exactly, update the form to use our canonical name
      if (form.addressProvince !== province.name) {
        setForm(prev => ({ ...prev, addressProvince: province.name }));
      }
    } catch {
      setWards([]);
    } finally {
      setLoadingWards(false);
    }
  }, [provinces, form.addressProvince]);

  // Load wards for existing province on initial load
  useEffect(() => {
    if (form.addressProvince && provinces.length > 0) {
      fetchWards(form.addressProvince);
    }
  }, [provinces.length > 0]); // Run once when provinces are loaded

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleProvinceChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      addressProvince: value,
      addressWard: '',
    }));
    setWards([]);
    fetchWards(value);
  };

  const handleWardChange = (value: string) => {
    setForm(prev => ({ ...prev, addressWard: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await apiClientClient.put('/users/profile', form);
      setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
      router.refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
    } finally {
      setLoading(false);
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
      setPasswordMsg({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  const isConfirmValid = confirmDeleteInput === user.name || confirmDeleteInput === user.phone;

  const handleDeleteAccount = async () => {
    if (!isConfirmValid) return;
    setDeleteLoading(true);

    try {
      await apiClientClient.delete('/users/profile');
      // Redirect to login page
      router.push('/login');
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra khi xóa tài khoản');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm";

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800">Thông tin cá nhân</h3>
            <p className="text-xs text-gray-600 mt-1">Cập nhật thông tin liên hệ của bạn</p>
          </div>

          {message && (
            <div className={`p-4 rounded-lg mb-4 ${message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-name">
                Họ và tên *
              </label>
              <input
                className={inputClass}
                type="text"
                id="profile-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-email">
                  Email
                </label>
                <input
                  className={`${inputClass} bg-gray-50`}
                  type="email"
                  id="profile-email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-phone">
                  Số điện thoại *
                </label>
                <input
                  className={inputClass}
                  type="tel"
                  id="profile-phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0901234567"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-gender">
                  Giới tính
                </label>
                <Select
                  value={form.gender}
                  onChange={(value) => setForm(prev => ({ ...prev, gender: value }))}
                  placeholder="— Chọn —"
                  size="md"
                  options={[
                    { value: '', label: '— Chọn —' },
                    { value: 'MALE', label: 'Nam' },
                    { value: 'FEMALE', label: 'Nữ' },
                    { value: 'OTHER', label: 'Khác' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-dob">
                  Ngày sinh
                </label>
                <input
                  className={inputClass}
                  type="date"
                  id="profile-dob"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-indigo-500" />
                <h4 className="text-sm font-bold text-gray-800">Địa chỉ giao hàng</h4>
              </div>

              {/* Province */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-address-province">
                  Tỉnh/Thành phố
                </label>
                <Select
                  value={form.addressProvince}
                  onChange={handleProvinceChange}
                  disabled={loadingProvinces}
                  placeholder={loadingProvinces ? 'Đang tải tỉnh/thành phố...' : '— Chọn tỉnh/thành phố —'}
                  size="md"
                  options={[
                    { value: '', label: loadingProvinces ? 'Đang tải tỉnh/thành phố...' : '— Chọn tỉnh/thành phố —' },
                    ...provinces.map(p => ({ value: p.name, label: p.name })),
                  ]}
                />
              </div>

              {/* Ward */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-address-ward">
                  Phường/Xã
                </label>
                <Select
                  value={form.addressWard}
                  onChange={handleWardChange}
                  disabled={!form.addressProvince || loadingWards}
                  placeholder={loadingWards ? 'Đang tải phường/xã...' : '— Chọn phường/xã —'}
                  size="md"
                  options={[
                    { value: '', label: loadingWards ? 'Đang tải phường/xã...' : '— Chọn phường/xã —' },
                    ...wards.map(w => ({ value: w.name, label: w.name })),
                  ]}
                />
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-address-street">
                  Số nhà, Tên đường
                </label>
                <input
                  className={inputClass}
                  type="text"
                  id="profile-address-street"
                  name="addressStreet"
                  value={form.addressStreet}
                  onChange={handleChange}
                  placeholder="Ví dụ: 123 Nguyễn Văn Linh"
                />
              </div>

              {/* Address Preview */}
              {(form.addressStreet || form.addressWard || form.addressProvince) && (
                <div className="mt-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-indigo-700">
                      {[form.addressStreet, form.addressWard, form.addressProvince]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              id="profile-save-btn"
            >
              {loading ? 'Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </form>
        </div>

        {/* Right Column: Password & Delete Account */}
        <div className="flex flex-col h-full space-y-6">
          {/* Change Password Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800">🔒 Đổi mật khẩu</h3>
              <p className="text-xs text-gray-600 mt-1">Cập nhật mật khẩu đăng nhập của bạn</p>
            </div>

            {passwordMsg && (
              <div className={`p-4 rounded-lg mb-4 ${passwordMsg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-current-password">
                  Mật khẩu hiện tại
                </label>
                <input
                  className={inputClass}
                  type="password"
                  id="profile-current-password"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-new-password">
                  Mật khẩu mới
                </label>
                <input
                  className={inputClass}
                  type="password"
                  id="profile-new-password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="profile-confirm-password">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  className={inputClass}
                  type="password"
                  id="profile-confirm-password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={passwordLoading}
                id="profile-password-btn"
              >
                {passwordLoading ? 'Đang xử lý...' : '🔒 Đổi mật khẩu'}
              </button>
            </form>
          </div>

          {/* Delete Account Section - White BG, Red Border, Bottom-Right Button */}
          <div className="bg-rose-50 border border-red-200 rounded-xl p-6 flex flex-col justify-between shadow-sm">
            <div className="text-left">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2 mb-2">
                <Trash2 className="w-5 h-5" />
                Xóa tài khoản
              </h3>
              <p className="text-xs text-red-600/70 leading-relaxed max-w-sm font-medium">
                Sau khi xóa, tài khoản của bạn sẽ bị vô hiệu hóa và không thể đăng nhập lại.
                Tất cả dữ liệu sẽ được lưu trữ nhưng không thể truy cập.
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setConfirmDeleteInput(''); // Reset on open
                  setShowDeleteModal(true);
                }}
                className="px-6 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-md shadow-red-100 active:scale-95"
              >
                Xóa tài khoản
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Xác nhận xóa tài khoản</h2>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Bạn có chắc chắn muốn xóa tài khoản?
              </p>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                ⚠️ Hành động này sẽ vô hiệu hóa tài khoản của bạn. Bạn sẽ không thể đăng nhập lại và tất cả dữ liệu sẽ không thể truy cập.
              </p>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-600">
                  Nhập <span className="font-bold text-gray-900">"{user.name}"</span> hoặc <span className="font-bold text-gray-900">"{user.phone}"</span> để xác nhận:
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Nhập tên hoặc số điện thoại..."
                  value={confirmDeleteInput}
                  onChange={(e) => setConfirmDeleteInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={deleteLoading}
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !isConfirmValid}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  isConfirmValid 
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {deleteLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

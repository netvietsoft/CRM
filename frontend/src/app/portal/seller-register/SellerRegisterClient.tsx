'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Select from '@/components/ui/Select';

interface AddressOption {
  code: string;
  name: string;
}

export default function SellerRegisterClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Address
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);
  const [province, setProvince] = useState('');
  const [ward, setWard] = useState('');
  const [street, setStreet] = useState('');

  // Payment
  const [allowCOD, setAllowCOD] = useState(true);
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankOwnerName, setBankOwnerName] = useState('');

  // Auto-generate slug from name
  useEffect(() => {
    const generated = name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setSlug(generated);
  }, [name]);

  // Load provinces
  useEffect(() => {
    fetch('/internal-api/address?type=provinces')
      .then(res => res.json())
      .then(setProvinces).catch(console.error);
  }, []);

  const fetchWards = useCallback(async (provinceName: string) => {
    if (!provinceName) { setWards([]); return; }
    const p = provinces.find(x => x.name === provinceName);
    if (!p) return;
    try {
      const res = await fetch(`/internal-api/address?type=wards&provinceCode=${p.code}`);
      setWards(await res.json());
    } catch {}
  }, [provinces]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !bankAccountNo || !bankOwnerName) {
      alert('Vui lòng nhập đầy đủ thông tin ngân hàng trước khi đăng ký.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name, slug, description, phone, email,
          addressStreet: street,
          addressWard: ward,
          addressProvince: province,
          allowCOD,
          bankName,
          bankAccountNo,
          bankOwnerName: bankOwnerName.toUpperCase(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || data.error || 'Đăng ký thất bại. Vui lòng thử lại.');
      } else {
        setSuccess(true);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Đăng ký thành công!</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Cửa hàng của bạn đã được ghi nhận và đang chờ Admin phê duyệt. 
            Bạn sẽ nhận được thông báo khi cửa hàng được kích hoạt.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/portal"
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const banks = [
    'Vietcombank', 'BIDV', 'VietinBank', 'Techcombank', 'MB Bank',
    'ACB', 'Sacombank', 'TPBank', 'VPBank', 'HDBank',
    'SHB', 'OCB', 'MSB', 'SeABank', 'LPBank',
    'VIB', 'ABBank', 'BacABank', 'NamABank', 'PGBank',
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-700 text-sm font-semibold mb-4">
          🏪 Trở thành Đối tác Bán hàng
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Đăng ký Cửa hàng</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Mở cửa hàng trên hệ thống của chúng tôi để tiếp cận hàng ngàn khách hàng tiềm năng. 
          Sau khi Admin phê duyệt, bạn sẽ có thể quản lý sản phẩm, đơn hàng và voucher riêng.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Store Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">1</span>
            Thông tin cửa hàng
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng *</label>
              <input
                type="text" required value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="VD: Shop Thời Trang Hà Nội"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (đường dẫn)</label>
              <input
                type="text" value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
                placeholder="shop-thoi-trang-ha-noi"
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
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                placeholder="Giới thiệu ngắn về cửa hàng của bạn..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
              <input
                type="tel" required value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="0987 654 321"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Cửa Hàng *</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="shop@example.com"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Address */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">2</span>
            Địa chỉ cửa hàng
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh / Thành phố</label>
              <Select
                value={province}
                onChange={val => { setProvince(val); setWard(''); fetchWards(val); }}
                className="w-full"
                placeholder="Chọn tỉnh/thành"
                options={provinces.map(p => ({ value: p.name, label: p.name }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phường / Xã</label>
              <Select
                value={ward}
                onChange={val => setWard(val)}
                className="w-full"
                placeholder="Chọn phường/xã"
                options={wards.map(w => ({ value: w.name, label: w.name }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết</label>
              <input
                type="text" value={street}
                onChange={e => setStreet(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Số nhà, tên đường..."
              />
            </div>
          </div>
        </div>

        {/* Section 3: Payment */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">3</span>
            Phương thức thanh toán
          </h2>

          {/* COD Toggle */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox" checked={allowCOD}
                onChange={e => setAllowCOD(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <div>
              <div className="font-medium text-gray-800">Cho phép thanh toán COD</div>
              <div className="text-xs text-gray-500">Khách hàng thanh toán khi nhận hàng</div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">⚠️ Thông tin ngân hàng là bắt buộc để nhận thanh toán chuyển khoản từ khách hàng.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng *</label>
              <Select
                value={bankName}
                onChange={val => setBankName(val)}
                className="w-full"
                placeholder="Chọn ngân hàng"
                options={banks.map(b => ({ value: b, label: b }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản *</label>
              <input
                type="text" required value={bankAccountNo}
                onChange={e => setBankAccountNo(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="VD: 1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ tài khoản *</label>
              <input
                type="text" required value={bankOwnerName}
                onChange={e => setBankOwnerName(e.target.value.toUpperCase())}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase"
                placeholder="NGUYEN VAN A"
              />
              <p className="text-xs text-gray-500 mt-1">Viết hoa toàn bộ, đúng tên trên tài khoản ngân hàng</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/portal"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 active:scale-95"
          >
            {loading ? 'Đang xử lý...' : '🚀 Đăng ký Cửa hàng'}
          </button>
        </div>
      </form>
    </div>
  );
}

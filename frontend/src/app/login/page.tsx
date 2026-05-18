'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clearSavedReferralCode, getReferralCodeFromSearchParams, getSavedReferralCode, persistReferralCode } from '@/lib/referral-client';

function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    referralCode: '',
  });

  useEffect(() => {
    // Prefer explicit ref on login URL, then fallback to ref nested in returnTo.
    const refCode = getReferralCodeFromSearchParams(searchParams);
    if (refCode) {
      persistReferralCode(refCode);
      setFormData(prev => ({ ...prev, referralCode: refCode }));
    } else {
      const savedRef = getSavedReferralCode();
      setFormData(prev => ({ ...prev, referralCode: savedRef }));
    }

    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        no_code: 'Không nhận được mã xác thực từ Google',
        token_exchange_failed: 'Không thể xác thực với Google',
        user_info_failed: 'Không thể lấy thông tin người dùng từ Google',
        auth_failed: 'Đăng nhập Google thất bại',
        account_disabled: 'Tài khoản đã bị vô hiệu hóa',
      };
      setError(errorMessages[errorParam] || 'Đã xảy ra lỗi khi đăng nhập');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleGoogleLogin = () => {
    // Get the return URL from query params (if user came from a product page)
    let returnTo = searchParams.get('returnTo') || '/portal/products';
    // Preserve campaign param if present in current URL
    const campaign = searchParams.get('campaign');
    if (campaign && !returnTo.includes('campaign=')) {
      returnTo += (returnTo.includes('?') ? '&' : '?') + `campaign=${campaign}`;
    }
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    window.location.href = `${backendUrl}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const endpoint = isLogin ? `${backendUrl}/auth/login` : `${backendUrl}/auth/register`;

      // For register, fallback to saved referral code if input is empty.
      const savedReferralCode = getSavedReferralCode();
      const body = isLogin
        ? { phone: formData.phone, password: formData.password }
        : {
          ...formData,
          referralCode: formData.referralCode.trim() || savedReferralCode,
        };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include', // Important: include cookies
      });

      console.log('Login response status:', res.status);
      const data = await res.json();
      console.log('Login response data:', data);

      if (!res.ok) {
        setError(data.error || data.message || 'Đã xảy ra lỗi');
        return;
      }

      // Clear stored referral code after successful registration
      if (!isLogin) {
        clearSavedReferralCode();
      }

      // Determine final redirect: use returnTo from URL if available, else backend's redirect
      const returnTo = searchParams.get('returnTo');
      let finalRedirect = data.redirect || '/';
      
      // If backend says onboarding, preserve returnTo through onboarding
      if (finalRedirect === '/onboarding' && returnTo) {
        finalRedirect = `/onboarding?returnTo=${encodeURIComponent(returnTo)}`;
      } else if (returnTo && (finalRedirect === '/portal' || finalRedirect === '/portal/products')) {
        // If backend says /portal but we have a specific returnTo (e.g. /portal?campaign=qr_claim), use it
        finalRedirect = returnTo;
      }

      if (isLogin) {
        console.log('Redirecting to:', finalRedirect);
        // Use window.location for hard navigation to ensure cookies are sent
        window.location.href = finalRedirect;
      } else {
        setSuccess('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => {
          window.location.href = finalRedirect;
        }, 1000);
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="fixed top-[10%] left-[15%] w-96 h-96 rounded-full bg-gradient-radial from-indigo-200/30 to-transparent pointer-events-none animate-float" />
      <div className="fixed bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-radial from-purple-200/25 to-transparent pointer-events-none animate-float-reverse" />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(0.95); }
          66% { transform: translate(20px, -20px) scale(1.05); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 10s ease-in-out infinite;
        }
      `}</style>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-10 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Customer CRM
          </h1>
          <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider">
            Hệ thống chăm sóc khách hàng
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-3">
          <button
            className={`flex-1 max-w-[200px] mx-auto pb-3 text-base font-medium transition-all ${isLogin
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
              : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600'
              }`}
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            type="button"
          >
            Đăng nhập
          </button>
          <button
            className={`flex-1 max-w-[200px] mx-auto pb-3 text-base font-medium transition-all ${!isLogin
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
              : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600'
              }`}
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            type="button"
          >
            Đăng ký
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm animate-slideIn">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 p-4 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm animate-slideIn">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="phone">
              Số điện thoại hoặc Email
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="0912 345 678"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            {!isLogin && (
              <p className="text-xs text-gray-400 mt-1.5">Mật khẩu tối thiểu 6 ký tự</p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="referralCode">
                Mã giới thiệu (nếu có)
              </label>
              <input
                id="referralCode"
                name="referralCode"
                type="text"
                className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="Nhập mã giới thiệu"
                value={formData.referralCode}
                onChange={handleChange}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}
          </button>
        </form>

        {/* Google Login */}
        <div className="mt-6">
          <div className="relative text-center mb-4">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200" />
            <span className="relative px-3 text-sm text-gray-500 bg-white/80">
              Hoặc
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-800 font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLogin ? 'Đăng nhập với Google' : 'Đăng ký với Google'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-10 shadow-2xl">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

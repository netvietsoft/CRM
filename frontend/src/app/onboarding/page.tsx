'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

const INTEREST_OPTIONS = [
  { id: 'fashion', label: 'Thời trang' },
  { id: 'beauty', label: 'Làm đẹp' },
  { id: 'health', label: 'Sức khỏe' },
  { id: 'home', label: 'Nội thất' },
  { id: 'books', label: 'Sách' },
  { id: 'music', label: 'Âm nhạc' },
];

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const genderRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [genderOpen, setGenderOpen] = useState(false);
  const [hasGoogleAccount, setHasGoogleAccount] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [formData, setFormData] = useState({
    gender: '',
    dob: '',
    phone: '',
    interests: [] as string[],
  });

  const returnTo = searchParams.get('returnTo') || '/portal/products';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genderRef.current && !genderRef.current.contains(event.target as Node)) {
        setGenderOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await apiClientClient.get<any>('/users/profile');

        if (profile.onboardingComplete) {
          router.push(returnTo);
          return;
        }

        setFormData((current) => ({
          ...current,
          phone: profile.phone || current.phone,
        }));

        if (profile.oauthAccounts?.length > 0 && !profile.phone) {
          setHasGoogleAccount(true);
        }
      } catch (err) {
        console.error('Failed to check onboarding status:', err);
      }
    };

    loadProfile();
  }, [returnTo, router]);

  const selectedGender = useMemo(
    () => GENDER_OPTIONS.find((item) => item.value === formData.gender),
    [formData.gender],
  );

  const updateForm = (patch: Partial<typeof formData>) => {
    setFormData((current) => ({ ...current, ...patch }));
  };

  const toggleInterest = (interestId: string) => {
    setFormData((current) => ({
      ...current,
      interests: current.interests.includes(interestId)
        ? current.interests.filter((id) => id !== interestId)
        : [...current.interests, interestId],
    }));
  };

  const getSyncPhone = () => {
    const phone = formData.phone.trim();
    return showPhoneInput && phone.length >= 9 ? phone : null;
  };

  const submitOnboarding = async (payload: {
    gender: string | null;
    dob: string | null;
    phone: string | null;
    interests: string[];
  }) => {
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post('/users/onboarding', payload);
      router.push(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitOnboarding({
      gender: formData.gender || null,
      dob: formData.dob || null,
      phone: getSyncPhone(),
      interests: formData.interests,
    });
  };

  const handleSkip = async () => {
    await submitOnboarding({
      gender: null,
      dob: null,
      phone: getSyncPhone(),
      interests: [],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Chào mừng bạn</h1>
          <p className="text-gray-600">
            Hoàn tất thông tin cơ bản để bắt đầu và đồng bộ lịch sử đơn hàng nếu cần.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={genderRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giới tính
              </label>
              <button
                type="button"
                onClick={() => setGenderOpen((current) => !current)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={formData.gender ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedGender?.label || 'Chọn giới tính'}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${genderOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {genderOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        updateForm({ gender: option.value });
                        setGenderOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition ${formData.gender === option.value
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
                Ngày sinh
              </label>
              <input
                type="date"
                id="dob"
                value={formData.dob}
                onChange={(event) => updateForm({ dob: event.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                max={new Date().toISOString().split('T')[0]}
                style={{
                  minHeight: '48px',
                  WebkitAppearance: 'none',
                  colorScheme: 'light',
                  color: formData.dob ? '#111827' : '#9CA3AF',
                }}
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-4">
              Sở thích
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => toggleInterest(interest.id)}
                  className={`px-4 py-3 rounded-xl border text-center text-sm font-medium transition-all ${formData.interests.includes(interest.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {interest.label}
                </button>
              ))}
            </div>
          </div>

          {hasGoogleAccount && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-5">
              {!showPhoneInput ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-700">
                    Bạn đã từng mua hàng trước đây, hãy nhập số điện thoại để đồng bộ đơn hàng.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPhoneInput(true)}
                      className="px-4 py-2 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 text-sm font-medium"
                    >
                      Nhập số điện thoại để đồng bộ
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="phoneSync" className="block text-sm font-medium text-gray-700 mb-2">
                    Số điện thoại đồng bộ
                  </label>
                  <input
                    type="tel"
                    id="phoneSync"
                    value={formData.phone}
                    onChange={(event) => updateForm({ phone: event.target.value })}
                    className="w-full px-4 bg-white py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0912 345 678"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || (showPhoneInput && formData.phone.trim().length > 0 && formData.phone.trim().length < 9)}
              className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Đang lưu...' : 'Hoàn thành'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="px-8 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              disabled={loading}
            >
              Bỏ qua
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

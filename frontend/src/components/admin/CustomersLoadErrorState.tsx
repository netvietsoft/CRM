'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function CustomersLoadErrorState() {
  const router = useRouter();
  const hasAutoRetried = useRef(false);

  useEffect(() => {
    if (hasAutoRetried.current) return;
    hasAutoRetried.current = true;

    const timer = window.setTimeout(() => {
      router.refresh();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center shadow-sm">
      <div className="text-lg font-semibold text-amber-900">Không tải được danh sách khách hàng</div>
      <p className="mt-2 text-sm text-amber-800">Hệ thống sẽ tự thử lại một lần. Nếu vẫn chưa thấy dữ liệu, bấm thử lại.</p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
      >
        Thử lại
      </button>
    </div>
  );
}

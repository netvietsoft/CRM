'use client';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function StaffActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/admin/staff/assign"
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-blue-200"
      >
        <UserPlus size={18} />
        <span>Thêm Nhân viên</span>
      </Link>
    </div>
  );
}

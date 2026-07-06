'use client';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function StaffActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/admin/staff/assign"
        className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-[9px] rounded-[10px] text-[13px] font-semibold transition-colors"
      >
        <UserPlus size={18} />
        <span>Thêm nhân viên</span>
      </Link>
    </div>
  );
}

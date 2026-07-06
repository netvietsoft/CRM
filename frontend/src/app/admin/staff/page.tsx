import StaffTableClient from '@/components/admin/StaffTableClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý Nhân viên | Quản Trị Viên',
};

export default function StaffPage() {
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto font-[Inter,sans-serif]">
      <div className="mb-[18px]">
        <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.4px] text-[#111827]">Nhân viên</h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">Tài khoản và phân quyền hệ thống</p>
      </div>

      <StaffTableClient />
    </div>
  );
}

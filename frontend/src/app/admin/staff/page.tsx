import StaffTableClient from '@/components/admin/StaffTableClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý Nhân viên | Quản Trị Viên',
};

export default function StaffPage() {
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quản lý Nhân viên</h1>
        <p className="text-gray-500 mt-1 text-sm font-medium">Quản lý đội ngũ nhân viên, gán quyền và điều phối theo từng cửa hàng</p>
      </div>
      
      <StaffTableClient />
    </div>
  );
}

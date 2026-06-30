'use client';
export const dynamic = 'force-dynamic';

import { Card, MockTable, Pill, StatCard, MockBadge } from '@/components/pancake/ui';

const ORDERS = [
  ['#CHY1042', 'Vũ Thị Nga', '0901***234', 'Set CATHY', '850.000đ', <Pill key="1" color="amber">Chờ xác nhận</Pill>, '30/06 20:14'],
  ['#CHY1041', 'Mai Diên', '0912***888', 'Set NAMI', '990.000đ', <Pill key="2" color="blue">Đang giao</Pill>, '30/06 20:13'],
  ['#CHY1040', 'My Sói', '0987***111', 'Set CAMELIA', '1.490.000đ', <Pill key="3" color="green">Hoàn tất</Pill>, '30/06 20:08'],
  ['#CHY1039', 'Le Hong', '0933***927', 'Set RITA', '700.000đ', <Pill key="4" color="green">Hoàn tất</Pill>, '30/06 19:55'],
  ['#CHY1038', 'Huyền Phạm', '0978***944', 'Set MINDY', '850.000đ', <Pill key="5" color="red">Huỷ</Pill>, '30/06 19:40'],
];

export default function PancakeOrders() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Đơn hàng</h1>
        <MockBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🧾" label="Tổng đơn (30 ngày)" value="412" delta="32.5%" />
        <StatCard icon="✅" label="Đã chốt" value="249" />
        <StatCard icon="🚚" label="Đang giao" value="98" />
        <StatCard icon="💰" label="Doanh thu" value="386.4tr" delta="17.2%" />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <input placeholder="Tìm mã đơn / khách / SĐT" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-[260px]" />
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm"><option>Tất cả trạng thái</option><option>Chờ xác nhận</option><option>Đang giao</option><option>Hoàn tất</option><option>Huỷ</option></select>
          <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button className="px-4 py-2 rounded-lg bg-[#3b5bdb] text-white text-sm font-medium">Lọc</button>
        </div>
        <MockTable
          headers={['Mã đơn', 'Khách hàng', 'SĐT', 'Sản phẩm', 'Tổng tiền', 'Trạng thái', 'Ngày']}
          rows={ORDERS}
        />
      </Card>
    </div>
  );
}

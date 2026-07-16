// Danh sách khách hàng đã chuyển sang /admin/pancake-customers (đổi tên nguồn Pancake, 2026-07-16).
// Giữ redirect để link/bookmark cũ không chết. Trang chi tiết /admin/customers/[id] GIỮ NGUYÊN.
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CustomersRedirectPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (typeof v === 'string' && v) p.set(k, v);
  }
  const qs = p.toString();
  redirect(`/admin/pancake-customers${qs ? `?${qs}` : ''}`);
}

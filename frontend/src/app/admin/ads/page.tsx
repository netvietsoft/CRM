import { redirect } from 'next/navigation';

// Route cũ — đã chuyển sang cấu trúc /admin/adsmeta. Giữ link cũ không gãy.
export default function AdsLegacyRedirect() {
  redirect('/admin/adsmeta/accall');
}

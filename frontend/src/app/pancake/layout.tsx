import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import PancakeTopNav from '@/components/pancake/PancakeTopNav';

// Workspace kiểu Pancake (full-screen, top-nav riêng — không dùng sidebar CRM).
export default async function PancakeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['ADMIN', 'STAFF', 'MODERATOR'].includes(session.role)) redirect('/portal');

  return (
    <div className="h-screen flex flex-col bg-[#eef1f8]">
      <PancakeTopNav userName={session.name || session.email || 'CHY'} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

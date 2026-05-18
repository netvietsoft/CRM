import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      <TableSkeleton rowCount={10} />
    </div>
  );
}

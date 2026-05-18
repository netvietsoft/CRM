import { Skeleton } from '@/components/ui/Skeleton';
import { GridCardSkeleton } from '@/components/ui/CardSkeleton';

export default function PortalLoading() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Banner Skeleton */}
      <Skeleton className="w-full h-[300px] md:h-[400px] rounded-2xl" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl md:col-span-2" />
      </div>

      {/* Recommended Products Skeleton */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <GridCardSkeleton count={8} />
      </div>
    </div>
  );
}

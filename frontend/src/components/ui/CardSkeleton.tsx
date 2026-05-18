import { Skeleton } from './Skeleton';

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <Skeleton className="w-full aspect-square" />
      <div className="p-4 flex-1 flex flex-col">
        <Skeleton className="h-4 w-1/3 mb-2" />
        <Skeleton className="h-5 w-full mb-3" />
        <div className="mt-auto">
          <Skeleton className="h-6 w-1/2 mb-3" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function GridCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(count)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

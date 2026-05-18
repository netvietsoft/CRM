import { Skeleton } from '@/components/ui/Skeleton';

export default function PortalProductsLoading() {
  return (
    <div className="bg-gray-50 py-6 sm:py-8">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <div className="mb-5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-2 h-4 w-40" />
              <div className="mt-4 space-y-2">
                {[...Array(7)].map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-2 h-4 w-44" />
              <Skeleton className="mt-4 h-12 w-full rounded-xl" />
              <div className="mt-4 space-y-4">
                <div>
                  <Skeleton className="mb-2 h-3 w-24" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <div>
                  <Skeleton className="mb-2 h-3 w-24" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Skeleton className="h-11 flex-1 rounded-xl" />
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-28 rounded-xl" />
                  <Skeleton className="h-11 w-40 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <Skeleton className="aspect-[4/4.4] w-full rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-9 w-9 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

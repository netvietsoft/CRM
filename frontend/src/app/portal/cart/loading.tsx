import { Skeleton } from '@/components/ui/Skeleton';

export default function PortalCartLoading() {
  return (
    <div className="max-w-5xl mx-auto">
      <Skeleton className="h-8 w-48 mb-8" />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items List */}
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <Skeleton className="h-5 w-32" />
          </div>

          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex gap-4 mb-4">
                <Skeleton className="w-6 h-6 rounded mt-2 shrink-0" /> {/* Checkbox */}
                <Skeleton className="w-24 h-24 rounded-lg shrink-0" /> {/* Image */}
                <div className="flex-1">
                  <Skeleton className="h-5 w-full max-w-md mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <Skeleton className="h-8 w-24 rounded" /> {/* Delete button */}
                <Skeleton className="h-10 w-32 rounded-lg" /> {/* Quantity */}
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <Skeleton className="h-6 w-40 mb-6" />
            
            <div className="space-y-4 mb-6 border-b border-gray-100 pb-6">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>

            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

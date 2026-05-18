import { Skeleton } from '@/components/ui/Skeleton';

export default function PortalCheckoutLoading() {
  return (
    <div className="max-w-5xl mx-auto">
      <Skeleton className="h-8 w-48 mb-8" />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Checkout Form */}
        <div className="flex-1 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ))}
            </div>
            <Skeleton className="h-4 w-32 mt-4 mb-2" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <Skeleton className="h-6 w-40 mb-6" />
            
            {/* Order Items */}
            <div className="space-y-4 mb-6 border-b border-gray-100 pb-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
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

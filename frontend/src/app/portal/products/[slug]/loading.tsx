import { Skeleton } from '@/components/ui/Skeleton';
import { GridCardSkeleton } from '@/components/ui/CardSkeleton';

export default function PortalProductDetailLoading() {
  return (
    <div className="space-y-12">
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Product Image Skeleton */}
          <div className="w-full md:w-1/2">
            <Skeleton className="w-full aspect-square rounded-2xl" />
            
            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-full aspect-square rounded-xl" />
              ))}
            </div>
          </div>

          {/* Product Info Skeleton */}
          <div className="w-full md:w-1/2 space-y-6">
            <div>
              <Skeleton className="h-6 w-32 mb-4" /> {/* Store Name */}
              <Skeleton className="h-10 w-full mb-3" /> {/* Product Title */}
              <Skeleton className="h-10 w-3/4 mb-4" />
              
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-32" /> {/* Price */}
                <Skeleton className="h-6 w-20" /> {/* Original Price */}
              </div>
            </div>

            <Skeleton className="h-px w-full bg-gray-100" /> {/* Divider */}

            {/* Variants */}
            <div>
              <Skeleton className="h-5 w-24 mb-3" />
              <div className="flex flex-wrap gap-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-20 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4 pt-4">
              <Skeleton className="h-12 w-32 rounded-lg" /> {/* Quantity */}
              <Skeleton className="h-12 flex-1 rounded-lg" /> {/* Add to Cart */}
            </div>
            
            <Skeleton className="h-12 w-full rounded-lg" /> {/* Buy Now */}

            {/* Features/Trust badges */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Description & Reviews Tabs */}
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8">
        <div className="flex gap-8 border-b border-gray-100 mb-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-6 w-32 mb-4" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>

      {/* Related Products */}
      <div>
        <Skeleton className="h-8 w-64 mb-6" />
        <GridCardSkeleton count={4} />
      </div>
    </div>
  );
}

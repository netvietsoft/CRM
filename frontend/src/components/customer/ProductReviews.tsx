'use client';

import { useState, useEffect } from 'react';
import { Star, User, Check, Image as ImageIcon, ChevronDown } from 'lucide-react';
import ReviewForm from './ReviewForm';
import Select from '@/components/ui/Select';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  images: string[] | null;
  size: string | null;
  color: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    name: string;
    avatarUrl: string | null;
  };
  product: {
    name: string;
  };
}

interface ReviewStatistics {
  averageRating: number;
  totalReviews: number;
  distribution: { rating: number; count: number }[];
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
  userCompletedOrders: Array<{
    orderId: string;
    size: string | null;
    color: string | null;
  }>;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function ProductReviews({ productId, productName, userCompletedOrders }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        productId,
        rating: selectedRating,
        sort: sortBy,
        page: page.toString(),
        limit: '10',
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/reviews?${params}`);
      const data = await res.json();

      if (res.ok) {
        setReviews(data.reviews);
        setStatistics(data.statistics);
        setAllImages(data.allImages || []);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, selectedRating, sortBy, page]);

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    setPage(1);
    fetchReviews();
  };

  if (loading && page === 1) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Đánh giá từ người mua</h2>

      {/* Statistics Section */}
      {statistics && statistics.totalReviews > 0 && (
        <div className="bg-white rounded-2xl p-6 mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Average Rating */}
            <div className="flex flex-col items-center justify-center md:border-r border-gray-200 md:pr-8">
              <div className="text-5xl font-bold text-gray-900 mb-2">
                {statistics.averageRating}
                <span className="text-2xl text-gray-500">/5</span>
              </div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(statistics.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600">{statistics.totalReviews} đánh giá</div>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const dist = statistics.distribution.find((d) => d.rating === star);
                const count = dist ? dist.count : 0;
                const percentage =
                  statistics.totalReviews > 0 ? (count / statistics.totalReviews) * 100 : 0;

                return (
                  <div key={star} className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => setSelectedRating(star.toString())}
                      className="flex items-center gap-1 text-sm text-gray-700 hover:text-indigo-600 transition-colors min-w-[60px]"
                    >
                      <span>{star}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </button>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 min-w-[30px] text-right">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Images Gallery */}
            {allImages.length > 0 && (
              <div className="md:border-l border-gray-200 md:pl-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Hình ảnh từ người mua
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {allImages.slice(0, 10).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {allImages.length > 10 && (
                    <div className="aspect-square rounded-lg bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                      +{allImages.length - 10}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Write Review Button */}
      {userCompletedOrders.length > 0 && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="mb-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Viết đánh giá
        </button>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="mb-8 bg-white rounded-2xl p-6 border border-gray-200">
          <ReviewForm
            productId={productId}
            productName={productName}
            completedOrders={userCompletedOrders}
            onSuccess={handleReviewSubmitted}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Lọc đánh giá:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRating('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedRating === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedRating(star.toString())}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedRating === star.toString()
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {star} sao
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-600">Sắp xếp:</span>
          <Select
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            className="w-40"
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'oldest', label: 'Cũ nhất' }
            ]}
          />
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-500">Chưa có đánh giá nào</p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {review.user.avatarUrl ? (
                    <img
                      src={review.user.avatarUrl}
                      alt={review.user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>
                  )}
                </div>

                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{review.user.name}</span>
                    {review.isVerifiedPurchase && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs font-medium rounded">
                        <Check className="w-3 h-3" />
                        Đã mua hàng
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Sản phẩm:</span> {review.product.name}
                    {(review.color || review.size) && (
                      <span className="ml-2">
                        {review.color && <span>• Màu: {review.color}</span>}
                        {review.size && <span className="ml-2">• Size: {review.size}</span>}
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-gray-700 mb-3 leading-relaxed">{review.comment}</p>
                  )}

                  {/* Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {review.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(img)}
                          className="w-20 h-20 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-sm text-gray-500">
                    Đã đánh giá ngày: {formatDate(review.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <button
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Trang trước
            </button>
          )}
          <span className="px-4 py-2 text-gray-700">
            Trang {page} / {totalPages}
          </span>
          {page < totalPages && (
            <button
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Trang sau
            </button>
          )}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

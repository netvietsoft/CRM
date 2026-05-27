'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import Select from '@/components/ui/Select';
import ReviewImageUploader from './ReviewImageUploader';

interface ReviewFormProps {
  productId: string;
  productName: string;
  completedOrders: Array<{
    orderId: string;
    size: string | null;
    color: string | null;
  }>;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ReviewForm({
  productId,
  productName,
  completedOrders,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [selectedOrder, setSelectedOrder] = useState(completedOrders[0]?.orderId || '');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedOrderData = completedOrders.find((o) => o.orderId === selectedOrder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!rating) {
      setError('Vui lòng chọn số sao');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          orderId: selectedOrder,
          rating,
          comment: comment.trim() || null,
          images: images.length > 0 ? images : null,
          size: selectedOrderData?.size,
          color: selectedOrderData?.color,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Đánh giá sản phẩm</h3>
        <p className="text-sm text-gray-600">{productName}</p>
      </div>

      {/* Select Order */}
      {completedOrders.length > 1 && (
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Chọn đơn hàng
          </label>
          <Select
            value={selectedOrder}
            onChange={(val) => setSelectedOrder(val)}
            className="w-full"
            options={completedOrders.map((order) => ({
              value: order.orderId,
              label: `Đơn hàng - ${order.size || 'Không có size'} - ${order.color || 'Không có màu'}`
            }))}
          />
        </div>
      )}

      {/* Display Size/Color */}
      {selectedOrderData && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Sản phẩm đã mua:</span> Màu sắc:{' '}
          {selectedOrderData.color || 'Không có'}, Kích thước:{' '}
          {selectedOrderData.size || 'Không có'}
        </div>
      )}

      {/* Rating */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Đánh giá của bạn <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Nhận xét của bạn (tùy chọn)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {comment.length}/1000 ký tự
        </div>
      </div>

      {/* Images Upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Hình ảnh (tùy chọn, tối đa 5 ảnh, 4MB/ảnh)
        </label>
        <ReviewImageUploader
          images={images}
          onChange={setImages}
          onError={setError}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || !rating}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

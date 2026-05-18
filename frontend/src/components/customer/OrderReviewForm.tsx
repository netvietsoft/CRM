'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { UploadButton } from '@/lib/uploadthing';

type OrderItem = {
  id: string;
  product: { id: string; name: string; imageUrl: string | null } | null;
  quantity: number;
  price: number;
  isGift: boolean;
  size: string | null;
  color: string | null;
};

type Order = {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  items: OrderItem[];
};

interface OrderReviewFormProps {
  order: Order;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function OrderReviewForm({
  order,
  onSuccess,
  onCancel,
}: OrderReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reviewableProducts = order.items.filter((item) => !item.isGift && item.product);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!rating) {
      setError('Vui lòng chọn số sao');
      return;
    }

    if (reviewableProducts.length === 0) {
      setError('Không có sản phẩm để đánh giá');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/reviews/order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            orderId: order.id,
            rating,
            comment: comment.trim() || null,
            images: images.length > 0 ? images : null,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Có lỗi xảy ra khi đánh giá');
        return;
      }

      if (data.rewardGranted && data.reward?.message) {
        alert(data.reward.message);
      }

      onSuccess();
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setSubmitting(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Đánh giá đơn hàng</h3>
        <p className="text-sm text-gray-600">Mã đơn: {order.orderCode}</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Sản phẩm trong đơn hàng ({reviewableProducts.length})
        </h4>
        <div className="space-y-2">
          {reviewableProducts.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded-lg">
              <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                {item.product?.imageUrl ? (
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl">📦</span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800">{item.product?.name}</div>
                <div className="text-xs text-gray-500">
                  {item.size && `Size: ${item.size}`}
                  {item.size && item.color && ' • '}
                  {item.color && `Màu: ${item.color}`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Đánh giá này sẽ được áp dụng cho tất cả sản phẩm trong đơn hàng.
        </p>
      </div>

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

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Nhận xét của bạn
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Viết mô tả trải nghiệm để nhận thêm 1 lượt quay thưởng..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-amber-600 font-medium">
            Có mô tả hợp lệ sẽ nhận 1 lượt quay thưởng.
          </span>
          <span className="text-gray-500">{comment.length}/1000 ký tự</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Hình ảnh (tùy chọn, tối đa 5 ảnh, 4MB/ảnh)
        </label>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img}
                  alt=""
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length < 5 && (
          <UploadButton
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
              if (res) {
                const newImages = res.map((file) => file.url);
                setImages([...images, ...newImages].slice(0, 5));
              }
            }}
            onUploadError={(uploadError: Error) => {
              setError(`Lỗi upload: ${uploadError.message}`);
            }}
            appearance={{
              button:
                'ut-ready:bg-indigo-600 ut-uploading:cursor-not-allowed ut-uploading:bg-indigo-400 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm',
              allowedContent: 'text-xs text-gray-500 mt-2',
            }}
          />
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

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

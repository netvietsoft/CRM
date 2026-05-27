'use client';

import Image from '@/components/ui/AppImage';
import { useUploadThing } from '@/lib/uploadthing';
import { passthroughImageLoader } from '@/lib/imageLoader';
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react';

interface ReviewImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  onError: (message: string) => void;
}

const MAX_IMAGES = 5;

export default function ReviewImageUploader({
  images,
  onChange,
  onError,
}: ReviewImageUploaderProps) {
  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onClientUploadComplete: (result) => {
      const uploadedImages = (result || []).map((file) => file.url);
      if (uploadedImages.length === 0) {
        return;
      }

      onChange([...images, ...uploadedImages].slice(0, MAX_IMAGES));
    },
    onUploadError: (error: Error) => {
      onError(`Lỗi upload: ${error.message}`);
    },
  });

  const remainingSlots = Math.max(0, MAX_IMAGES - images.length);

  const handleRemoveImage = (index: number) => {
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      onError(`Bạn chỉ có thể tải thêm ${remainingSlots} ảnh nữa.`);
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !file.type.startsWith('image/') || file.size > 4 * 1024 * 1024,
    );

    if (invalidFile) {
      onError('Mỗi ảnh phải là file hình và không vượt quá 4MB.');
      return;
    }

    onError('');
    await startUpload(selectedFiles);
  };

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <Image
                loader={passthroughImageLoader}
                unoptimized
                src={imageUrl}
                alt={`Review image ${index + 1}`}
                width={160}
                height={160}
                className="h-28 w-full object-cover"
              />
              <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                <span>Ảnh {index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_IMAGES && (
        <label className="block cursor-pointer rounded-3xl border border-dashed border-slate-300 bg-[linear-gradient(135deg,rgba(79,70,229,0.07),rgba(255,255,255,1)_55%,rgba(14,165,233,0.08))] p-5 transition hover:border-indigo-400 hover:shadow-md">
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={isUploading}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {isUploading ? 'Đang tải ảnh lên...' : 'Thêm hình ảnh đánh giá'}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {isUploading
                    ? 'Vui lòng chờ trong giây lát, ảnh đang được xử lý.'
                    : `Chọn tối đa ${remainingSlots} ảnh nữa, mỗi ảnh dưới 4MB.`}
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
              {isUploading ? 'Đang xử lý...' : 'Chọn ảnh'}
            </div>
          </div>
        </label>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Đã chọn {images.length}/{MAX_IMAGES} ảnh</span>
        <span>Ưu tiên ảnh vuông để hiển thị đẹp hơn</span>
      </div>
    </div>
  );
}

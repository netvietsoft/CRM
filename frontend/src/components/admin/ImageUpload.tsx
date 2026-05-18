'use client';

import { useUploadThing } from '@/lib/uploadthing';
import { useState } from 'react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  endpoint: 'productImage' | 'categoryImage' | 'storeLogo';
}

export default function ImageUpload({ value, onChange, endpoint }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        onChange(res[0].url);
        setError('');
      }
      setUploading(false);
    },
    onUploadError: (error: Error) => {
      setError(error.message);
      setUploading(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh');
      return;
    }

    // Validate file size (4MB)
    if (file.size > 4 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 4MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await startUpload([file]);
    } catch (err) {
      setError('Lỗi upload hình ảnh');
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value && (
        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex items-center gap-3">
        <label
          className={`flex-1 px-4 py-2 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            uploading || isUploading
              ? 'border-blue-300 bg-blue-50 cursor-wait'
              : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading || isUploading}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2 py-4">
            {uploading || isUploading ? (
              <>
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-600 font-medium">Đang upload...</span>
              </>
            ) : (
              <>
                <span className="text-3xl">📸</span>
                <span className="text-sm text-gray-600 font-medium">
                  {value ? 'Thay đổi hình ảnh' : 'Chọn hình ảnh'}
                </span>
                <span className="text-xs text-gray-500">PNG, JPG, GIF (tối đa 4MB)</span>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* URL Input (fallback) */}
      <div className="text-xs text-gray-500 text-center">hoặc</div>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nhập URL hình ảnh"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  );
}

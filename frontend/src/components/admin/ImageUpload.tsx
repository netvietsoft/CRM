'use client';

import Image from '@/components/ui/AppImage';
import { uploadToR2 } from '@/lib/uploadR2';
import { useEffect, useRef, useState } from 'react';
import { passthroughImageLoader } from '@/lib/imageLoader';
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 4MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const { url } = await uploadToR2(file, 'images');
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi upload hình ảnh');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
    setIsViewerOpen(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));

  const setViewerZoom = (updater: (current: number) => number) => {
    setZoom((current) => {
      const next = clampZoom(updater(current));
      if (next <= 1) {
        setOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const resetViewer = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
    resetViewer();
  };

  const openViewer = () => {
    resetViewer();
    setIsViewerOpen(true);
  };

  const zoomIn = () => {
    setViewerZoom((current) => current + ZOOM_STEP);
  };

  const zoomOut = () => {
    setViewerZoom((current) => current - ZOOM_STEP);
  };

  const handleViewerWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
      return;
    }
    zoomOut();
  };

  const handleViewerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) {
      return;
    }

    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: offset.x,
      initialY: offset.y,
    };
    setIsDragging(true);
  };

  const handleViewerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.current.active) {
      return;
    }

    setOffset({
      x: dragState.current.initialX + (e.clientX - dragState.current.startX),
      y: dragState.current.initialY + (e.clientY - dragState.current.startY),
    });
  };

  const handleViewerMouseUp = () => {
    dragState.current.active = false;
    setIsDragging(false);
  };

  const handleViewerDoubleClick = () => {
    if (zoom === 1) {
      setViewerZoom(() => 2);
      return;
    }
    resetViewer();
  };

  useEffect(() => {
    if (!isViewerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsViewerOpen(false);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setIsDragging(false);
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((current) => clampZoom(current + ZOOM_STEP));
        return;
      }

      if (event.key === '-') {
        event.preventDefault();
        setZoom((current) => {
          const next = clampZoom(current - ZOOM_STEP);
          if (next <= 1) {
            setOffset({ x: 0, y: 0 });
          }
          return next;
        });
        return;
      }

      if (event.key === '0') {
        event.preventDefault();
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setIsDragging(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isViewerOpen]);

  return (
    <div className="space-y-3">
      {value && (
        <div
          className="relative flex min-h-[16rem] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          onClick={openViewer}
        >
          <Image
            loader={passthroughImageLoader}
            unoptimized
            src={value}
            alt="Preview"
            width={1600}
            height={1600}
            className="h-auto max-h-[32rem] w-auto max-w-full rounded-md object-contain"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            aria-label="Xóa ảnh"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/90 text-gray-500 shadow-sm backdrop-blur transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur">
            Nhấn để xem lớn
          </div>
        </div>
      )}

      {isViewerOpen && value && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/82 backdrop-blur-sm"
          onClick={closeViewer}
        >
          <div className="flex h-full flex-col p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                Zoom {Math.round(zoom * 100)}%
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Thu nhỏ"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetViewer}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Đặt lại"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Phóng to"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              onWheel={handleViewerWheel}
              onMouseMove={handleViewerMouseMove}
              onMouseUp={handleViewerMouseUp}
              onMouseLeave={handleViewerMouseUp}
            >
              <div
                className={`flex h-full w-full items-center justify-center p-4 sm:p-8 ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-out'}`}
                onMouseDown={handleViewerMouseDown}
                onDoubleClick={handleViewerDoubleClick}
                onClick={zoom > 1 ? undefined : closeViewer}
              >
                <Image
                  loader={passthroughImageLoader}
                  unoptimized
                  src={value}
                  alt="Preview enlarged"
                  width={1800}
                  height={1800}
                  draggable={false}
                  className="max-h-full max-w-full select-none object-contain shadow-2xl"
                  style={{
                    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 160ms ease-out',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Đã có ảnh → ẩn vùng upload/URL; muốn thay ảnh chỉ cần bấm ✕ trên ảnh là vùng này hiện lại. */}
      {!value && (
        <>
          <div className="flex items-center gap-3">
            <label
              className={`flex-1 px-4 py-2 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                uploading
                  ? 'border-blue-300 bg-blue-50 cursor-wait'
                  : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2 py-4">
                {uploading ? (
                  <>
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-blue-600 font-medium">Đang upload...</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">📸</span>
                    <span className="text-sm text-gray-600 font-medium">Chọn hình ảnh</span>
                    <span className="text-xs text-gray-500">PNG, JPG, GIF (tối đa 4MB)</span>
                  </>
                )}
              </div>
            </label>
          </div>

          <div className="text-xs text-gray-500 text-center">hoặc</div>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập URL hình ảnh"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

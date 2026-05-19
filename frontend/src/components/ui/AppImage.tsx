/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, ImgHTMLAttributes } from 'react';

interface AppImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

type AppImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'alt' | 'width' | 'height'
> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  unoptimized?: boolean;
  quality?: number;
  loader?: (props: AppImageLoaderProps) => string;
};

export default function AppImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  unoptimized,
  quality,
  loader,
  style,
  loading,
  ...rest
}: AppImageProps) {
  void unoptimized;

  const resolvedSrc = loader
    ? loader({ src, width: typeof width === 'number' ? width : 0, quality })
    : src;

  const mergedStyle: CSSProperties | undefined = fill
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        ...style,
      }
    : style;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={priority ? 'eager' : loading}
      style={mergedStyle}
      {...rest}
    />
  );
}

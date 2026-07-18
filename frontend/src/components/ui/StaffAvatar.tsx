'use client';

// Avatar nhân viên dùng chung — có ảnh thì hiện ảnh, không thì vòng tròn chữ cái đầu.
export default function StaffAvatar({
  src,
  name,
  size = 24,
  className = '',
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name || 'avatar'} width={size} height={size}
        className={`shrink-0 rounded-full border border-[#e5e7eb] object-cover ${className}`}
        style={{ width: size, height: size }} />
    );
  }
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-[#2563eb] font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) }}>
      {initial}
    </span>
  );
}

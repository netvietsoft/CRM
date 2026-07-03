'use client';

// Upload 1 tệp (ảnh/tài liệu/video) lên R2 qua backend CRM → trả URL public.
// Auth bằng cookie (credentials:'include'). Dùng bởi CcmImagePicker + nút 📎 composer.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3901/api';

export async function uploadToR2(file: File, folder: 'images' | 'video' | 'file' = 'file'): Promise<{ url: string; name: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const res = await fetch(`${API}/upload/media`, { method: 'POST', body: fd, credentials: 'include' });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Upload thất bại (${res.status})`);
  const d = (await res.json()) as { url: string; name?: string };
  return { url: d.url, name: d.name || file.name };
}

export const folderOf = (f: File): 'images' | 'video' | 'file' => (f.type.startsWith('image') ? 'images' : f.type.startsWith('video') ? 'video' : 'file');

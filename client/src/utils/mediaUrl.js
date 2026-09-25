let runtimeBase = '';

export const setMediaBase = (base) => {
  runtimeBase = String(base || '').replace(/\/$/, '');
};

export const mediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  const base = runtimeBase || String(import.meta.env.VITE_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}${path}`;
  return path;
};

export const isVideo = (item) => item?.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(item?.url || '');
export const isImage = (item) => item?.type === 'image' || /\.(jpe?g|png|gif|webp)$/i.test(item?.url || '');

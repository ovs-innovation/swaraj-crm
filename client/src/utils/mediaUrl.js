export const mediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return path;
};

export const isVideo = (item) => item?.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(item?.url || '');
export const isImage = (item) => item?.type === 'image' || /\.(jpe?g|png|gif|webp)$/i.test(item?.url || '');

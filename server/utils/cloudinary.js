import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

const configured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

export const isCloudinaryReady = configured;

export const initCloudinary = () => {
  if (!configured()) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return true;
};

initCloudinary();

const resourceType = (filePath = '', mime = '') => {
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(filePath)) return 'video';
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|aac)$/i.test(filePath)) return 'video';
  if (/\.(ttf|otf|woff|srt)$/i.test(filePath)) return 'raw';
  return 'image';
};

export const publicBase = () => (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

export const toPublicUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const pathName = url.startsWith('/') ? url : `/${url}`;
  const base = publicBase();
  return base ? `${base}${pathName}` : pathName;
};

export const localFileMeta = (file) => {
  if (!file?.path) return { url: '', path: '', publicId: '' };
  const name = file.filename || path.basename(file.path);
  return { url: toPublicUrl(`/uploads/${name}`), path: file.path, publicId: '' };
};

export const attachCloudUrl = async (file, folder = 'swaraj-crm') => {
  const local = localFileMeta(file);
  if (!file?.path || !configured()) return local;
  try {
    const up = await uploadLocalFile(file.path, { folder, mime: file.mimetype });
    if (up?.url) return { url: up.url, path: file.path, publicId: up.publicId };
  } catch (err) {
    console.error('Cloudinary upload failed:', err.message);
  }
  return local;
};

export const ensurePublicVideoUrl = async (job) => {
  const current = job.editedUrl || job.originalUrl || '';
  if (current.startsWith('https://') || current.startsWith('http://')) return current;
  const filePath = job.editedPath || job.originalPath;
  const up = await uploadLocalFile(filePath, { folder: 'swaraj-crm/videos', mime: 'video/mp4' });
  if (up?.url) {
    if (job.editedPath && job.editedPath !== job.originalPath) job.editedUrl = up.url;
    else job.originalUrl = up.url;
    await job.save();
    return up.url;
  }
  return current;
};

export const uploadLocalFile = async (filePath, { folder = 'swaraj-crm', mime } = {}) => {
  if (!filePath || !configured()) return null;
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: resourceType(filePath, mime),
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
  };
};

export const pingCloudinary = async () => {
  if (!configured()) return { ok: false, detail: 'Cloudinary env not set' };
  try {
    initCloudinary();
    const res = await Promise.race([
      cloudinary.api.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cloudinary ping timeout')), 8000)),
    ]);
    return { ok: res?.status === 'ok' || Boolean(res), detail: process.env.CLOUDINARY_CLOUD_NAME };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
};

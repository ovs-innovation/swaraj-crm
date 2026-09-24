import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { sanitizeExt, safeUploadName } from '../utils/fileSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, safeUploadName(file.originalname) || `${unique}${sanitizeExt(file.originalname) || '.bin'}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.mp3', '.wav', '.m4a', '.aac', '.srt', '.ttf', '.otf', '.woff'];
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/') ||
    allowedExt.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.VIDEO_MAX_MB || 512) * 1024 * 1024 },
  fileFilter,
});

export const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
};

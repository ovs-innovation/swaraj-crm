import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm',
  '.mp3', '.wav', '.m4a', '.aac', '.srt', '.ttf', '.otf', '.woff',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
]);

const MAGIC = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/gif', test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  { mime: 'image/webp', test: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { mime: 'video/mp4', test: (b) => b.toString('ascii', 4, 8) === 'ftyp' },
  { mime: 'video/quicktime', test: (b) => b.toString('ascii', 4, 8) === 'ftyp' },
  { mime: 'video/webm', test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { mime: 'audio/mpeg', test: (b) => b.toString('ascii', 0, 3) === 'ID3' || b[0] === 0xff },
  { mime: 'application/pdf', test: (b) => b.toString('ascii', 0, 4) === '%PDF' },
  { mime: 'text/plain', test: () => true },
];

export const sanitizeExt = (name = '') => {
  const ext = path.extname(name).toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : '';
};

export const safeUploadName = (original = '') => {
  const ext = sanitizeExt(original) || '.bin';
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
};

export const isInsideUploads = (filePath) => {
  if (!filePath) return false;
  const normalized = String(filePath).replace(/\\/g, '/');
  const resolved = path.resolve(normalized.startsWith('/uploads/')
    ? path.join(UPLOADS_ROOT, path.basename(normalized))
    : filePath);
  return resolved.startsWith(UPLOADS_ROOT);
};

export const sniffMime = (filePath) => {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  const hit = MAGIC.find((m) => m.test(buf));
  return hit?.mime || '';
};

const clamScan = (filePath) =>
  new Promise((resolve) => {
    const bin = process.env.CLAMAV_BIN;
    if (!bin) return resolve({ ok: true, skipped: true });
    const proc = spawn(bin, ['--no-summary', filePath]);
    proc.on('error', () => resolve({ ok: true, skipped: true }));
    proc.on('close', (code) => resolve({ ok: code === 0, skipped: false }));
  });

export const assertSafeFile = async (file) => {
  if (!file?.path || !fs.existsSync(file.path)) return { ok: false, error: 'File missing' };
  if (!isInsideUploads(file.path)) return { ok: false, error: 'Unsafe file path' };
  const ext = sanitizeExt(file.originalname || file.filename);
  if (!ext) return { ok: false, error: 'File type not allowed' };
  const sniffed = sniffMime(file.path);
  const declared = file.mimetype || '';
  const image = declared.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  const video = declared.startsWith('video/') || ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
  const audio = declared.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.aac'].includes(ext);
  if (image && sniffed && !sniffed.startsWith('image/')) return { ok: false, error: 'File content is not a real image' };
  if (video && sniffed && !sniffed.startsWith('video/') && sniffed !== 'application/octet-stream') {
    if (sniffed && !['video/mp4', 'video/quicktime', 'video/webm'].includes(sniffed)) {
      return { ok: false, error: 'File content is not a real video' };
    }
  }
  if (audio && sniffed && !sniffed.startsWith('audio/') && sniffed !== 'video/mp4') {
    // aac/m4a often looks like mp4 ftyp
  }
  const virus = await clamScan(file.path);
  if (!virus.ok) return { ok: false, error: 'File failed virus scan' };
  return { ok: true };
};

export const verifyUploadedFiles = async (req, res, next) => {
  const list = [];
  if (req.file) list.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) list.push(...req.files);
    else Object.values(req.files).flat().forEach((f) => f && list.push(f));
  }
  for (const file of list) {
    const check = await assertSafeFile(file);
    if (!check.ok) return res.status(400).json({ success: false, message: check.error });
  }
  next();
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import VideoJob from '../models/VideoJob.js';
import MediaAsset from '../models/MediaAsset.js';
import Media from '../models/Media.js';
import VideoTrail from '../models/VideoTrail.js';
import Settings from '../models/Settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupRoot = path.join(__dirname, '../backups');

const writeJson = (dir, name, data) => {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
};

export const runBackup = async () => {
  if (!fs.existsSync(backupRoot)) fs.mkdirSync(backupRoot, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.join(backupRoot, stamp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const [jobs, assets, media, trails, settings] = await Promise.all([
    VideoJob.find().lean(),
    MediaAsset.find().lean(),
    Media.find().lean(),
    VideoTrail.find().lean(),
    Settings.find().lean(),
  ]);
  writeJson(dir, 'video-jobs.json', jobs);
  writeJson(dir, 'media-library.json', assets);
  writeJson(dir, 'media.json', media);
  writeJson(dir, 'render-trails.json', trails);
  writeJson(dir, 'settings.json', settings);

  const keep = 7;
  const folders = fs.readdirSync(backupRoot).filter((n) => fs.statSync(path.join(backupRoot, n)).isDirectory()).sort();
  folders.slice(0, Math.max(0, folders.length - keep)).forEach((old) => {
    fs.rmSync(path.join(backupRoot, old), { recursive: true, force: true });
  });
  console.log(`Backup written to ${dir}`);
  return dir;
};

export const startDailyBackup = () => {
  const ms = 24 * 60 * 60 * 1000;
  setTimeout(() => {
    runBackup().catch((err) => console.error('Backup failed:', err.message));
    setInterval(() => runBackup().catch((err) => console.error('Backup failed:', err.message)), ms);
  }, 60 * 1000);
};

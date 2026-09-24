import os from 'os';
import { notifyRole } from './notify.js';
import { folderBytes } from './storageCleanup.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let last = 0;

export const startServerAlerts = () => {
  setInterval(async () => {
    if (Date.now() - last < 30 * 60 * 1000) return;
    const freeRatio = os.freemem() / os.totalmem();
    const load = os.loadavg()[0] / Math.max(1, os.cpus().length);
    const uploadsMb = folderBytes(path.join(__dirname, '../uploads')) / (1024 * 1024);
    const warnDisk = Number(process.env.UPLOADS_WARN_MB || 20000);
    const problems = [];
    if (freeRatio < 0.08) problems.push(`RAM low: ${Math.round(freeRatio * 100)}% free`);
    if (load > 0.9) problems.push(`CPU load high: ${load.toFixed(2)}`);
    if (uploadsMb > warnDisk) problems.push(`Uploads folder ${uploadsMb.toFixed(0)} MB`);
    if (!problems.length) return;
    last = Date.now();
    await notifyRole('super_admin', {
      title: 'Server alert',
      body: problems.join(' · '),
      type: 'server',
      link: '/super-admin/health',
    }).catch(() => {});
    console.warn('Server alert:', problems.join(' | '));
  }, 5 * 60 * 1000);
};

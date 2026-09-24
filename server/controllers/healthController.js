import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../utils/helpers.js';
import { binOk, ffmpegBins } from '../utils/videoValidate.js';
import { folderBytes } from '../utils/storageCleanup.js';
import { metaConfigStatus } from '../utils/metaGraph.js';
import VideoJob from '../models/VideoJob.js';
import { pingCloudinary } from '../utils/cloudinary.js';
import { inspectMetaToken } from '../utils/metaToken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pingRedis = async () => {
  if (!process.env.REDIS_URL) return { ok: false, detail: 'REDIS_URL not set (local queue)' };
  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 1500 });
    const pong = await redis.ping();
    redis.disconnect();
    return { ok: pong === 'PONG', detail: pong };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
};

const pingMeta = async () => {
  const cfg = metaConfigStatus();
  if (!cfg.facebookReady && !cfg.instagramReady) return { ok: false, detail: 'Tokens missing' };
  try {
    const url = `https://graph.facebook.com/${cfg.graphVersion}/me?access_token=${process.env.META_PAGE_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    return { ok: !data.error, detail: data.error?.message || data.name || 'ok' };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
};

export const getHealth = asyncHandler(async (_req, res) => {
  const bins = ffmpegBins();
  const uploads = path.join(__dirname, '../uploads');
  const bytes = folderBytes(uploads);
  const [ffmpeg, ffprobe, redis, meta, queued, rendering, cloud, token] = await Promise.all([
    binOk(bins.ffmpeg),
    binOk(bins.ffprobe),
    pingRedis(),
    pingMeta(),
    VideoJob.countDocuments({ status: 'queued' }),
    VideoJob.countDocuments({ status: 'rendering' }),
    pingCloudinary(),
    inspectMetaToken(),
  ]);

  res.json({
    success: true,
    data: {
      ffmpeg: { ok: ffmpeg, detail: bins.ffmpeg },
      ffprobe: { ok: ffprobe, detail: bins.ffprobe },
      redis,
      queue: { ok: true, detail: redis.ok ? 'BullMQ' : 'in-process', queued, rendering },
      storage: cloud,
      meta,
      token: {
        ok: token.ok,
        detail: token.detail,
        publishEnabled: token.publishEnabled,
      },
      disk: { ok: true, detail: `${(bytes / (1024 * 1024)).toFixed(1)} MB in /uploads` },
      cpu: { ok: true, detail: `${os.cpus().length} cores · load ${os.loadavg().map((n) => n.toFixed(2)).join(', ')}` },
      ram: {
        ok: os.freemem() / os.totalmem() > 0.08,
        detail: `${Math.round(os.freemem() / 1024 / 1024)} MB free / ${Math.round(os.totalmem() / 1024 / 1024)} MB`,
      },
    },
  });
});

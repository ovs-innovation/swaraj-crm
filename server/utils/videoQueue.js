import VideoJob from '../models/VideoJob.js';
import { renderVideo } from './ffmpeg.js';
import { notifyAreaManager, notifyRole } from './notify.js';
import { addTrail } from './videoTrail.js';
import { cleanupJobRenders } from './storageCleanup.js';

let busy = false;
let bullReady = false;

const log = async (job, message, progress, level = 'info') => {
  job.renderLogs.push({ message, progress, level, at: new Date() });
  if (typeof progress === 'number') job.renderProgress = progress;
  await job.save();
};

export const estimateMs = (job, aheadCount = 0) => {
  const own = job.lastRenderMs || Math.max(20000, (job.durationSec || 20) * 800);
  return own + aheadCount * 25000;
};

export const processVideoJob = async (id) => {
  const job = await VideoJob.findById(id).populate('dealer', 'dealerName dealerCode').populate('uploadedBy', 'name');
  if (!job) return;
  job.status = 'rendering';
  job.renderProgress = 1;
  job.renderStartedAt = new Date();
  await log(job, 'Render started', 1);
  await addTrail(job._id, job.uploadedBy, 'render_started', 'FFmpeg worker picked the job');

  try {
    const forensic = {
      title: job.dealer?.dealerName || 'Swaraj',
      dealerId: String(job.dealer?._id || job.dealer || ''),
      videoId: String(job._id),
      date: new Date().toISOString().slice(0, 10),
      mark: String(job._id).slice(-8),
      comment: Buffer.from(
        JSON.stringify({
          dealerName: job.dealer?.dealerName,
          dealerId: job.dealer?._id,
          videoId: job._id,
          renderedBy: job.uploadedBy?.name || 'super_admin',
          renderDate: new Date().toISOString(),
        })
      ).toString('base64'),
    };
    job.forensic = {
      dealerName: job.dealer?.dealerName,
      dealerId: String(job.dealer?._id || ''),
      videoId: String(job._id),
      renderedBy: job.uploadedBy?.name || 'super_admin',
      renderDate: new Date().toISOString(),
    };
    const result = await renderVideo(job, async (pct) => {
      job.renderProgress = pct;
      if (pct % 10 === 0) await job.save();
    }, forensic);
    job.editedPath = result.outPath;
    job.editedUrl = result.outUrl;
    if (result.thumbUrl) {
      job.thumbnailUrl = result.thumbUrl;
      job.thumbnailPath = result.thumbPath;
    }
    job.versions.push({
      url: job.editedUrl,
      path: result.outPath,
      spec: job.editSpec,
      note: 'FFmpeg render',
      createdAt: new Date(),
    });
    job.renderProgress = 100;
    job.status = 'waiting_am';
    job.errorMessage = '';
    job.renderFinishedAt = new Date();
    job.lastRenderMs = job.renderFinishedAt - job.renderStartedAt;
    cleanupJobRenders(job);
    await log(job, 'Render finished — sent to Area Manager', 100);
    await addTrail(job._id, null, 'rendered', `Version ${job.versions.length}`);
    await notifyAreaManager(job.areaManager, {
      title: 'Review Required',
      body: 'A rendered video is waiting for your review.',
      type: 'review',
      link: '/area-manager/videos',
      video: job._id,
    });
  } catch (err) {
    job.status = 'failed';
    job.errorMessage = err.message;
    job.renderFinishedAt = new Date();
    await log(job, err.message, job.renderProgress, 'error');
    await notifyRole('super_admin', {
      title: 'Render Failed',
      body: err.message.slice(0, 180),
      type: 'error',
      link: '/super-admin/videos',
      video: job._id,
    });
  }
};

const drainLocal = async () => {
  if (busy) return;
  const next = await VideoJob.findOne({ status: 'queued' }).sort({ queuedAt: 1, updatedAt: 1 });
  if (!next) return;
  busy = true;
  try {
    await processVideoJob(next._id);
  } finally {
    busy = false;
    setImmediate(() => drainLocal());
  }
};

export const enqueueRender = async (id) => {
  await VideoJob.findByIdAndUpdate(id, { status: 'queued', renderProgress: 0, queuedAt: new Date() });
  if (bullReady) {
    const { addBullJob } = await import('./bullRender.js');
    await addBullJob(id);
    return;
  }
  setImmediate(() => drainLocal());
};

export const startVideoQueue = async () => {
  if (process.env.REDIS_URL) {
    try {
      const { startBullWorker } = await import('./bullRender.js');
      await startBullWorker();
      bullReady = true;
      console.log('Render queue: BullMQ + Redis');
      return;
    } catch (err) {
      console.error('BullMQ not available, using local queue:', err.message);
    }
  }
  console.log('Render queue: in-process worker (set REDIS_URL for BullMQ)');
  setInterval(() => {
    drainLocal().catch((err) => console.error('Video queue:', err.message));
  }, 15 * 1000);
};

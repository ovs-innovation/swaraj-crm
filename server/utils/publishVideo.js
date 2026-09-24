import {
  buildMessage,
  metaConfigStatus,
  publicUploadUrl,
  publishToFacebookVideo,
  publishToInstagramVideo,
} from './metaGraph.js';
import { normalizePlatforms, upsertPublication } from './platforms.js';
import { addTrail } from './videoTrail.js';
import { notifyUsers } from './notify.js';
import { assertPublishAllowed } from './metaToken.js';
import { ensurePublicVideoUrl } from './cloudinary.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const publishers = {
  facebook: async (job, message, unix) =>
    publishToFacebookVideo({
      filePath: job.editedPath || job.originalPath,
      message,
      scheduledUnix: unix,
      thumbPath: job.thumbnailPath,
    }),
  instagram: async (job, message) =>
    publishToInstagramVideo({
      fileUrl: publicUploadUrl(job.editedUrl || job.originalUrl),
      coverUrl: job.thumbnailUrl ? publicUploadUrl(job.thumbnailUrl) : '',
      message,
    }),
};

const publishOne = async (job, platform, message, unix, maxAttempts = 3) => {
  const row = upsertPublication(job, platform);
  const fn = publishers[platform];
  if (!fn) {
    row.status = 'failed';
    row.attempts.push({ at: new Date(), attempt: 1, ok: false, error: `${platform} publisher is not wired yet` });
    await addTrail(job._id, job.publishedBy, `publish_${platform}_skipped`, 'Adapter not implemented');
    return;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await fn(job, message, unix);
      row.status = unix && platform === 'facebook' ? 'scheduled' : 'published';
      row.externalId = result.id || '';
      row.response = result.raw;
      row.publishedAt = new Date();
      row.attempts.push({ at: new Date(), attempt, ok: true, error: '' });
      if (platform === 'facebook') job.facebookPostId = result.id || '';
      if (platform === 'instagram') job.instagramPostId = result.id || '';
      await addTrail(job._id, job.publishedBy, `published_${platform}`, `Attempt ${attempt} ok`);
      return;
    } catch (err) {
      row.status = 'failed';
      row.attempts.push({ at: new Date(), attempt, ok: false, error: err.message });
      await addTrail(job._id, job.publishedBy, `publish_${platform}_fail`, `Attempt ${attempt}: ${err.message}`);
      if (attempt < maxAttempts) await sleep(1500 * attempt);
    }
  }
};

export const publishJob = async (job, { platforms, scheduledAt, userId, attempts = 3 }) => {
  await assertPublishAllowed();
  const list = normalizePlatforms(platforms);
  if (!list.length) throw new Error('Choose at least one platform');
  if (job.publishLock) throw new Error('Publish already in progress');

  const videoPath = job.editedPath || job.originalPath;
  if (!videoPath) throw new Error('No video file to publish');
  const message = buildMessage(job.caption, job.hashtags);
  const cfg = metaConfigStatus();
  const when = scheduledAt ? new Date(scheduledAt) : null;
  const schedule = when && when.getTime() > Date.now() + 75 * 1000;
  const unix = schedule ? Math.floor(when.getTime() / 1000) : undefined;

  if (list.includes('facebook') && !cfg.facebookReady) throw new Error('Facebook is not configured');
  if (list.includes('instagram') && !cfg.instagramReady) throw new Error('Instagram is not configured');
  if (list.includes('instagram')) await ensurePublicVideoUrl(job);

  job.publishLock = true;
  job.publishedBy = userId;
  job.platform = list.length > 1 ? 'both' : list[0];
  job.status = schedule ? 'scheduled' : 'publishing';
  if (schedule) job.scheduledAt = when;
  await job.save();

  try {
    for (const platform of list) {
      await publishOne(job, platform, message, unix, attempts);
    }
    const pubs = job.publications.filter((p) => list.includes(p.platform));
    const failed = pubs.filter((p) => p.status === 'failed');
    const ok = pubs.filter((p) => p.status === 'published' || p.status === 'scheduled');
    if (failed.length && !ok.length) {
      job.status = 'failed';
      job.errorMessage = failed.map((p) => `${p.platform}: ${p.attempts.at(-1)?.error || 'failed'}`).join(' | ');
    } else if (failed.length) {
      job.status = 'failed';
      job.errorMessage = `Partial: ${failed.map((p) => p.platform).join(', ')} failed`;
      job.publishedAt = new Date();
    } else {
      job.status = schedule ? 'scheduled' : 'published';
      job.errorMessage = '';
      if (!schedule) job.publishedAt = new Date();
      if (job.uploadedBy) {
        await notifyUsers([job.uploadedBy], {
          title: 'Video Published',
          body: `Live on ${list.join(', ')}`,
          type: 'published',
          link: '/dealer/videos',
          video: job._id,
        });
      }
    }
  } finally {
    job.publishLock = false;
    await job.save();
  }
  return job;
};

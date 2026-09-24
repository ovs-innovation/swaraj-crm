import VideoJob from '../models/VideoJob.js';
import Dealer from '../models/Dealer.js';
import { asyncHandler, paginate, paginationMeta } from '../utils/helpers.js';
import { logAudit } from '../middleware/auditLog.js';
import { enqueueRender } from '../utils/videoQueue.js';
import { notifyAreaManager, notifyRole, notifyUsers } from '../utils/notify.js';
import { validateUpload } from '../utils/videoValidate.js';
import { addTrail, listTrail } from '../utils/videoTrail.js';
import { publishJob } from '../utils/publishVideo.js';
import { localFileMeta } from '../utils/cloudinary.js';
import { needsFfmpeg, pointEditedAtOriginal } from '../utils/videoReuse.js';

const scopeFilter = async (user, extra = {}) => {
  const filter = { ...extra };
  if (user.role === 'dealer' && user.dealerRef) filter.dealer = user.dealerRef;
  if (user.role === 'area_manager' && user.areaManagerRef) {
    filter.areaManager = user.areaManagerRef;
    if (!extra.status) filter.status = { $in: ['waiting_am', 'ready_to_publish', 'published', 'scheduled', 'changes_requested'] };
  }
  return filter;
};

export const listVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, status } = req.query;
  const extra = {};
  if (status) extra.status = status;
  const filter = await scopeFilter(req.user, extra);
  const total = await VideoJob.countDocuments(filter);
  const rows = await paginate(
    VideoJob.find(filter)
      .populate('dealer', 'dealerName dealerCode')
      .populate('areaManager', 'name email')
    .populate('uploadedBy', 'name')
    .populate('comments.author', 'name role')
    .sort({ createdAt: -1 }),
    page,
    limit
  );
  res.json({ success: true, data: rows, ...paginationMeta(total, page, limit) });
});

export const getVideo = asyncHandler(async (req, res) => {
  const job = await VideoJob.findById(req.params.id)
    .populate('dealer', 'dealerName dealerCode')
    .populate('areaManager', 'name email')
    .populate('uploadedBy', 'name')
    .populate('comments.author', 'name role');
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });
  if (req.user.role === 'dealer' && String(job.dealer._id || job.dealer) !== String(req.user.dealerRef)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  if (req.user.role === 'area_manager' && String(job.areaManager?._id || job.areaManager) !== String(req.user.areaManagerRef)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  res.json({ success: true, data: job });
});

export const uploadVideo = asyncHandler(async (req, res) => {
  const video = req.files?.video?.[0];
  if (!video) return res.status(400).json({ success: false, message: 'Upload a video file' });

  let dealerId = req.body.dealer;
  if (req.user.role === 'dealer') {
    if (!req.user.dealerRef) return res.status(403).json({ success: false, message: 'Dealer profile not linked' });
    dealerId = req.user.dealerRef;
  }
  const dealer = await Dealer.findById(dealerId);
  if (!dealer) return res.status(404).json({ success: false, message: 'Dealer not found' });

  const check = await validateUpload(video);
  if (!check.ok) {
    return res.status(400).json({ success: false, message: check.errors.join(' '), errors: check.errors, probe: check.probe });
  }

  const stored = localFileMeta(video);
  const thumb = localFileMeta(req.files?.thumbnail?.[0]);
  const durationSec = check.probe?.duration || 0;

  const job = await VideoJob.create({
    dealer: dealer._id,
    areaManager: dealer.areaManager,
    uploadedBy: req.user._id,
    caption: req.body.caption || '',
    hashtags: req.body.hashtags || '',
    originalUrl: stored.url,
    originalPath: stored.path || video.path,
    thumbnailUrl: thumb.url,
    thumbnailPath: thumb.path,
    status: 'pending_review',
    durationSec,
    probe: check.probe,
    editSpec: {},
  });

  logAudit(req, 'upload', 'video_job', job._id);
  await addTrail(job._id, req.user, 'uploaded', `${dealer.dealerName} · ${check.probe?.videoCodec || ''} ${Math.round(durationSec)}s`);
  await notifyUsers([req.user._id], {
    title: 'Video Submitted',
    body: dealer.dealerName,
    type: 'submit',
    link: req.user.role === 'dealer' ? '/dealer/videos' : '/super-admin/videos',
    video: job._id,
  });
  await notifyRole('super_admin', {
    title: 'New Video Waiting',
    body: `${dealer.dealerName} uploaded a video for review.`,
    type: 'waiting',
    link: '/super-admin/videos',
    video: job._id,
  });
  res.status(201).json({ success: true, data: job });
});

export const saveDraft = asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can edit videos' });
  }
  const job = await VideoJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });

  const files = req.files || {};
  if (files.watermark?.[0]) {
    const m = localFileMeta(files.watermark[0]);
    job.watermarkUrl = m.url;
    job.watermarkPath = m.path;
  }
  if (files.intro?.[0]) job.introPath = files.intro[0].path;
  if (files.outro?.[0]) job.outroPath = files.outro[0].path;
  if (files.music?.[0]) job.musicPath = files.music[0].path;
  if (files.srt?.[0]) job.srtPath = files.srt[0].path;
  if (files.thumbnail?.[0]) {
    const m = localFileMeta(files.thumbnail[0]);
    job.thumbnailUrl = m.url;
    job.thumbnailPath = m.path;
  }
  if (files.merge?.length) {
    job.mergePaths = [...(job.mergePaths || []), ...files.merge.map((f) => f.path)];
  }
  if (req.body.caption !== undefined) job.caption = req.body.caption;
  if (req.body.hashtags !== undefined) job.hashtags = req.body.hashtags;
  if (req.body.editSpec) {
    try {
      job.editSpec = typeof req.body.editSpec === 'string' ? JSON.parse(req.body.editSpec) : req.body.editSpec;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid edit settings' });
    }
  }
  if (['pending_review', 'changes_requested', 'failed', 'editing'].includes(job.status)) {
    job.status = 'editing';
  }
  await job.save();
  logAudit(req, 'draft', 'video_job', job._id);
  await addTrail(job._id, req.user, 'edited', 'Draft / trim settings saved');
  res.json({ success: true, data: job });
});

export const renderNow = asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can render' });
  }
  const job = await VideoJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });
  await enqueueRender(job._id);
  logAudit(req, 'render', 'video_job', job._id);
  await addTrail(job._id, req.user, 'queued', 'Sent to render queue');
  res.json({ success: true, message: 'Added to render queue' });
});

export const sendToAm = asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can send to Area Manager' });
  }
  const job = await VideoJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });

  if (!needsFfmpeg(job)) {
    pointEditedAtOriginal(job);
    job.status = 'waiting_am';
    job.errorMessage = '';
    await job.save();
    await addTrail(job._id, req.user, 'sent_am', 'Same file shared with Area Manager (no extra copy)');
    await notifyAreaManager(job.areaManager, {
      title: 'Review Required',
      body: 'A video is waiting for your review.',
      type: 'review',
      link: '/area-manager/videos',
      video: job._id,
    });
    logAudit(req, 'send_am', 'video_job', job._id);
    return res.json({ success: true, data: job, reused: true, message: 'Sent to Area Manager using the same video file' });
  }

  await enqueueRender(job._id);
  logAudit(req, 'render', 'video_job', job._id);
  await addTrail(job._id, req.user, 'queued', 'Edits need one render, then AM review');
  res.json({ success: true, reused: false, message: 'Rendering once, then Area Manager will see the same file' });
});

export const reviewVideo = asyncHandler(async (req, res) => {
  const { action, comment } = req.body;
  const job = await VideoJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });

  if (req.user.role === 'area_manager') {
    if (String(job.areaManager) !== String(req.user.areaManagerRef)) {
      return res.status(403).json({ success: false, message: 'Not your dealer video' });
    }
    if (job.status !== 'waiting_am') {
      return res.status(400).json({ success: false, message: 'This video is not waiting for AM review' });
    }
    if (action === 'approve') {
      job.status = 'ready_to_publish';
      job.approvedByAm = req.user._id;
      job.changeRequest = '';
    } else if (action === 'changes') {
      job.status = 'changes_requested';
      job.changeRequest = comment || 'Please revise';
    } else {
      return res.status(400).json({ success: false, message: 'Approve or request changes' });
    }
  } else if (req.user.role === 'super_admin' && action === 'approve') {
    job.status = 'ready_to_publish';
  } else {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  await job.save();
  await addTrail(req.params.id, req.user, action === 'approve' ? 'approved' : 'changes_requested', comment || '');
  if (job.status === 'changes_requested') {
    await notifyRole('super_admin', {
      title: 'Changes requested',
      body: job.changeRequest,
      type: 'changes',
      link: '/super-admin/videos',
      video: job._id,
    });
  }
  if (job.status === 'ready_to_publish') {
    await notifyRole('super_admin', {
      title: 'AM approved — ready to publish',
      body: 'Video is approved.',
      type: 'ready',
      link: '/super-admin/videos',
      video: job._id,
    });
  }
  logAudit(req, action, 'video_job', job._id, { comment });
  res.json({ success: true, data: job });
});

export const publishVideo = asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can publish' });
  }
  const job = await VideoJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });
  if (!['ready_to_publish', 'failed', 'scheduled'].includes(job.status)) {
    return res.status(400).json({ success: false, message: 'Area Manager must approve before publishing' });
  }
  const platforms = req.body.platforms || req.body.platform || 'both';
  try {
    const updated = await publishJob(job, {
      platforms,
      scheduledAt: req.body.scheduledAt,
      userId: req.user._id,
      attempts: Number(req.body.attempts || 3),
    });
    logAudit(req, 'publish', 'video_job', job._id, { platforms });
    const ok = updated.status === 'published' || updated.status === 'scheduled';
    res.status(ok ? 200 : 502).json({
      success: ok,
      data: updated,
      message: ok ? updated.status : updated.errorMessage,
    });
  } catch (err) {
    job.status = 'failed';
    job.errorMessage = err.message;
    job.publishLock = false;
    await job.save();
    res.status(err.status || 502).json({ success: false, data: job, message: err.message });
  }
});

export const retryPublish = asyncHandler(async (req, res) => {
  req.body.attempts = req.body.attempts || 3;
  return publishVideo(req, res);
});

export const getVideoTrail = asyncHandler(async (req, res) => {
  const rows = await listTrail(req.params.id);
  res.json({ success: true, data: rows });
});

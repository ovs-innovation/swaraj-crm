import path from 'path';
import VideoJob from '../models/VideoJob.js';
import MediaAsset from '../models/MediaAsset.js';
import BrandTemplate from '../models/BrandTemplate.js';
import Notification from '../models/Notification.js';
import { asyncHandler, paginate, paginationMeta } from '../utils/helpers.js';
import { estimateMs } from '../utils/videoQueue.js';
import { fetchVideoAnalytics } from '../utils/metaInsights.js';
import { notifyRole } from '../utils/notify.js';
import { addTrail } from '../utils/videoTrail.js';
import { attachCloudUrl } from '../utils/cloudinary.js';

const fileMeta = (f) => {
  if (!f) return null;
  return { url: `/uploads/${path.basename(f.path)}`, path: f.path };
};

export const getRenderQueue = asyncHandler(async (_req, res) => {
  const waiting = await VideoJob.find({ status: 'queued' }).populate('dealer', 'dealerName').sort({ queuedAt: 1 }).lean();
  const rendering = await VideoJob.find({ status: 'rendering' }).populate('dealer', 'dealerName').lean();
  const completed = await VideoJob.find({ status: { $in: ['waiting_am', 'ready_to_publish', 'published', 'scheduled'] }, editedUrl: { $ne: '' } })
    .populate('dealer', 'dealerName')
    .sort({ renderFinishedAt: -1 })
    .limit(20)
    .lean();
  const failed = await VideoJob.find({ status: 'failed' }).populate('dealer', 'dealerName').sort({ updatedAt: -1 }).limit(20).lean();

  const stamp = (row, i, listType) => {
    const eta = listType === 'waiting' ? estimateMs(row, i) : listType === 'rendering' ? Math.round((1 - (row.renderProgress || 0) / 100) * estimateMs(row)) : row.lastRenderMs || 0;
    return { ...row, etaMs: eta, etaLabel: `${Math.max(1, Math.round(eta / 1000))}s` };
  };

  res.json({
    success: true,
    data: {
      engine: process.env.REDIS_URL ? 'bullmq' : 'local',
      waiting: waiting.map((r, i) => stamp(r, i, 'waiting')),
      rendering: rendering.map((r) => stamp(r, 0, 'rendering')),
      completed: completed.map((r) => stamp(r, 0, 'done')),
      failed: failed.map((r) => stamp(r, 0, 'done')),
    },
  });
});

export const restoreVersion = asyncHandler(async (req, res) => {
  const job = await VideoJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });
  const idx = Number(req.params.index);
  const ver = job.versions[idx];
  if (!ver) return res.status(404).json({ success: false, message: 'Version not found' });
  job.editedUrl = ver.url;
  job.editedPath = ver.path;
  if (ver.spec) job.editSpec = ver.spec;
  job.status = 'editing';
  await job.save();
  await addTrail(job._id, req.user, 'restored', `Version ${idx + 1}`);
  res.json({ success: true, data: job, message: `Restored version ${idx + 1}` });
});

export const addTimelineComment = asyncHandler(async (req, res) => {
  const job = await VideoJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });
  if (req.user.role === 'area_manager' && String(job.areaManager) !== String(req.user.areaManagerRef)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  const atSec = Number(req.body.atSec);
  const text = String(req.body.text || '').trim();
  if (Number.isNaN(atSec) || !text) return res.status(400).json({ success: false, message: 'Timestamp and comment required' });
  job.comments.push({ atSec, text, author: req.user._id });
  await job.save();
  await addTrail(job._id, req.user, 'timeline_comment', `${atSec}s: ${text}`);
  if (req.user.role === 'area_manager') {
    await notifyRole('super_admin', {
      title: `Comment at ${atSec.toFixed(1)}s`,
      body: text,
      type: 'comment',
      link: '/super-admin/videos',
      video: job._id,
    });
  }
  const fresh = await VideoJob.findById(job._id).populate('comments.author', 'name role');
  res.json({ success: true, data: fresh });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const job = await VideoJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Video not found' });
  if (job.status !== 'published' && !job.facebookPostId && !job.instagramPostId) {
    return res.status(400).json({ success: false, message: 'Publish first to load analytics' });
  }
  const analytics = await fetchVideoAnalytics(job);
  job.analytics = analytics;
  await job.save();
  res.json({ success: true, data: analytics });
});

export const applyTemplate = asyncHandler(async (req, res) => {
  const job = await VideoJob.findById(req.params.id);
  const tpl = await BrandTemplate.findById(req.body.templateId).populate('logo intro outro watermark music');
  if (!job || !tpl) return res.status(404).json({ success: false, message: 'Template or video not found' });
  const take = (asset, urlKey, pathKey) => {
    if (!asset) return;
    if (urlKey) job[urlKey] = asset.url;
    job[pathKey] = asset.path;
  };
  take(tpl.watermark || tpl.logo, 'watermarkUrl', 'watermarkPath');
  take(tpl.intro, null, 'introPath');
  take(tpl.outro, null, 'outroPath');
  take(tpl.music, null, 'musicPath');
  job.template = tpl._id;
  if (tpl.defaultSpec && typeof tpl.defaultSpec === 'object') {
    job.editSpec = { ...(job.editSpec || {}), ...tpl.defaultSpec };
  }
  if (job.status === 'pending_review') job.status = 'editing';
  await job.save();
  res.json({ success: true, data: job });
});

export const listLibrary = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.kind) filter.kind = req.query.kind;
  const rows = await MediaAsset.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: rows });
});

export const addLibrary = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'Upload a file' });
  const kind = req.body.kind;
  if (!['video', 'image', 'logo', 'intro', 'outro', 'music', 'font'].includes(kind)) {
    return res.status(400).json({ success: false, message: 'Invalid library kind' });
  }
  const meta = await attachCloudUrl(file, 'swaraj-crm/library');
  const row = await MediaAsset.create({
    kind,
    name: req.body.name || file.originalname,
    url: meta.url,
    path: meta.path,
    uploadedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: row });
});

export const deleteLibrary = asyncHandler(async (req, res) => {
  await MediaAsset.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export const listTemplates = asyncHandler(async (_req, res) => {
  const rows = await BrandTemplate.find()
    .populate('logo intro outro watermark music')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});

export const saveTemplate = asyncHandler(async (req, res) => {
  const payload = {
    name: req.body.name,
    logo: req.body.logo || undefined,
    intro: req.body.intro || undefined,
    outro: req.body.outro || undefined,
    watermark: req.body.watermark || undefined,
    music: req.body.music || undefined,
    defaultSpec: req.body.defaultSpec || {},
    createdBy: req.user._id,
  };
  const row = req.body.id
    ? await BrandTemplate.findByIdAndUpdate(req.body.id, payload, { new: true })
    : await BrandTemplate.create(payload);
  res.json({ success: true, data: row });
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  await BrandTemplate.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const filter = { user: req.user._id };
  const total = await Notification.countDocuments(filter);
  const unread = await Notification.countDocuments({ ...filter, read: false });
  const rows = await paginate(Notification.find(filter).sort({ createdAt: -1 }), page, limit);
  res.json({ success: true, data: rows, unread, ...paginationMeta(total, page, limit) });
});

export const markNotifications = asyncHandler(async (req, res) => {
  const ids = req.body.ids;
  const q = { user: req.user._id };
  if (ids?.length) q._id = { $in: ids };
  await Notification.updateMany(q, { read: true });
  res.json({ success: true });
});

export const aiAssist = asyncHandler(async (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  const { task, caption, hashtags } = req.body;
  const allowed = ['caption', 'hashtags', 'title', 'thumbnail_hint', 'resize_reels', 'subtitle', 'translate'];
  if (!allowed.includes(task)) return res.status(400).json({ success: false, message: 'Unknown AI task' });
  if (!key) {
    return res.json({
      success: true,
      ready: false,
      message: 'AI is wired. Add OPENAI_API_KEY to enable caption, hashtags, title, thumbnail hint, Whisper subtitles and translation.',
      data: null,
    });
  }
  const prompts = {
    caption: `Write a short social caption for this dealer video. Context: ${caption || 'Swaraj dealer promo'}`,
    hashtags: `Suggest 8 relevant hashtags for: ${caption || 'tractor dealer video'}`,
    title: `Give a punchy 6-word title for: ${caption || 'dealer video'}`,
    thumbnail_hint: `Suggest a thumbnail frame idea (one sentence) for: ${caption}`,
    resize_reels: 'Return JSON advice to crop 9:16 for Reels.',
    subtitle: 'Whisper auto-subtitles will run when worker is enabled. Ask user to upload .srt for now.',
    translate: `Translate to Hindi: ${caption || ''} ${hashtags || ''}`,
  };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompts[task] }],
      max_tokens: 200,
    }),
  });
  const json = await r.json();
  const text = json.choices?.[0]?.message?.content || json.error?.message || '';
  res.json({ success: true, ready: true, data: text });
});

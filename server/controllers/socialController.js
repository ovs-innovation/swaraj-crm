import path from 'path';
import SocialPost from '../models/SocialPost.js';
import { asyncHandler, paginate, paginationMeta } from '../utils/helpers.js';
import { logAudit } from '../middleware/auditLog.js';
import { buildMessage, metaConfigStatus, publishToFacebook, publishToInstagram } from '../utils/metaGraph.js';

const mapFiles = (files = []) =>
  files.map((f) => ({
    path: f.path,
    url: `/uploads/${path.basename(f.path)}`,
    originalName: f.originalname,
  }));

const wants = (platform, name) => platform === name || platform === 'both';

export const publishSocialPost = async (post) => {
  const files = (post.images || []).filter((img) => img.path);
  if (!files.length) throw new Error('At least one image is required');

  const message = post.message || buildMessage(post.caption, post.hashtags);
  const errors = [];
  let facebook = null;
  let instagram = null;

  if (wants(post.platform, 'facebook')) {
    try {
      facebook = await publishToFacebook({ files, message });
    } catch (err) {
      errors.push(`Facebook: ${err.message}`);
      post.facebookResponse = err.meta || { message: err.message };
    }
  }

  if (wants(post.platform, 'instagram')) {
    try {
      instagram = await publishToInstagram({ files, message });
    } catch (err) {
      errors.push(`Instagram: ${err.message}`);
      post.instagramResponse = err.meta || { message: err.message };
    }
  }

  if (facebook) {
    post.facebookPostId = facebook.id || '';
    post.facebookResponse = facebook.raw;
  }
  if (instagram) {
    post.instagramPostId = instagram.id || '';
    post.instagramResponse = instagram.raw;
  }

  if (errors.length) {
    post.status = 'failed';
    post.errorMessage = errors.join(' | ');
    if (facebook || instagram) post.publishedAt = new Date();
  } else {
    post.status = 'published';
    post.errorMessage = '';
    post.publishedAt = new Date();
  }

  await post.save();
  return post;
};

export const getSocialConfig = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: metaConfigStatus() });
});

export const getSocialPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const total = await SocialPost.countDocuments(filter);
  const rows = await paginate(
    SocialPost.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name email'),
    page,
    limit
  );
  res.json({ success: true, data: rows, ...paginationMeta(total, page, limit) });
});

export const createSocialPost = asyncHandler(async (req, res) => {
  const { caption = '', hashtags = '', platform, scheduledAt, action } = req.body;
  if (!['facebook', 'instagram', 'both'].includes(platform)) {
    return res.status(400).json({ success: false, message: 'Choose Facebook, Instagram, or both' });
  }
  const images = mapFiles(req.files);
  if (!images.length) {
    return res.status(400).json({ success: false, message: 'Upload at least one image' });
  }

  const cfg = metaConfigStatus();
  if (wants(platform, 'facebook') && !cfg.facebookReady) {
    return res.status(400).json({
      success: false,
      message: 'Facebook is not configured. Add META_PAGE_ID and META_PAGE_ACCESS_TOKEN to the server environment.',
    });
  }
  if (wants(platform, 'instagram') && !cfg.instagramReady) {
    return res.status(400).json({
      success: false,
      message: 'Instagram is not configured. Add META_IG_USER_ID and META_PAGE_ACCESS_TOKEN to the server environment.',
    });
  }

  const when = scheduledAt ? new Date(scheduledAt) : null;
  const schedule = action === 'schedule' && when && !Number.isNaN(when.getTime()) && when.getTime() > Date.now() + 60 * 1000;

  const post = await SocialPost.create({
    caption,
    hashtags,
    message: buildMessage(caption, hashtags),
    platform,
    images,
    status: schedule ? 'scheduled' : 'publishing',
    scheduledAt: schedule ? when : undefined,
    createdBy: req.user._id,
  });

  if (schedule) {
    logAudit(req, 'schedule', 'social_post', post._id, { platform });
    return res.status(201).json({ success: true, data: post, message: 'Post scheduled' });
  }

  try {
    await publishSocialPost(post);
    logAudit(req, 'publish', 'social_post', post._id, { platform, status: post.status });
    const ok = post.status === 'published';
    return res.status(ok ? 201 : 502).json({
      success: ok,
      data: post,
      message: ok ? 'Published' : post.errorMessage || 'Publishing failed',
    });
  } catch (err) {
    post.status = 'failed';
    post.errorMessage = err.message;
    await post.save();
    return res.status(502).json({ success: false, data: post, message: err.message });
  }
});

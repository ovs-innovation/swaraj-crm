import rateLimit from 'express-rate-limit';
import VideoJob from '../models/VideoJob.js';
import Media from '../models/Media.js';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_MAX || 2000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path || '';
    return p === '/health' || p.endsWith('/studio/notifications') || p === '/notifications';
  },
  message: { success: false, message: 'Too many requests. Try again later.' },
});

export const enforceUploadQuota = async (req, res, next) => {
  const dealer = req.user?.role === 'dealer' ? req.user.dealerRef : req.body.dealer;
  if (!dealer) return next();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const max = Number(process.env.MAX_UPLOADS_PER_DAY || 20);
  const [videos, media] = await Promise.all([
    VideoJob.countDocuments({ dealer, createdAt: { $gte: start } }),
    Media.countDocuments({ dealer, createdAt: { $gte: start } }),
  ]);
  if (videos + media >= max) {
    return res.status(429).json({ success: false, message: `Daily upload limit reached (${max}).` });
  }
  next();
};

export const enforceRenderQuota = async (req, res, next) => {
  const job = await VideoJob.findById(req.params.id).select('dealer');
  if (!job) return next();
  const max = Number(process.env.MAX_ACTIVE_RENDERS_PER_DEALER || 3);
  const active = await VideoJob.countDocuments({
    dealer: job.dealer,
    status: { $in: ['queued', 'rendering'] },
  });
  if (active >= max) {
    return res.status(429).json({ success: false, message: `Max ${max} renders already running for this dealer.` });
  }
  next();
};

import VideoTrail from '../models/VideoTrail.js';

export const addTrail = async (videoId, actor, action, detail = '') => {
  if (!videoId) return;
  await VideoTrail.create({
    video: videoId,
    actor: actor?._id || actor || undefined,
    actorName: actor?.name || actor?.role || '',
    action,
    detail: String(detail || '').slice(0, 500),
    at: new Date(),
  });
};

export const listTrail = async (videoId) =>
  VideoTrail.find({ video: videoId }).sort({ at: 1 }).lean();

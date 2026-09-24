import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const notifyUsers = async (userIds, payload) => {
  const ids = [...new Set((userIds || []).filter(Boolean).map((id) => String(id)))];
  if (!ids.length) return;
  await Notification.insertMany(ids.map((user) => ({ user, ...payload })));
};

export const notifyRole = async (role, payload) => {
  const users = await User.find({ role, status: 'active' }).select('_id').lean();
  await notifyUsers(users.map((u) => u._id), payload);
};

export const notifyAreaManager = async (areaManagerRef, payload) => {
  if (!areaManagerRef) return;
  const users = await User.find({ role: 'area_manager', areaManagerRef, status: 'active' }).select('_id').lean();
  await notifyUsers(users.map((u) => u._id), payload);
};

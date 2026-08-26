import Activity from '../models/Activity.js';

export const logActivity = async ({ entityType, entityId, action, description, performedBy, metadata }) => {
  try {
    await Activity.create({ entityType, entityId, action, description, performedBy, metadata });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

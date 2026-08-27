import Activity from '../models/Activity.js';

export const logActivity = ({ entityType, entityId, action, description, performedBy, metadata }) => {
  Activity.create({ entityType, entityId, action, description, performedBy, metadata }).catch((err) =>
    console.error('Activity log error:', err.message)
  );
};

import AuditLog from '../models/AuditLog.js';

export const logAudit = (req, action, entity, entityId, details = {}) => {
  AuditLog.create({
    user: req.user?._id,
    action,
    entity,
    entityId,
    details,
    ipAddress: req.ip,
    userAgent: req.get?.('user-agent'),
  }).catch((err) => console.error('Audit log error:', err.message));
};

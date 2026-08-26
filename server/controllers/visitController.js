import Visit from '../models/Visit.js';
import Dealer from '../models/Dealer.js';
import { asyncHandler, paginate, paginationMeta } from '../utils/helpers.js';
import { logAudit } from '../middleware/auditLog.js';
import { logActivity } from '../utils/activityLogger.js';

export const getVisits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, dealer, status, startDate, endDate } = req.query;
  const filter = {};

  if (req.user.role === 'dealer' && req.user.dealerRef) {
    filter.dealer = req.user.dealerRef;
  } else if (req.user.role === 'area_manager' && req.user.areaManagerRef) {
    filter.areaManager = req.user.areaManagerRef;
  }
  if (dealer) filter.dealer = dealer;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.visitDate = {};
    if (startDate) filter.visitDate.$gte = new Date(startDate);
    if (endDate) filter.visitDate.$lte = new Date(endDate);
  }

  const total = await Visit.countDocuments(filter);
  const visits = await paginate(
    Visit.find(filter)
      .populate('dealer', 'dealerName dealerCode')
      .populate('areaManager', 'name employeeId')
      .sort({ visitDate: -1 }),
    page,
    limit
  );

  res.json({ success: true, data: visits, ...paginationMeta(total, page, limit) });
});

export const getVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id)
    .populate('dealer', 'dealerName dealerCode address')
    .populate('areaManager', 'name employeeId');
  if (!visit) {
    return res.status(404).json({ success: false, message: 'Visit not found' });
  }
  res.json({ success: true, data: visit });
});

export const createVisit = asyncHandler(async (req, res) => {
  if (req.user.role === 'dealer') {
    return res.status(403).json({ success: false, message: 'Dealers cannot create visits' });
  }

  const { dealer, visitDate, visitTime, notes, status, gpsLocation } = req.body;

  const dealerDoc = await Dealer.findById(dealer);
  if (!dealerDoc) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  if (req.user.role === 'area_manager' && dealerDoc.areaManager?.toString() !== req.user.areaManagerRef?.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized for this dealer' });
  }

  const areaManagerId = req.user.role === 'area_manager' ? req.user.areaManagerRef : dealerDoc.areaManager;

  const visit = await Visit.create({
    dealer,
    areaManager: areaManagerId,
    visitDate,
    visitTime,
    notes,
    status: status || 'pending',
    gpsLocation,
    media: req.body.media || [],
  });

  await logAudit(req, 'create', 'visit', visit._id);
  await logActivity({
    entityType: 'visit',
    entityId: visit._id,
    action: 'created',
    description: `Visit scheduled for ${dealerDoc.dealerName}`,
    performedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: visit });
});

export const updateVisit = asyncHandler(async (req, res) => {
  let visit = await Visit.findById(req.params.id);
  if (!visit) {
    return res.status(404).json({ success: false, message: 'Visit not found' });
  }

  if (req.user.role === 'area_manager' && visit.areaManager?.toString() !== req.user.areaManagerRef?.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  visit = await Visit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

  if (visit.status === 'completed') {
    await logActivity({
      entityType: 'visit',
      entityId: visit._id,
      action: 'completed',
      description: 'Visit completed',
      performedBy: req.user._id,
    });
  }

  await logAudit(req, 'update', 'visit', visit._id);
  res.json({ success: true, data: visit });
});

export const deleteVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) {
    return res.status(404).json({ success: false, message: 'Visit not found' });
  }

  await Visit.findByIdAndDelete(req.params.id);
  await logAudit(req, 'delete', 'visit', visit._id);
  res.json({ success: true, message: 'Visit deleted' });
});

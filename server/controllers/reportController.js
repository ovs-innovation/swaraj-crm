import AuditLog from '../models/AuditLog.js';
import Settings from '../models/Settings.js';
import Dealer from '../models/Dealer.js';
import Visit from '../models/Visit.js';
import Media from '../models/Media.js';
import AreaManager from '../models/AreaManager.js';
import { asyncHandler } from '../utils/helpers.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, action, entity } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;

  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, data: logs, total, page: Number(page) });
});

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create(req.body);
  } else {
    settings = await Settings.findByIdAndUpdate(settings._id, req.body, { new: true });
  }
  res.json({ success: true, data: settings });
});

export const getDealerReport = asyncHandler(async (req, res) => {
  const dealers = await Dealer.find()
    .populate('areaManager', 'name employeeId')
    .select('dealerName dealerCode state district status areaManager createdAt');
  res.json({ success: true, data: dealers });
});

export const getVisitReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = {};
  if (startDate || endDate) {
    filter.visitDate = {};
    if (startDate) filter.visitDate.$gte = new Date(startDate);
    if (endDate) filter.visitDate.$lte = new Date(endDate);
  }

  const visits = await Visit.find(filter)
    .populate('dealer', 'dealerName dealerCode state')
    .populate('areaManager', 'name employeeId')
    .sort({ visitDate: -1 });

  res.json({ success: true, data: visits });
});

export const getUploadReport = asyncHandler(async (req, res) => {
  const { status, startDate, endDate } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const uploads = await Media.find(filter)
    .populate('dealer', 'dealerName dealerCode')
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: uploads });
});

export const getStateWiseReport = asyncHandler(async (req, res) => {
  const report = await Dealer.aggregate([
    { $group: { _id: '$state', total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
    { $sort: { total: -1 } },
  ]);
  res.json({ success: true, data: report });
});

export const getAreaWiseReport = asyncHandler(async (req, res) => {
  const report = await AreaManager.aggregate([
    {
      $lookup: {
        from: 'dealers',
        localField: '_id',
        foreignField: 'areaManager',
        as: 'dealers',
      },
    },
    {
      $project: {
        name: 1,
        employeeId: 1,
        state: 1,
        district: 1,
        totalDealers: { $size: '$dealers' },
        activeDealers: {
          $size: {
            $filter: { input: '$dealers', as: 'd', cond: { $eq: ['$$d.status', 'active'] } },
          },
        },
      },
    },
    { $sort: { totalDealers: -1 } },
  ]);
  res.json({ success: true, data: report });
});

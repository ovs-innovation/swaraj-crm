import AreaManager from '../models/AreaManager.js';
import Dealer from '../models/Dealer.js';
import Visit from '../models/Visit.js';
import Media from '../models/Media.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import VideoJob from '../models/VideoJob.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/helpers.js';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getSuperAdminDashboard = asyncHandler(async (req, res) => {
  const today = startOfToday();
  const monthStart = startOfMonth();

  const [
    totalSuperAdmins,
    totalAdmins,
    inactiveHqUsers,
    totalAreaManagers,
    totalDealers,
    inactiveDealers,
    pendingApprovals,
    todayVisits,
    monthlyVisits,
    dealersByState,
    dealersByManager,
    recentActivities,
    recentHqUsers,
    pendingVideos,
    renderingVideos,
    waitingAmVideos,
    scheduledVideos,
    publishedToday,
    failedVideos,
  ] = await Promise.all([
    User.countDocuments({ role: 'super_admin' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: { $in: ['super_admin', 'admin'] }, status: 'inactive' }),
    AreaManager.countDocuments(),
    Dealer.countDocuments(),
    Dealer.countDocuments({ status: 'inactive' }),
    Media.countDocuments({ status: 'pending' }),
    Visit.countDocuments({ visitDate: { $gte: today } }),
    Visit.countDocuments({ visitDate: { $gte: monthStart } }),
    Dealer.aggregate([{ $group: { _id: '$state', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Dealer.aggregate([
      { $match: { areaManager: { $ne: null } } },
      { $group: { _id: '$areaManager', count: { $sum: 1 } } },
      { $lookup: { from: 'areamanagers', localField: '_id', foreignField: '_id', as: 'manager' } },
      { $unwind: '$manager' },
      { $project: { name: '$manager.name', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Activity.find()
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(8),
    User.find({ role: { $in: ['super_admin', 'admin'] } })
      .select('name email role status createdAt')
      .sort({ createdAt: -1 })
      .limit(6),
    VideoJob.countDocuments({ status: 'pending_review' }),
    VideoJob.countDocuments({ status: { $in: ['queued', 'rendering'] } }),
    VideoJob.countDocuments({ status: 'waiting_am' }),
    VideoJob.countDocuments({ status: 'scheduled' }),
    VideoJob.countDocuments({ status: 'published', publishedAt: { $gte: today } }),
    VideoJob.countDocuments({ status: 'failed' }),
  ]);

  res.json({
    success: true,
    data: {
      cards: {
        totalSuperAdmins,
        totalAdmins,
        inactiveHqUsers,
        totalAreaManagers,
        totalDealers,
        inactiveDealers,
        pendingApprovals,
        todayVisits,
        monthlyVisits,
        pendingVideos,
        renderingVideos,
        waitingAmVideos,
        scheduledVideos,
        publishedToday,
        failedVideos,
      },
      charts: { dealersByState, dealersByManager },
      recentActivities,
      recentHqUsers,
    },
  });
});

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const today = startOfToday();
  const monthStart = startOfMonth();

  const [
    totalAreaManagers,
    totalDealers,
    activeDealers,
    pendingApprovals,
    uploadedMedia,
    todayVisits,
    monthlyVisits,
    dealersByState,
    dealersByManager,
    visitTrend,
    uploadTrend,
  ] = await Promise.all([
    AreaManager.countDocuments({ status: 'active' }),
    Dealer.countDocuments(),
    Dealer.countDocuments({ status: 'active' }),
    Media.countDocuments({ status: 'pending' }),
    Media.countDocuments(),
    Visit.countDocuments({ visitDate: { $gte: today } }),
    Visit.countDocuments({ visitDate: { $gte: monthStart } }),
    Dealer.aggregate([{ $group: { _id: '$state', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Dealer.aggregate([
      { $match: { areaManager: { $ne: null } } },
      { $group: { _id: '$areaManager', count: { $sum: 1 } } },
      { $lookup: { from: 'areamanagers', localField: '_id', foreignField: '_id', as: 'manager' } },
      { $unwind: '$manager' },
      { $project: { name: '$manager.name', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Visit.aggregate([
      { $match: { visitDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Media.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      cards: {
        totalAreaManagers,
        totalDealers,
        activeDealers,
        pendingApprovals,
        uploadedMedia,
        todayVisits,
        monthlyVisits,
      },
      charts: {
        dealersByState,
        dealersByManager,
        visitTrend,
        uploadTrend,
      },
    },
  });
});

export const getAreaManagerDashboard = asyncHandler(async (req, res) => {
  if (!req.user.areaManagerRef) {
    return res.status(403).json({ success: false, message: 'Area manager profile not linked' });
  }

  const areaManagerId = new mongoose.Types.ObjectId(req.user.areaManagerRef);
  const today = startOfToday();
  const dealerIds = (await Dealer.find({ areaManager: areaManagerId }).select('_id').lean()).map((d) => d._id);

  const [assignedDealers, inactiveDealers, todayVisits, pendingUploads, completedVisits, myDealers, pendingMedia, visitTrend, recentVisits] =
    await Promise.all([
      Dealer.countDocuments({ areaManager: areaManagerId, status: 'active' }),
      Dealer.countDocuments({ areaManager: areaManagerId, status: 'inactive' }),
      Visit.countDocuments({ areaManager: areaManagerId, visitDate: { $gte: today } }),
      Media.countDocuments({
        uploadSource: 'dealer',
        status: 'pending',
        dealer: { $in: dealerIds },
      }),
      Visit.countDocuments({ areaManager: areaManagerId, status: 'completed' }),
      Dealer.find({ areaManager: areaManagerId }).select('dealerName dealerCode city status mobile').sort({ dealerName: 1 }).limit(8).lean(),
      Media.find({ uploadSource: 'dealer', status: 'pending', dealer: { $in: dealerIds } })
        .populate('dealer', 'dealerName dealerCode')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Visit.aggregate([
        {
          $match: {
            areaManager: areaManagerId,
            visitDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Visit.find({ areaManager: areaManagerId })
        .populate('dealer', 'dealerName dealerCode')
        .sort({ visitDate: -1 })
        .limit(6)
        .lean(),
    ]);

  res.json({
    success: true,
    data: {
      cards: { assignedDealers, inactiveDealers, todayVisits, pendingUploads, completedVisits },
      recentVisits,
      myDealers,
      pendingMedia,
      visitTrend,
    },
  });
});

export const getDealerDashboard = asyncHandler(async (req, res) => {
  const dealerId = req.user.dealerRef;
  if (!dealerId) {
    return res.status(403).json({ success: false, message: 'Dealer profile not linked' });
  }

  const dealer = await Dealer.findById(dealerId).populate('areaManager', 'name employeeId mobile email');
  if (!dealer) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  const [approvedMedia, pendingMedia, rejectedMedia, totalVisits, completedVisits, recentMedia, recentVisits] =
    await Promise.all([
      Media.countDocuments({ dealer: dealerId, status: 'approved' }),
      Media.countDocuments({ dealer: dealerId, status: 'pending' }),
      Media.countDocuments({ dealer: dealerId, status: 'rejected' }),
      Visit.countDocuments({ dealer: dealerId }),
      Visit.countDocuments({ dealer: dealerId, status: 'completed' }),
      Media.find({ dealer: dealerId }).sort({ createdAt: -1 }).limit(6).lean(),
      Visit.find({ dealer: dealerId }).sort({ visitDate: -1 }).limit(5).lean(),
    ]);

  res.json({
    success: true,
    data: {
      dealer,
      cards: { approvedMedia, pendingMedia, rejectedMedia, totalVisits, completedVisits },
      recentMedia,
      recentVisits,
    },
  });
});

export const getActivities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, entityType } = req.query;
  const filter = entityType ? { entityType } : {};

  const total = await Activity.countDocuments(filter);
  const activities = await Activity.find(filter)
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, data: activities, total, page: Number(page) });
});

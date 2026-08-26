import Media from '../models/Media.js';
import Dealer from '../models/Dealer.js';
import User from '../models/User.js';
import { asyncHandler, paginate, paginationMeta } from '../utils/helpers.js';
import { logAudit } from '../middleware/auditLog.js';
import { logActivity } from '../utils/activityLogger.js';
import { getFileType } from '../middleware/upload.js';

const getAssignedDealerIds = async (areaManagerRef) => {
  const dealers = await Dealer.find({ areaManager: areaManagerRef }).select('_id');
  return dealers.map((d) => d._id);
};

export const getMedia = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, dealer, status, type, uploadSource, dealerUploadsOnly } = req.query;
  const filter = {};

  if (req.user.role === 'dealer' && req.user.dealerRef) {
    filter.dealer = req.user.dealerRef;
    if (req.query.approvedOnly === 'true') filter.status = 'approved';
  } else if (req.user.role === 'area_manager' && req.user.areaManagerRef) {
    const dealerIds = await getAssignedDealerIds(req.user.areaManagerRef);
    filter.dealer = { $in: dealerIds };
    if (dealerUploadsOnly === 'true') filter.uploadSource = 'dealer';
  }

  if (dealer) filter.dealer = dealer;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (uploadSource) filter.uploadSource = uploadSource;

  const total = await Media.countDocuments(filter);
  const media = await paginate(
    Media.find(filter)
      .populate('dealer', 'dealerName dealerCode')
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 }),
    page,
    limit
  );

  res.json({ success: true, data: media, ...paginationMeta(total, page, limit) });
});

export const uploadMedia = asyncHandler(async (req, res) => {
  if (req.user.role === 'area_manager') {
    return res.status(403).json({ success: false, message: 'Area managers cannot upload. They only approve dealer uploads.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { dealer, description, visit, location } = req.body;
  let dealerId = dealer;
  let uploadSource = 'admin';
  let mediaStatus = 'approved';

  if (req.user.role === 'dealer') {
    if (!req.user.dealerRef) {
      return res.status(403).json({ success: false, message: 'Dealer profile not linked' });
    }
    dealerId = req.user.dealerRef;
    uploadSource = 'dealer';
    mediaStatus = 'pending';
  }

  const dealerDoc = await Dealer.findById(dealerId);
  if (!dealerDoc) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  const media = await Media.create({
    dealer: dealerId,
    uploadedBy: req.user._id,
    type: getFileType(req.file.mimetype),
    url: `/uploads/${req.file.filename}`,
    description,
    location,
    visit: visit || undefined,
    uploadSource,
    status: mediaStatus,
  });

  await logAudit(req, 'upload', 'media', media._id, { uploadSource, status: mediaStatus });
  await logActivity({
    entityType: 'media',
    entityId: media._id,
    action: 'uploaded',
    description: `${uploadSource === 'admin' ? 'Admin post' : 'Dealer upload'} for ${dealerDoc.dealerName}`,
    performedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: media });
});

export const approveMedia = asyncHandler(async (req, res) => {
  const { status, adminComment } = req.body;
  const media = await Media.findById(req.params.id);
  if (!media) {
    return res.status(404).json({ success: false, message: 'Media not found' });
  }

  if (req.user.role === 'area_manager') {
    const dealer = await Dealer.findById(media.dealer);
    if (dealer?.areaManager?.toString() !== req.user.areaManagerRef?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to approve this upload' });
    }
    if (media.uploadSource !== 'dealer') {
      return res.status(403).json({ success: false, message: 'Area managers can only approve dealer uploads' });
    }
    const uploader = await User.findById(media.uploadedBy);
    if (uploader?.role !== 'dealer') {
      return res.status(403).json({ success: false, message: 'Only dealer uploads can be approved by area manager' });
    }
  }

  media.status = status;
  media.adminComment = adminComment;
  await media.save();

  await logAudit(req, status, 'media', media._id, { adminComment, role: req.user.role });
  await logActivity({
    entityType: 'media',
    entityId: media._id,
    action: status,
    description: `Media ${status} by ${req.user.role}`,
    performedBy: req.user._id,
  });

  res.json({ success: true, data: media });
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) {
    return res.status(404).json({ success: false, message: 'Media not found' });
  }

  if (req.user.role === 'dealer') {
    if (media.uploadedBy?.toString() !== req.user._id.toString() || media.status !== 'pending') {
      return res.status(403).json({ success: false, message: 'Can only delete your own pending uploads' });
    }
  } else if (req.user.role === 'area_manager') {
    return res.status(403).json({ success: false, message: 'Area managers cannot delete media' });
  }

  await Media.findByIdAndDelete(req.params.id);
  await logAudit(req, 'delete', 'media', media._id);
  res.json({ success: true, message: 'Media deleted' });
});

import Dealer from '../models/Dealer.js';
import AreaManager from '../models/AreaManager.js';
import AssignmentHistory from '../models/AssignmentHistory.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { asyncHandler, paginate, paginationMeta } from '../utils/helpers.js';
import { logAudit } from '../middleware/auditLog.js';
import { logActivity } from '../utils/activityLogger.js';
import { canAccessDealer } from '../utils/accessControl.js';

const buildDealerProfile = async (dealer, { includeAllMedia = true } = {}) => {
  const mediaFilter = { dealer: dealer._id };
  if (!includeAllMedia) mediaFilter.status = 'approved';

  const [visits, media, activities, assignmentHistory] = await Promise.all([
    (await import('../models/Visit.js')).default.find({ dealer: dealer._id }).sort({ visitDate: -1 }).limit(20),
    (await import('../models/Media.js')).default
      .find(mediaFilter)
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(20),
    (await import('../models/Activity.js')).default
      .find({ entityId: dealer._id })
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(30),
    AssignmentHistory.find({ dealer: dealer._id })
      .populate('fromAreaManager', 'name')
      .populate('toAreaManager', 'name')
      .sort({ createdAt: -1 }),
  ]);

  return { dealer, visits, media, activities, assignmentHistory };
};

const createDealerUser = async (dealer, loginEmail, loginPassword) => {
  const existingUser = await User.findOne({ email: loginEmail });
  if (existingUser) {
    throw new Error('Login email already exists');
  }

  const hashedPassword = await bcrypt.hash(loginPassword, 10);
  const user = await User.create({
    name: dealer.contactPerson || dealer.dealerName,
    email: loginEmail,
    password: hashedPassword,
    role: 'dealer',
    dealerRef: dealer._id,
  });

  return user;
};

export const getDealers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, state, district, status, areaManager } = req.query;
  const filter = {};

  if (req.user.role === 'dealer' && req.user.dealerRef) {
    filter._id = req.user.dealerRef;
  } else if (req.user.role === 'area_manager' && req.user.areaManagerRef) {
    filter.areaManager = req.user.areaManagerRef;
  } else if (areaManager) {
    filter.areaManager = areaManager;
  }

  if (search) {
    filter.$or = [
      { dealerName: { $regex: search, $options: 'i' } },
      { dealerCode: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
    ];
  }
  if (state) filter.state = state;
  if (district) filter.district = district;
  if (status) filter.status = status;

  const total = await Dealer.countDocuments(filter);
  const dealers = await paginate(
    Dealer.find(filter).populate('areaManager', 'name employeeId state district').sort({ createdAt: -1 }).lean(),
    page,
    limit
  );

  res.json({ success: true, data: dealers, ...paginationMeta(total, page, limit) });
});

export const getDealer = asyncHandler(async (req, res) => {
  const dealer = await Dealer.findById(req.params.id).populate('areaManager', 'name employeeId email mobile');
  if (!dealer) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  if (!(await canAccessDealer(req.user, dealer._id))) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this dealer' });
  }

  res.json({ success: true, data: dealer });
});

export const getMyDealerProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== 'dealer' || !req.user.dealerRef) {
    return res.status(403).json({ success: false, message: 'Dealer profile not linked' });
  }

  const dealer = await Dealer.findById(req.user.dealerRef).populate('areaManager', 'name employeeId email mobile');
  if (!dealer) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  const data = await buildDealerProfile(dealer, { includeAllMedia: false });
  res.json({ success: true, data });
});

export const createDealer = asyncHandler(async (req, res) => {
  const { loginEmail, loginPassword, ...dealerData } = req.body;

  if (req.user.role === 'area_manager') {
    if (!req.user.areaManagerRef) {
      return res.status(400).json({ success: false, message: 'Area manager profile is not linked' });
    }
    dealerData.areaManager = req.user.areaManagerRef;
  }

  const existing = await Dealer.findOne({ dealerCode: dealerData.dealerCode });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Dealer code already exists' });
  }

  const dealer = await Dealer.create(dealerData);

  if (loginEmail && loginPassword) {
    try {
      await createDealerUser(dealer, loginEmail, loginPassword);
    } catch (err) {
      await Dealer.findByIdAndDelete(dealer._id);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  await logAudit(req, 'create', 'dealer', dealer._id);
  await logActivity({
    entityType: 'dealer',
    entityId: dealer._id,
    action: 'created',
    description: `Dealer ${dealer.dealerName} created`,
    performedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: dealer });
});

export const updateDealer = asyncHandler(async (req, res) => {
  if (req.user.role === 'dealer') {
    return res.status(403).json({ success: false, message: 'Dealers cannot edit CRM records' });
  }

  let dealer = await Dealer.findById(req.params.id);
  if (!dealer) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  if (!(await canAccessDealer(req.user, dealer._id))) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const payload = { ...req.body };
  if (req.user.role === 'area_manager') {
    delete payload.areaManager;
  }

  dealer = await Dealer.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });

  await logAudit(req, 'update', 'dealer', dealer._id);
  await logActivity({
    entityType: 'dealer',
    entityId: dealer._id,
    action: 'updated',
    description: `Dealer ${dealer.dealerName} updated`,
    performedBy: req.user._id,
  });

  res.json({ success: true, data: dealer });
});

export const deleteDealer = asyncHandler(async (req, res) => {
  const dealer = await Dealer.findById(req.params.id);
  if (!dealer) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  if (!(await canAccessDealer(req.user, dealer._id))) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  await User.deleteMany({ dealerRef: dealer._id, role: 'dealer' });
  await Dealer.findByIdAndDelete(req.params.id);
  await logAudit(req, 'delete', 'dealer', dealer._id);
  res.json({ success: true, message: 'Dealer deleted' });
});

export const assignDealer = asyncHandler(async (req, res) => {
  const { areaManagerId, reason } = req.body;
  const dealer = await Dealer.findById(req.params.id);
  if (!dealer) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  const areaManager = await AreaManager.findById(areaManagerId);
  if (!areaManager) {
    return res.status(404).json({ success: false, message: 'Area Manager not found' });
  }

  const fromAreaManager = dealer.areaManager;
  dealer.areaManager = areaManagerId;
  await dealer.save();

  await AssignmentHistory.create({
    dealer: dealer._id,
    fromAreaManager,
    toAreaManager: areaManagerId,
    assignedBy: req.user._id,
    reason,
  });

  await logAudit(req, 'assign', 'dealer', dealer._id, { areaManagerId });
  await logActivity({
    entityType: 'assignment',
    entityId: dealer._id,
    action: 'assigned',
    description: `Dealer ${dealer.dealerName} assigned to ${areaManager.name}`,
    performedBy: req.user._id,
    metadata: { fromAreaManager, toAreaManager: areaManagerId },
  });

  res.json({ success: true, data: dealer });
});

export const getAssignmentHistory = asyncHandler(async (req, res) => {
  const history = await AssignmentHistory.find({ dealer: req.params.id })
    .populate('fromAreaManager', 'name employeeId')
    .populate('toAreaManager', 'name employeeId')
    .populate('assignedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: history });
});

export const createDealerLogin = asyncHandler(async (req, res) => {
  const { loginEmail, loginPassword } = req.body;
  const dealer = await Dealer.findById(req.params.id);
  if (!dealer) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  if (!(await canAccessDealer(req.user, dealer._id))) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const existingLogin = await User.findOne({ dealerRef: dealer._id, role: 'dealer' });
  if (existingLogin) {
    return res.status(400).json({ success: false, message: 'Dealer login already exists' });
  }

  const user = await createDealerUser(dealer, loginEmail, loginPassword);
  await logAudit(req, 'create_dealer_login', 'dealer', dealer._id, { loginEmail });

  res.status(201).json({
    success: true,
    message: 'Dealer login created',
    data: { email: user.email, dealerId: dealer._id },
  });
});

export const getDealerProfile = asyncHandler(async (req, res) => {
  const dealer = await Dealer.findById(req.params.id).populate('areaManager', 'name employeeId email mobile');
  if (!dealer) {
    return res.status(404).json({ success: false, message: 'Dealer not found' });
  }

  if (!(await canAccessDealer(req.user, dealer._id))) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this dealer' });
  }

  const includeAllMedia = req.user.role !== 'dealer';
  const data = await buildDealerProfile(dealer, { includeAllMedia });

  res.json({ success: true, data });
});

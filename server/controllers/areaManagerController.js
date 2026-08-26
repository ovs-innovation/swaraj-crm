import bcrypt from 'bcryptjs';
import AreaManager from '../models/AreaManager.js';
import User from '../models/User.js';
import Dealer from '../models/Dealer.js';
import { asyncHandler, paginate, paginationMeta } from '../utils/helpers.js';
import { logAudit } from '../middleware/auditLog.js';
import { logActivity } from '../utils/activityLogger.js';

export const getAreaManagers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, state, status } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }
  if (state) filter.state = state;
  if (status) filter.status = status;

  const total = await AreaManager.countDocuments(filter);
  const areaManagers = await paginate(
    AreaManager.find(filter).sort({ createdAt: -1 }),
    page,
    limit
  );

  res.json({ success: true, data: areaManagers, ...paginationMeta(total, page, limit) });
});

export const getAreaManager = asyncHandler(async (req, res) => {
  const areaManager = await AreaManager.findById(req.params.id);
  if (!areaManager) {
    return res.status(404).json({ success: false, message: 'Area Manager not found' });
  }

  const dealerCount = await Dealer.countDocuments({ areaManager: areaManager._id });
  res.json({ success: true, data: { ...areaManager.toObject(), dealerCount } });
});

export const createAreaManager = asyncHandler(async (req, res) => {
  const { employeeId, name, email, mobile, state, district, password } = req.body;

  const existing = await AreaManager.findOne({ $or: [{ email }, { employeeId }] });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email or Employee ID already exists' });
  }

  const hashedPassword = await bcrypt.hash(password || 'password123', 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'area_manager',
  });

  const areaManager = await AreaManager.create({
    employeeId,
    name,
    email,
    mobile,
    state,
    district,
    user: user._id,
  });

  user.areaManagerRef = areaManager._id;
  await user.save();

  await logAudit(req, 'create', 'area_manager', areaManager._id);
  await logActivity({
    entityType: 'area_manager',
    entityId: areaManager._id,
    action: 'created',
    description: `Area Manager ${name} created`,
    performedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: areaManager });
});

export const updateAreaManager = asyncHandler(async (req, res) => {
  let areaManager = await AreaManager.findById(req.params.id);
  if (!areaManager) {
    return res.status(404).json({ success: false, message: 'Area Manager not found' });
  }

  const { name, email, mobile, state, district, status } = req.body;
  areaManager = await AreaManager.findByIdAndUpdate(
    req.params.id,
    { name, email, mobile, state, district, status },
    { new: true, runValidators: true }
  );

  if (areaManager.user) {
    await User.findByIdAndUpdate(areaManager.user, { name, email, status });
  }

  await logAudit(req, 'update', 'area_manager', areaManager._id);
  res.json({ success: true, data: areaManager });
});

export const deleteAreaManager = asyncHandler(async (req, res) => {
  const areaManager = await AreaManager.findById(req.params.id);
  if (!areaManager) {
    return res.status(404).json({ success: false, message: 'Area Manager not found' });
  }

  const assignedDealers = await Dealer.countDocuments({ areaManager: areaManager._id });
  if (assignedDealers > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete. ${assignedDealers} dealers are assigned to this manager.`,
    });
  }

  if (areaManager.user) await User.findByIdAndDelete(areaManager.user);
  await AreaManager.findByIdAndDelete(req.params.id);

  await logAudit(req, 'delete', 'area_manager', areaManager._id);
  res.json({ success: true, message: 'Area Manager deleted' });
});

export const toggleAreaManagerStatus = asyncHandler(async (req, res) => {
  const areaManager = await AreaManager.findById(req.params.id);
  if (!areaManager) {
    return res.status(404).json({ success: false, message: 'Area Manager not found' });
  }

  areaManager.status = areaManager.status === 'active' ? 'inactive' : 'active';
  await areaManager.save();

  if (areaManager.user) {
    await User.findByIdAndUpdate(areaManager.user, { status: areaManager.status });
  }

  await logAudit(req, 'toggle_status', 'area_manager', areaManager._id, { status: areaManager.status });
  res.json({ success: true, data: areaManager });
});

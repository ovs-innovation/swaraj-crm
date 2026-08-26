import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { asyncHandler, paginate, paginationMeta } from '../utils/helpers.js';
import { logAudit } from '../middleware/auditLog.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, status } = req.query;
  const filter = { role: { $in: ['super_admin', 'admin'] } };

  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await paginate(User.find(filter).sort({ createdAt: -1 }), page, limit);
  res.json({ success: true, data: users, ...paginationMeta(total, page, limit) });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!['admin', 'super_admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Only admin or super_admin can be created here' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    status: 'active',
  });

  await logAudit(req, 'create', 'user', user._id, { role });
  res.status(201).json({
    success: true,
    data: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, status } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (!['admin', 'super_admin'].includes(user.role)) {
    return res.status(400).json({ success: false, message: 'This endpoint manages HQ users only' });
  }

  if (user._id.toString() === req.user._id.toString() && role && role !== user.role) {
    return res.status(400).json({ success: false, message: 'You cannot change your own role' });
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (status) user.status = status;
  if (role && ['admin', 'super_admin'].includes(role)) user.role = role;
  if (password) user.password = await bcrypt.hash(password, 10);
  await user.save();

  await logAudit(req, 'update', 'user', user._id);
  res.json({ success: true, data: user });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot deactivate yourself' });
  }

  user.status = user.status === 'active' ? 'inactive' : 'active';
  await user.save();
  await logAudit(req, 'toggle_status', 'user', user._id);
  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot delete yourself' });
  }
  if (!['admin', 'super_admin'].includes(user.role)) {
    return res.status(400).json({ success: false, message: 'This endpoint manages HQ users only' });
  }

  await User.findByIdAndDelete(req.params.id);
  await logAudit(req, 'delete', 'user', user._id);
  res.json({ success: true, message: 'User deleted' });
});

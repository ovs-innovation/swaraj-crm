import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendTokenResponse } from '../utils/generateToken.js';
import { asyncHandler } from '../utils/helpers.js';
import { toPublicUser } from '../utils/publicUser.js';
import { logAudit } from '../middleware/auditLog.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const allowedRoles = ['super_admin', 'admin', 'area_manager', 'dealer'];
  if (!role || !allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Please select a login role' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (user.role !== role) {
    return res.status(403).json({
      success: false,
      message: 'This account does not match the selected role. Choose the correct role and try again.',
    });
  }

  if (user.status !== 'active') {
    return res.status(401).json({ success: false, message: 'Account is inactive' });
  }

  req.user = user;
  logAudit(req, 'login', 'user', user._id, { email });
  sendTokenResponse(user, 200, res);
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').lean();
  if (!user) {
    return res.json({
      success: true,
      user: {
        id: String(req.user._id),
        name: req.user.role,
        email: '',
        role: req.user.role,
        status: req.user.status || 'active',
        areaManagerRef: req.user.areaManagerRef || null,
        dealerRef: req.user.dealerRef || null,
      },
    });
  }
  res.json({ success: true, user: toPublicUser(user) });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'No user found with that email' });
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset token generated',
    resetToken,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  user.password = await bcrypt.hash(req.body.password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { currentPassword, newPassword } = req.body;

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await logAudit(req, 'change_password', 'user', user._id);
  res.json({ success: true, message: 'Password updated successfully' });
});

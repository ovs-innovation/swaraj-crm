import jwt from 'jsonwebtoken';
import { toPublicUser } from './publicUser.js';

export const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      status: user.status || 'active',
      areaManagerRef: user.areaManagerRef || null,
      dealerRef: user.dealerRef || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

export const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user);
  res.status(statusCode).json({
    success: true,
    token,
    user: toPublicUser(user),
  });
};

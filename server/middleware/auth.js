import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
    if (decoded.status && decoded.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    req.user = {
      _id: decoded.id,
      role: decoded.role,
      status: decoded.status || 'active',
      areaManagerRef: decoded.areaManagerRef || null,
      dealerRef: decoded.dealerRef || null,
    };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  const role = req.user.role;
  const allowed = roles.includes(role);
  const hqOverride = role === 'super_admin' && roles.some((r) => r === 'admin' || r === 'super_admin');
  if (!allowed && !hqOverride) {
    return res.status(403).json({
      success: false,
      message: `Role ${role} is not authorized`,
    });
  }
  next();
};

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';

/** Customer JWT (payload: { id }) from /api/auth/login */
async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Login required' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    const userId = decoded.id;
    if (!userId || decoded.role === 'admin') {
      return res.status(401).json({ message: 'Invalid token for this action' });
    }
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = header.split(' ')[1];
  jwt.verify(token, JWT_SECRET(), async (err, decoded) => {
    if (err || !decoded?.id || decoded.role === 'admin') {
      req.user = null;
      return next();
    }
    try {
      const user = await User.findById(decoded.id).select('-password');
      req.user = user || null;
    } catch {
      req.user = null;
    }
    next();
  });
}

function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.adminId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}

module.exports = { authAdmin, protect, optionalAuth, adminOnly };

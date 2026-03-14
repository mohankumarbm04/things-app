'use strict';

const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Protect routes — validates JWT, attaches req.user
 */
const protect = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // 2. Verify JWT
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    // 3. Check user still exists and is active
    const user = await User.findById(decoded.sub).select('+passwordChangedAt +isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    // 4. Check password wasn't changed after token was issued
    if (user.passwordChangedAfter(decoded.iat)) {
      return res.status(401).json({ success: false, message: 'Password changed, please log in again' });
    }

    // 5. Update lastSeen (non-blocking)
    User.findByIdAndUpdate(user._id, { lastSeen: new Date() }).exec();

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional auth — attach user if token present, continue either way
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.user = await User.findById(decoded.sub);
    }
  } catch {}
  next();
};

module.exports = { protect, optionalAuth };

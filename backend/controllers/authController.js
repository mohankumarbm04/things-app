'use strict';

const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken, hashToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

// Helper: send token response
const sendTokenResponse = async (user, statusCode, res, req) => {
  const { accessToken, refreshToken } = generateTokenPair(user._id);

  // Store hashed refresh token
  user.addRefreshToken(
    hashToken(refreshToken),
    req.headers['user-agent'] || 'unknown',
    req.ip
  );
  await user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toSafeObject(),
  });
};

// ── Register ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, timezone } = req.body;

    // Check duplicate
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, timezone });

    // Send verification email (non-blocking)
    try {
      const verifyToken = crypto.randomBytes(32).toString('hex');
      user.emailVerifyToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
      await user.save({ validateBeforeSave: false });
      await sendEmail({
        to: user.email,
        subject: 'Verify your THINGS account',
        template: 'verify-email',
        data: { name: user.name, url: `${process.env.CLIENT_URL}/verify/${verifyToken}` },
      });
    } catch (emailErr) {
      logger.warn('Verification email failed:', emailErr.message);
    }

    await sendTokenResponse(user, 201, res, req);
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Fetch user with sensitive fields
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +loginAttempts +lockUntil +isActive +refreshTokens');

    // Account not found → same response as wrong password (prevent enumeration)
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check account lock
    if (user.isLocked) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minute(s).`,
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      logger.warn(`Failed login attempt for ${email} from ${req.ip}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset attempts on success
    await user.resetLoginAttempts();

    await sendTokenResponse(user, 200, res, req);
  } catch (err) {
    next(err);
  }
};

// ── Refresh Token ─────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.sub).select('+refreshTokens +isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Verify stored hashed token
    const hashedIncoming = hashToken(refreshToken);
    const stored = user.refreshTokens.find(t =>
      t.token === hashedIncoming && t.expiresAt > new Date()
    );
    if (!stored) {
      // Possible token reuse — invalidate all sessions
      user.refreshTokens = [];
      await user.save({ validateBeforeSave: false });
      logger.warn(`Potential refresh token reuse detected for user ${user._id}`);
      return res.status(401).json({ success: false, message: 'Session revoked. Please log in again.' });
    }

    // Rotate: remove old, issue new
    user.removeRefreshToken(hashedIncoming);
    await sendTokenResponse(user, 200, res, req);
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const user = await User.findById(req.user._id).select('+refreshTokens');
      if (user) {
        user.removeRefreshToken(hashToken(refreshToken));
        await user.save({ validateBeforeSave: false });
      }
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Logout All Devices ────────────────────────────────────────
exports.logoutAll = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshTokens: [] });
    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (err) {
    next(err);
  }
};

// ── Get Current User ──────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

// ── Update Profile ────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'theme', 'timezone', 'notifications'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true, runValidators: true,
    });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ── Change Password ───────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password +refreshTokens');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    await sendTokenResponse(user, 200, res, req);
  } catch (err) {
    next(err);
  }
};

// ── Forgot Password ───────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    // Always respond success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const token = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your THINGS password',
        template: 'reset-password',
        data: { name: user.name, url: `${process.env.CLIENT_URL}/reset-password/${token}` },
      });
    } catch (emailErr) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new Error('Email could not be sent'));
    }

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ── Reset Password ────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+refreshTokens');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token invalid or expired' });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    await sendTokenResponse(user, 200, res, req);
  } catch (err) {
    next(err);
  }
};

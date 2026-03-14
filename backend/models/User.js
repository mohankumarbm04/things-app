'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    match: [/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    maxlength: [254, 'Email too long'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Never return password in queries
  },
  avatar: { type: String, default: null },
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },

  // Push notification subscription
  pushSubscription: {
    endpoint: String,
    keys: { p256dh: String, auth: String },
  },

  // Notification preferences
  notifications: {
    habitReminders: { type: Boolean, default: true },
    focusAlerts: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: true },
    reminderTime: { type: String, default: '08:00' }, // HH:MM
  },

  // Security fields
  refreshTokens: [{
    token: { type: String, select: false },
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    userAgent: String,
    ip: String,
  }],
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
  passwordChangedAt: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String, select: false },
  isActive: { type: Boolean, default: true, select: false },
  lastSeen: { type: Date, default: Date.now },
  timezone: { type: String, default: 'Asia/Kolkata' },

}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ 'refreshTokens.token': 1 });

// ── Virtual: account locked ────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Pre-save: hash password ────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ── Method: compare password ───────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Method: check if password changed after JWT issued ─────────
userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (!this.passwordChangedAt) return false;
  return this.passwordChangedAt.getTime() / 1000 > jwtIssuedAt;
};

// ── Method: increment login attempts (brute-force protection) ──
userSchema.methods.incLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

// ── Method: reset login attempts on success ─────────────────────
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
};

// ── Method: generate password reset token ──────────────────────
userSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return token;
};

// ── Method: add refresh token ──────────────────────────────────
userSchema.methods.addRefreshToken = function (token, userAgent, ip) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  // Keep max 5 sessions per user
  if (this.refreshTokens.length >= 5) this.refreshTokens.shift();
  this.refreshTokens.push({ token, expiresAt, userAgent, ip });
};

// ── Method: remove refresh token (logout) ─────────────────────
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
};

// ── Method: safe user object (no sensitive fields) ─────────────
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    theme: this.theme,
    notifications: this.notifications,
    emailVerified: this.emailVerified,
    timezone: this.timezone,
    createdAt: this.createdAt,
    lastSeen: this.lastSeen,
  };
};

module.exports = mongoose.model('User', userSchema);

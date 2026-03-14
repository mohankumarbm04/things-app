'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('./logger');

// ── Token Generation ──────────────────────────────────────────
const signAccessToken = (userId) =>
  jwt.sign({ sub: userId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256',
    issuer: 'things-app',
    audience: 'things-client',
  });

const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    algorithm: 'HS256',
    issuer: 'things-app',
    audience: 'things-client',
  });

// Hash refresh token before storing (so DB leak doesn't expose tokens)
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateTokenPair = (userId) => ({
  accessToken: signAccessToken(userId),
  refreshToken: signRefreshToken(userId),
});

// ── Verify Access Token ────────────────────────────────────────
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'things-app',
    audience: 'things-client',
  });

// ── Verify Refresh Token ───────────────────────────────────────
const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: 'things-app',
    audience: 'things-client',
  });

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
};

'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authCtrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

// Validators
const registerRules = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 chars')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 chars')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password needs upper, lower and number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

// ── Public routes ─────────────────────────────────────────────
router.post('/register', authLimiter, registerRules, authCtrl.register);
router.post('/login',    authLimiter, loginRules,    authCtrl.login);
router.post('/refresh',  authLimiter,                authCtrl.refreshToken);
router.post('/forgot-password', authLimiter,
  body('email').isEmail().normalizeEmail(), authCtrl.forgotPassword);
router.post('/reset-password/:token', authLimiter,
  body('password').isLength({ min: 8 }), authCtrl.resetPassword);

// ── Protected routes ──────────────────────────────────────────
router.use(protect);
router.get('/me',           authCtrl.getMe);
router.patch('/profile',    authCtrl.updateProfile);
router.post('/logout',      authCtrl.logout);
router.post('/logout-all',  authCtrl.logoutAll);
router.patch('/password',   authCtrl.changePassword);

module.exports = router;

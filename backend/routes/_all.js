'use strict';

// ╔═══════════════════════════════════════╗
// ║  Moods, Expenses, Focus, Workouts,    ║
// ║  Notifications, Analytics routes      ║
// ╚═══════════════════════════════════════╝

const router = require('express').Router;
const { protect } = require('../middleware/auth');
const { Mood, Expense, Focus, Workout } = require('../models');
const webpush = require('web-push');
const User = require('../models/User');
const logger = require('../utils/logger');

// ── Moods ─────────────────────────────────────────────────────
const moodRouter = router();
moodRouter.use(protect);

moodRouter.get('/', async (req, res, next) => {
  try {
    const { limit = 30, from, to } = req.query;
    const filter = { user: req.user._id };
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = from;
    if (to)   filter.date.$lte = to;
    const moods = await Mood.find(filter).sort({ date: -1 }).limit(parseInt(limit));
    res.json({ success: true, moods });
  } catch (err) { next(err); }
});

moodRouter.post('/', async (req, res, next) => {
  try {
    const { score, emoji, label, note, tags, energy, stress, sleep, date } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const existing = await Mood.findOne({ user: req.user._id, date: today });
    if (existing) {
      Object.assign(existing, { score, emoji, label, note, tags, energy, stress, sleep });
      await existing.save();
      return res.json({ success: true, mood: existing, updated: true });
    }
    const mood = await Mood.create({ user: req.user._id, date: today, score, emoji, label, note, tags, energy, stress, sleep });
    res.status(201).json({ success: true, mood });
  } catch (err) { next(err); }
});

moodRouter.delete('/:id', async (req, res, next) => {
  try {
    await Mood.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Expenses ──────────────────────────────────────────────────
const expenseRouter = router();
expenseRouter.use(protect);

expenseRouter.get('/', async (req, res, next) => {
  try {
    const { limit = 50, from, to, category } = req.query;
    const filter = { user: req.user._id };
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = from;
    if (to)   filter.date.$lte = to;
    if (category) filter.category = category;
    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1, createdAt: -1 }).limit(parseInt(limit)),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);
    res.json({ success: true, expenses, total: total[0]?.total || 0 });
  } catch (err) { next(err); }
});

expenseRouter.post('/', async (req, res, next) => {
  try {
    const { amount, category, description, date, tags, isRecurring } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });
    const expense = await Expense.create({
      user: req.user._id, amount, category, description,
      date: date || new Date().toISOString().split('T')[0],
      tags, isRecurring,
      icon: ({ food:'🍔', transport:'🚗', shopping:'🛍️', entertainment:'🎬', health:'💊', education:'📚', utilities:'⚡', rent:'🏠', investment:'📈', other:'📦' })[category] || '📦',
    });
    res.status(201).json({ success: true, expense });
  } catch (err) { next(err); }
});

expenseRouter.delete('/:id', async (req, res, next) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) { next(err); }
});

expenseRouter.get('/summary', async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const start = `${year}-${String(month).padStart(2,'0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    const breakdown = await Expense.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    const total = breakdown.reduce((s, b) => s + b.total, 0);
    res.json({ success: true, breakdown, total, period: { start, end } });
  } catch (err) { next(err); }
});

// ── Focus ─────────────────────────────────────────────────────
const focusRouter = router();
focusRouter.use(protect);

focusRouter.get('/', async (req, res, next) => {
  try {
    const { limit = 30, from, to } = req.query;
    const filter = { user: req.user._id };
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = from;
    if (to)   filter.date.$lte = to;
    const sessions = await Focus.find(filter).sort({ date: -1 }).limit(parseInt(limit));
    res.json({ success: true, sessions });
  } catch (err) { next(err); }
});

focusRouter.post('/', async (req, res, next) => {
  try {
    const { duration, type, task, completed, distractions, startTime, endTime } = req.body;
    const session = await Focus.create({
      user: req.user._id,
      date: new Date().toISOString().split('T')[0],
      duration, type, task, completed, distractions, startTime, endTime,
    });
    res.status(201).json({ success: true, session });
  } catch (err) { next(err); }
});

// ── Workouts ──────────────────────────────────────────────────
const workoutRouter = router();
workoutRouter.use(protect);

workoutRouter.get('/', async (req, res, next) => {
  try {
    const { limit = 30, from, to } = req.query;
    const filter = { user: req.user._id };
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = from;
    if (to)   filter.date.$lte = to;
    const workouts = await Workout.find(filter).sort({ date: -1 }).limit(parseInt(limit));
    res.json({ success: true, workouts });
  } catch (err) { next(err); }
});

workoutRouter.post('/', async (req, res, next) => {
  try {
    const { type, duration, calories, distance, notes, heartRate } = req.body;
    const workout = await Workout.create({
      user: req.user._id,
      date: new Date().toISOString().split('T')[0],
      type, duration, calories, distance, notes, heartRate,
    });
    res.status(201).json({ success: true, workout });
  } catch (err) { next(err); }
});

// ── Notifications ─────────────────────────────────────────────
const notifRouter = router();
notifRouter.use(protect);

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// Subscribe to push notifications
notifRouter.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription' });
    }
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    // Send test notification
    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: 'THINGS',
        body: '🎉 Notifications enabled! We\'ll remind you to stay on track.',
        icon: '/icon-192.png',
      }));
    } catch {}
    res.json({ success: true, message: 'Subscribed to notifications' });
  } catch (err) { next(err); }
});

notifRouter.delete('/subscribe', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { pushSubscription: 1 } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

notifRouter.get('/vapid-key', (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// ── Analytics ─────────────────────────────────────────────────
const analyticsRouter = router();
analyticsRouter.use(protect);

analyticsRouter.get('/overview', async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    const sinceStr = since.toISOString().split('T')[0];
    const userId = req.user._id;

    const [habits, moods, expenses, focus, workouts] = await Promise.all([
      require('../models/Habit').find({ user: userId, isArchived: false }),
      Mood.find({ user: userId, date: { $gte: sinceStr } }),
      Expense.find({ user: userId, date: { $gte: sinceStr } }),
      Focus.find({ user: userId, date: { $gte: sinceStr } }),
      Workout.find({ user: userId, date: { $gte: sinceStr } }),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const completedToday = habits.filter(h => h.completions.some(c => c.date === today)).length;
    const habitScore = habits.length ? Math.round((completedToday / habits.length) * 100) : 0;
    const avgMood = moods.length ? moods.reduce((s, m) => s + m.score, 0) / moods.length : 0;
    const moodScore = Math.round((avgMood / 5) * 100);
    const focusMins = focus.reduce((s, f) => s + (f.duration || 0), 0);
    const focusScore = Math.min(100, Math.round((focusMins / (days * 120)) * 100));
    const workoutDays = new Set(workouts.map(w => w.date)).size;
    const workoutScore = Math.round((workoutDays / parseInt(days)) * 100);

    const lifeScore = Math.round(
      habitScore * 0.35 + moodScore * 0.25 + focusScore * 0.25 + workoutScore * 0.15
    );

    res.json({
      success: true,
      overview: {
        lifeScore,
        habits: { completedToday, total: habits.length, rate: habitScore },
        mood: { avg: parseFloat(avgMood.toFixed(1)), score: moodScore },
        focus: { totalMinutes: focusMins, sessions: focus.length, score: focusScore },
        workout: { sessions: workouts.length, days: workoutDays, score: workoutScore },
        expenses: { total: expenses.reduce((s, e) => s + e.amount, 0), count: expenses.length },
      },
    });
  } catch (err) { next(err); }
});

module.exports = {
  moodRoutes: moodRouter,
  expenseRoutes: expenseRouter,
  focusRoutes: focusRouter,
  workoutRoutes: workoutRouter,
  notifRoutes: notifRouter,
  analyticsRoutes: analyticsRouter,
};

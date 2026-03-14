'use strict';

const Habit = require('../models/Habit');

// ── GET /habits ───────────────────────────────────────────────
exports.getHabits = async (req, res, next) => {
  try {
    const { archived = false } = req.query;
    const habits = await Habit.find({ user: req.user._id, isArchived: archived === 'true' })
      .sort({ order: 1, createdAt: 1 });
    res.json({ success: true, count: habits.length, habits });
  } catch (err) { next(err); }
};

// ── GET /habits/:id ───────────────────────────────────────────
exports.getHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    res.json({ success: true, habit });
  } catch (err) { next(err); }
};

// ── POST /habits ──────────────────────────────────────────────
exports.createHabit = async (req, res, next) => {
  try {
    const { name, description, icon, color, category, frequency, reminderTime } = req.body;
    const count = await Habit.countDocuments({ user: req.user._id, isArchived: false });
    if (count >= 50) return res.status(400).json({ success: false, message: 'Max 50 active habits' });
    const habit = await Habit.create({
      user: req.user._id, name, description, icon, color, category, frequency, reminderTime,
      order: count,
    });
    res.status(201).json({ success: true, habit });
  } catch (err) { next(err); }
};

// ── PATCH /habits/:id ─────────────────────────────────────────
exports.updateHabit = async (req, res, next) => {
  try {
    const allowed = ['name','description','icon','color','category','frequency','reminderTime','order','isArchived'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, updates, { new: true, runValidators: true }
    );
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    res.json({ success: true, habit });
  } catch (err) { next(err); }
};

// ── DELETE /habits/:id ────────────────────────────────────────
exports.deleteHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    res.json({ success: true, message: 'Habit deleted' });
  } catch (err) { next(err); }
};

// ── POST /habits/:id/complete ─────────────────────────────────
exports.completeHabit = async (req, res, next) => {
  try {
    const { date, note } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    const completed = habit.completeForDate(today, note);
    if (!completed) return res.status(409).json({ success: false, message: 'Already completed for this date' });
    await habit.save();
    res.json({ success: true, habit, message: '🎉 Habit completed!' });
  } catch (err) { next(err); }
};

// ── DELETE /habits/:id/complete ───────────────────────────────
exports.undoHabit = async (req, res, next) => {
  try {
    const { date } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    habit.undoForDate(today);
    await habit.save();
    res.json({ success: true, habit });
  } catch (err) { next(err); }
};

// ── GET /habits/stats ─────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const habits = await Habit.find({ user: req.user._id, isArchived: false });
    const today = new Date().toISOString().split('T')[0];
    const completedToday = habits.filter(h => h.completions.some(c => c.date === today)).length;
    res.json({
      success: true,
      stats: {
        total: habits.length,
        completedToday,
        completionRate: habits.length ? Math.round((completedToday / habits.length) * 100) : 0,
        longestStreak: Math.max(0, ...habits.map(h => h.longestStreak)),
        totalCompletions: habits.reduce((s, h) => s + h.totalCompletions, 0),
      },
    });
  } catch (err) { next(err); }
};

// ── Routes ────────────────────────────────────────────────────
const router = require('express').Router();
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/stats', exports.getStats);
router.route('/').get(exports.getHabits).post(exports.createHabit);
router.route('/:id').get(exports.getHabit).patch(exports.updateHabit).delete(exports.deleteHabit);
router.post('/:id/complete', exports.completeHabit);
router.delete('/:id/complete', exports.undoHabit);
module.exports = router;

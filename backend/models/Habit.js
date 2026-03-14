'use strict';

const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema({
  date: { type: String, required: true },       // 'YYYY-MM-DD'
  completedAt: { type: Date, default: Date.now },
  note: { type: String, maxlength: 200 },
}, { _id: false });

const habitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [80, 'Habit name too long'],
  },
  description: { type: String, trim: true, maxlength: [300, 'Description too long'] },
  icon: { type: String, default: '✓' },
  color: { type: String, default: '#6366F1' },
  category: {
    type: String,
    enum: ['health', 'mind', 'learning', 'social', 'creative', 'finance', 'other'],
    default: 'other',
  },
  frequency: {
    type: { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
    days: [{ type: Number, min: 0, max: 6 }], // 0=Sun..6=Sat for custom
    timesPerWeek: { type: Number, min: 1, max: 7, default: 7 },
  },
  reminderTime: { type: String, default: null }, // 'HH:MM' or null
  completions: { type: [completionSchema], default: [] },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  totalCompletions: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────
habitSchema.index({ user: 1, isArchived: 1 });
habitSchema.index({ user: 1, 'completions.date': 1 });

// ── Virtual: completed today ───────────────────────────────────
habitSchema.virtual('completedToday').get(function () {
  const today = new Date().toISOString().split('T')[0];
  return this.completions.some(c => c.date === today);
});

// ── Method: complete habit for a date ─────────────────────────
habitSchema.methods.completeForDate = function (date, note = '') {
  const existing = this.completions.find(c => c.date === date);
  if (existing) return false; // Already completed
  this.completions.push({ date, note, completedAt: new Date() });
  this.totalCompletions += 1;
  this._recalcStreak();
  return true;
};

// ── Method: undo completion ───────────────────────────────────
habitSchema.methods.undoForDate = function (date) {
  const idx = this.completions.findIndex(c => c.date === date);
  if (idx === -1) return false;
  this.completions.splice(idx, 1);
  this.totalCompletions = Math.max(0, this.totalCompletions - 1);
  this._recalcStreak();
  return true;
};

// ── Method: recalculate streak ────────────────────────────────
habitSchema.methods._recalcStreak = function () {
  const dates = [...new Set(this.completions.map(c => c.date))].sort().reverse();
  let streak = 0;
  let check = new Date();
  check.setHours(0, 0, 0, 0);

  for (const d of dates) {
    const checkStr = check.toISOString().split('T')[0];
    if (d === checkStr) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  this.currentStreak = streak;
  if (streak > this.longestStreak) this.longestStreak = streak;
};

module.exports = mongoose.model('Habit', habitSchema);

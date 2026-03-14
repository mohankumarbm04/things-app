'use strict';
const mongoose = require('mongoose');

// ── Mood ──────────────────────────────────────────────────────
const moodSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:  { type: String, required: true },          // 'YYYY-MM-DD'
  score: { type: Number, required: true, min: 1, max: 5 },
  emoji: { type: String, required: true },
  label: { type: String, required: true },
  note:  { type: String, trim: true, maxlength: 500 },
  tags:  [{ type: String, trim: true, maxlength: 30 }],
  energy:   { type: Number, min: 1, max: 5 },
  stress:   { type: Number, min: 1, max: 5 },
  sleep:    { type: Number, min: 0, max: 24 },   // hours slept
}, { timestamps: true });
moodSchema.index({ user: 1, date: -1 });
moodSchema.index({ user: 1, date: 1 }, { unique: true });

// ── Expense ───────────────────────────────────────────────────
const expenseSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount:   { type: Number, required: true, min: 0.01, max: 10000000 },
  currency: { type: String, default: 'INR', maxlength: 3 },
  category: {
    type: String,
    required: true,
    enum: ['food', 'transport', 'shopping', 'entertainment', 'health',
           'education', 'utilities', 'rent', 'investment', 'other'],
  },
  description: { type: String, required: true, trim: true, maxlength: 200 },
  date:        { type: String, required: true },   // 'YYYY-MM-DD'
  icon:        { type: String },
  tags:        [{ type: String, trim: true, maxlength: 30 }],
  isRecurring: { type: Boolean, default: false },
  receipt:     { type: String },                   // URL
}, { timestamps: true });
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });

// ── Focus Session ─────────────────────────────────────────────
const focusSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:         { type: String, required: true },
  duration:     { type: Number, required: true, min: 1 },   // minutes
  type:         { type: String, enum: ['pomodoro', 'custom', 'deep'], default: 'pomodoro' },
  completed:    { type: Boolean, default: true },
  task:         { type: String, trim: true, maxlength: 200 },
  startTime:    { type: Date },
  endTime:      { type: Date },
  distractions: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
focusSchema.index({ user: 1, date: -1 });

// ── Workout ───────────────────────────────────────────────────
const workoutSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:     { type: String, required: true },
  type:     {
    type: String,
    enum: ['run', 'walk', 'cycle', 'swim', 'gym', 'yoga', 'hiit', 'sport', 'other'],
    default: 'other',
  },
  duration: { type: Number, required: true, min: 1 },      // minutes
  calories: { type: Number, min: 0 },
  distance: { type: Number, min: 0 },                      // km
  unit:     { type: String, enum: ['km', 'mi'], default: 'km' },
  notes:    { type: String, trim: true, maxlength: 300 },
  heartRate: {
    avg: { type: Number, min: 0, max: 250 },
    max: { type: Number, min: 0, max: 250 },
  },
}, { timestamps: true });
workoutSchema.index({ user: 1, date: -1 });

module.exports = {
  Mood:    mongoose.model('Mood', moodSchema),
  Expense: mongoose.model('Expense', expenseSchema),
  Focus:   mongoose.model('Focus', focusSchema),
  Workout: mongoose.model('Workout', workoutSchema),
};

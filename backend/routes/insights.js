'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const { protect } = require('../middleware/auth');
const Habit = require('../models/Habit');
const { Mood, Expense, Focus, Workout } = require('../models');
const logger = require('../utils/logger');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Rate limit AI calls specifically — expensive!
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'AI insight limit reached. Try again in an hour.' },
});

router.use(protect);

// ── GET /insights ─────────────────────────────────────────────
// Generate personalized AI insights based on real user data
router.get('/', aiLimiter, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const days = 14; // Analyse last 2 weeks
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    // Fetch user data in parallel
    const [habits, moods, expenses, focusSessions, workouts] = await Promise.all([
      Habit.find({ user: userId, isArchived: false }),
      Mood.find({ user: userId, date: { $gte: sinceStr } }).sort({ date: 1 }),
      Expense.find({ user: userId, date: { $gte: sinceStr } }).sort({ date: 1 }),
      Focus.find({ user: userId, date: { $gte: sinceStr } }).sort({ date: 1 }),
      Workout.find({ user: userId, date: { $gte: sinceStr } }).sort({ date: 1 }),
    ]);

    // Build summary for the AI
    const today = new Date().toISOString().split('T')[0];
    const habitSummary = habits.map(h => ({
      name: h.name,
      category: h.category,
      streak: h.currentStreak,
      totalCompletions: h.totalCompletions,
      completedToday: h.completions.some(c => c.date === today),
    }));

    const moodSummary = moods.map(m => ({
      date: m.date, score: m.score, label: m.label,
      sleep: m.sleep, energy: m.energy, stress: m.stress,
    }));

    const expenseSummary = expenses.map(e => ({
      date: e.date, amount: e.amount, category: e.category,
    }));

    const focusSummary = focusSessions.map(f => ({
      date: f.date, duration: f.duration, completed: f.completed,
      startTime: f.startTime,
    }));

    const workoutSummary = workouts.map(w => ({
      date: w.date, type: w.type, duration: w.duration, calories: w.calories,
    }));

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const avgMood = moods.length
      ? (moods.reduce((s, m) => s + m.score, 0) / moods.length).toFixed(1) : null;
    const totalFocusMins = focusSessions.reduce((s, f) => s + (f.duration || 0), 0);

    const prompt = `You are an AI life coach analyzing ${days} days of data for a user.
Generate 4–6 personalized, specific, actionable insights.

USER DATA SUMMARY:
- Habits (${habitSummary.length} total): ${JSON.stringify(habitSummary)}
- Mood logs (${moodSummary.length} entries, avg score ${avgMood}/5): ${JSON.stringify(moodSummary)}
- Expenses (${expenseSummary.length} entries, total ₹${totalExpenses.toFixed(0)}): ${JSON.stringify(expenseSummary)}
- Focus sessions (${focusSummary.length} sessions, ${totalFocusMins} total mins): ${JSON.stringify(focusSummary)}
- Workouts (${workoutSummary.length} sessions): ${JSON.stringify(workoutSummary)}

Respond ONLY with a valid JSON array. Each item must have:
- "icon": single emoji
- "category": one of "habit", "mood", "expense", "focus", "workout", "sleep", "general"
- "title": short bold title (max 6 words)
- "insight": specific observation from the data (1–2 sentences)
- "action": concrete suggestion (1 sentence)
- "priority": "high" | "medium" | "low"

Be data-driven and specific. Reference actual numbers, dates, patterns. Do not make up data.
Example format: [{"icon":"🌙","category":"focus","title":"Peak focus window","insight":"...","action":"...","priority":"high"}]`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();
    let insights;
    try {
      // Extract JSON array if wrapped in markdown
      const match = raw.match(/\[[\s\S]*\]/);
      insights = JSON.parse(match ? match[0] : raw);
    } catch {
      logger.warn('AI response parse error:', raw);
      insights = [{ icon: '✦', category: 'general', title: 'Keep going!', insight: 'Great job tracking your life consistently.', action: 'Log more data to unlock deeper insights.', priority: 'low' }];
    }

    res.json({ success: true, insights, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error('AI insights error:', err.message);
    next(err);
  }
});

// ── POST /insights/chat ───────────────────────────────────────
// Conversational AI life coach
router.post('/chat', aiLimiter, async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || message.length > 500) {
      return res.status(400).json({ success: false, message: 'Message required (max 500 chars)' });
    }

    const systemPrompt = `You are THINGS AI, a personal life coach integrated into a life management app.
You help users with habits, mood, productivity, finances, fitness and wellbeing.
Be encouraging, specific, and practical. Keep responses concise (2–4 sentences max).
User: ${req.user.name}`;

    const messages = [
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    res.json({
      success: true,
      reply: response.content[0].text,
      usage: response.usage,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

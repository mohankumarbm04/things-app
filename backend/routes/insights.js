"use strict";

const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const https = require("https");
const { protect } = require("../middleware/auth");
const Habit = require("../models/Habit");
const { Mood, Expense, Focus, Workout } = require("../models");
const logger = require("../utils/logger");

// ── Gemini API helper ─────────────────────────────────────────
const geminiRequest = (prompt, maxTokens = 1024) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
};

// Rate limit AI calls
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "AI insight limit reached. Try again in an hour.",
  },
});

router.use(protect);

// ── GET /insights ─────────────────────────────────────────────
router.get("/", aiLimiter, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const days = 14;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const [habits, moods, expenses, focusSessions, workouts] =
      await Promise.all([
        Habit.find({ user: userId, isArchived: false }),
        Mood.find({ user: userId, date: { $gte: sinceStr } }).sort({ date: 1 }),
        Expense.find({ user: userId, date: { $gte: sinceStr } }).sort({
          date: 1,
        }),
        Focus.find({ user: userId, date: { $gte: sinceStr } }).sort({
          date: 1,
        }),
        Workout.find({ user: userId, date: { $gte: sinceStr } }).sort({
          date: 1,
        }),
      ]);

    const today = new Date().toISOString().split("T")[0];
    const habitSummary = habits.map((h) => ({
      name: h.name,
      category: h.category,
      streak: h.currentStreak,
      totalCompletions: h.totalCompletions,
      completedToday: h.completions.some((c) => c.date === today),
    }));

    const avgMood = moods.length
      ? (moods.reduce((s, m) => s + m.score, 0) / moods.length).toFixed(1)
      : null;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalFocusMins = focusSessions.reduce(
      (s, f) => s + (f.duration || 0),
      0,
    );

    const prompt = `You are an AI life coach analyzing ${days} days of data for a user.
Generate 4-6 personalized, specific, actionable insights.

USER DATA SUMMARY:
- Habits (${habitSummary.length} total): ${JSON.stringify(habitSummary)}
- Mood logs (${moods.length} entries, avg score ${avgMood}/5): ${JSON.stringify(moods.map((m) => ({ date: m.date, score: m.score, label: m.label })))}
- Expenses (${expenses.length} entries, total ₹${totalExpenses.toFixed(0)}): ${JSON.stringify(expenses.map((e) => ({ date: e.date, amount: e.amount, category: e.category })))}
- Focus sessions (${focusSessions.length} sessions, ${totalFocusMins} total mins): ${JSON.stringify(focusSessions.map((f) => ({ date: f.date, duration: f.duration })))}
- Workouts (${workouts.length} sessions): ${JSON.stringify(workouts.map((w) => ({ date: w.date, type: w.type, duration: w.duration })))}

Respond ONLY with a valid JSON array, no markdown, no explanation. Each item must have:
- "icon": single emoji
- "category": one of "habit", "mood", "expense", "focus", "workout", "sleep", "general"
- "title": short title (max 6 words)
- "insight": specific observation from the data (1-2 sentences)
- "action": concrete suggestion (1 sentence)
- "priority": "high" | "medium" | "low"

Example: [{"icon":"🌙","category":"focus","title":"Peak focus window","insight":"...","action":"...","priority":"high"}]`;

    const raw = await geminiRequest(prompt, 1024);

    let insights;
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      insights = JSON.parse(match ? match[0] : raw);
    } catch {
      logger.warn("AI response parse error:", raw);
      insights = [
        {
          icon: "✦",
          category: "general",
          title: "Keep going!",
          insight: "Great job tracking your life consistently.",
          action: "Log more data to unlock deeper insights.",
          priority: "low",
        },
      ];
    }

    res.json({
      success: true,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("AI insights error:", err.message);
    next(err);
  }
});

// ── POST /insights/chat ───────────────────────────────────────
router.post("/chat", aiLimiter, async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || message.length > 500) {
      return res
        .status(400)
        .json({ success: false, message: "Message required (max 500 chars)" });
    }

    const systemContext = `You are THINGS AI, a personal life coach integrated into a life management app.
You help users with habits, mood, productivity, finances, fitness and wellbeing.
Be encouraging, specific, and practical. Keep responses concise (2-4 sentences max).
User: ${req.user.name}`;

    // Build conversation history for Gemini
    const contents = [
      { role: "user", parts: [{ text: systemContext }] },
      {
        role: "model",
        parts: [
          {
            text: "Got it! I am THINGS AI, your personal life coach. How can I help you today?",
          },
        ],
      },
      ...history.slice(-10).map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const apiKey = process.env.GEMINI_API_KEY;
    const body = JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: 300, temperature: 0.8 },
    });

    const reply = await new Promise((resolve, reject) => {
      const options = {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      };
      const req2 = https.request(options, (res2) => {
        let data = "";
        res2.on("data", (chunk) => (data += chunk));
        res2.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));
            resolve(
              parsed.candidates?.[0]?.content?.parts?.[0]?.text ||
                "I am here to help!",
            );
          } catch (e) {
            reject(e);
          }
        });
      });
      req2.on("error", reject);
      req2.write(body);
      req2.end();
    });

    res.json({ success: true, reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

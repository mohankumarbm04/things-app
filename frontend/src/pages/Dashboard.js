import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useAuth } from "../context/AuthContext";
import LifeScoreSphere from "../components/dashboard/LifeScoreSphere";
import PomodoroTimer from "../components/focus/PomodoroTimer";
import {
  habitsApi,
  moodsApi,
  expensesApi,
  analyticsApi,
  insightsApi,
} from "../services/api";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

const MOODS = [
  { score: 1, emoji: "😞", label: "Sad" },
  { score: 2, emoji: "😐", label: "Meh" },
  { score: 3, emoji: "🙂", label: "Good" },
  { score: 4, emoji: "😄", label: "Great" },
  { score: 5, emoji: "🚀", label: "Epic" },
];

const CAT_ICONS = {
  health: "🏃",
  mind: "🧘",
  learning: "📚",
  social: "👥",
  creative: "🎨",
  finance: "💰",
  other: "✓",
};
const EXP_ICONS = {
  food: "🍔",
  transport: "🚗",
  shopping: "🛍️",
  entertainment: "🎬",
  health: "💊",
  education: "📚",
  utilities: "⚡",
  rent: "🏠",
  investment: "📈",
  other: "📦",
};
const EXP_COLORS = {
  food: "rgba(245,158,11,.15)",
  transport: "rgba(99,102,241,.15)",
  shopping: "rgba(139,92,246,.15)",
  entertainment: "rgba(236,72,153,.15)",
  health: "rgba(34,197,94,.15)",
  other: "rgba(107,114,128,.15)",
};

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: "rgba(128,128,128,0.8)", font: { size: 11 } },
      grid: { color: "rgba(128,128,128,0.08)" },
    },
    y: {
      ticks: { color: "rgba(128,128,128,0.8)", font: { size: 11 } },
      grid: { color: "rgba(128,128,128,0.08)" },
    },
  },
};

const cardAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [insights, setInsights] = useState([]);
  const [overview, setOverview] = useState(null);
  const [mood, setMood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [expForm, setExpForm] = useState({
    description: "",
    amount: "",
    category: "food",
  });
  const [habitForm, setHabitForm] = useState({ name: "", category: "health" });
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, e, o] = await Promise.all([
        habitsApi.getAll(),
        expensesApi.getAll({ limit: 5 }),
        analyticsApi.overview({ days: 7 }),
      ]);
      setHabits(h.data.habits);
      setExpenses(e.data.expenses);
      setOverview(o.data.overview);
    } catch (err) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadInsights = async () => {
    setAiLoading(true);
    try {
      const res = await insightsApi.get();
      setInsights(res.data.insights);
      toast.success("AI insights updated!");
    } catch {
      toast.error("Could not generate insights");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleHabit = async (habit) => {
    const today = new Date().toISOString().split("T")[0];
    const isCompleted = habit.completions?.some((c) => c.date === today);
    try {
      if (isCompleted) {
        await habitsApi.undo(habit._id, { date: today });
      } else {
        await habitsApi.complete(habit._id, { date: today });
        toast.success(`✓ ${habit.name}`, { duration: 2000 });
      }
      load();
    } catch {
      toast.error("Failed to update habit");
    }
  };

  const logMood = async (m) => {
    setMood(m);
    try {
      await moodsApi.log({ score: m.score, emoji: m.emoji, label: m.label });
      toast.success(`Mood logged: ${m.emoji}`, { duration: 2000 });
    } catch {}
  };

  const addExpense = async () => {
    if (!expForm.description || !expForm.amount) return;
    try {
      await expensesApi.create({
        ...expForm,
        amount: parseFloat(expForm.amount),
      });
      toast.success("Expense logged!");
      setShowExpModal(false);
      setExpForm({ description: "", amount: "", category: "food" });
      load();
    } catch {
      toast.error("Failed to save expense");
    }
  };

  const addHabit = async () => {
    if (!habitForm.name) return;
    try {
      await habitsApi.create({
        ...habitForm,
        icon: CAT_ICONS[habitForm.category],
      });
      toast.success("Habit created!");
      setShowHabitModal(false);
      setHabitForm({ name: "", category: "health" });
      load();
    } catch {
      toast.error("Failed to create habit");
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const completedToday = habits.filter((h) =>
    h.completions?.some((c) => c.date === today),
  ).length;
  const lifeScore = overview?.lifeScore ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const weeklyLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
            {greeting()}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHabitModal(true)}
          >
            + Habit
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowExpModal(true)}
          >
            + Expense
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            icon: "🎯",
            bg: "var(--primary-light)",
            label: "Habits today",
            value: `${completedToday}/${habits.length}`,
          },
          {
            icon: "📚",
            bg: "var(--success-light)",
            label: "Study time",
            value: `${overview?.focus?.totalMinutes ? Math.round((overview.focus.totalMinutes / 60) * 10) / 10 : 0}h`,
          },
          {
            icon: "💰",
            bg: "var(--warning-light)",
            label: "Spent today",
            value: `₹${expenses.filter((e) => e.date === today).reduce((s, x) => s + x.amount, 0)}`,
          },
          {
            icon: "🏃",
            bg: "var(--danger-light)",
            label: "Focus sessions",
            value: overview?.focus?.sessions ?? 0,
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="stat-card"
            {...cardAnim}
            transition={{ delay: i * 0.05, duration: 0.35 }}
          >
            <div className="stat-icon" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="bento">
        {/* ── Life Score ── */}
        <motion.div
          className="card col-5"
          {...cardAnim}
          style={{
            background: "linear-gradient(145deg,var(--card),var(--bg))",
            minHeight: 300,
          }}
        >
          <div className="card-label">
            <span>
              <span className="live-dot" style={{ marginRight: 6 }} />
              Life Score
            </span>
            <span className="badge badge-primary">This week</span>
          </div>
          <LifeScoreSphere score={lifeScore} />
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Your Life Score</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>
              {lifeScore >= 76
                ? "🚀 Excellent!"
                : lifeScore >= 50
                  ? "📈 On track"
                  : "💪 Keep going!"}
            </div>
            <div
              style={{
                display: "flex",
                gap: 7,
                justifyContent: "center",
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              {[
                { label: `Habits ${overview?.habits?.rate ?? 0}%` },
                { label: `Mood ${overview?.mood?.score ?? 0}%` },
                { label: `Focus ${overview?.focus?.score ?? 0}%` },
              ].map((p) => (
                <span
                  key={p.label}
                  style={{
                    fontSize: 11,
                    padding: "3px 9px",
                    borderRadius: 20,
                    background: "var(--primary-light)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    color: "#a5b4fc",
                  }}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Habits ── */}
        <motion.div
          className="card col-4"
          {...cardAnim}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <div className="card-label">
            <span>Today's Habits</span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
              onClick={() => setShowHabitModal(true)}
            >
              + Add
            </button>
          </div>
          {habits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">No habits yet</div>
              <div className="empty-state-sub">Add your first habit above</div>
            </div>
          ) : (
            habits.map((h) => {
              const done = h.completions?.some((c) => c.date === today);
              return (
                <motion.div
                  key={h._id}
                  onClick={() => toggleHabit(h)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "9px 0",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  <motion.div
                    animate={{ scale: done ? [1, 1.3, 1] : 1 }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      flexShrink: 0,
                      border: `1.5px solid ${done ? "var(--success)" : "var(--border2)"}`,
                      background: done ? "var(--success)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {done && (
                      <span
                        style={{ fontSize: 12, color: "#000", fontWeight: 700 }}
                      >
                        ✓
                      </span>
                    )}
                  </motion.div>
                  <span style={{ fontSize: 15 }}>
                    {h.icon || CAT_ICONS[h.category] || "✓"}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      flex: 1,
                      textDecoration: done ? "line-through" : "none",
                      opacity: done ? 0.5 : 1,
                    }}
                  >
                    {h.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--warning)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {h.currentStreak}🔥
                  </span>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* ── Mood ── */}
        <motion.div
          className="card col-3"
          {...cardAnim}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          <div className="card-label">Mood Check-in</div>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
            How are you feeling?
          </p>
          <div
            style={{ display: "flex", gap: 6, justifyContent: "space-between" }}
          >
            {MOODS.map((m) => (
              <motion.button
                key={m.score}
                onClick={() => logMood(m)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 11,
                  fontSize: 20,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  background:
                    mood?.score === m.score
                      ? "var(--primary-light)"
                      : "var(--card2)",
                  border: `1.5px solid ${mood?.score === m.score ? "var(--primary)" : "var(--border)"}`,
                  cursor: "pointer",
                  padding: "8px 2px",
                }}
              >
                {m.emoji}
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--text2)",
                    fontWeight: 500,
                  }}
                >
                  {m.label}
                </span>
              </motion.button>
            ))}
          </div>
          {mood && (
            <div
              style={{ marginTop: 12, fontSize: 12, color: "var(--success)" }}
            >
              ✓ Logged: {mood.emoji} {mood.label}
            </div>
          )}
        </motion.div>

        {/* ── Pomodoro ── */}
        <motion.div
          className="card col-3"
          {...cardAnim}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            background: "linear-gradient(145deg,var(--card),var(--bg))",
          }}
        >
          <div className="card-label">Focus Mode</div>
          <PomodoroTimer compact />
        </motion.div>

        {/* ── Expenses ── */}
        <motion.div
          className="card col-5"
          {...cardAnim}
          transition={{ delay: 0.12, duration: 0.4 }}
        >
          <div className="card-label">
            <span>Recent Expenses</span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
              onClick={() => setShowExpModal(true)}
            >
              + Add
            </button>
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <div className="empty-state-title">No expenses</div>
            </div>
          ) : (
            expenses.slice(0, 4).map((e) => (
              <div
                key={e._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: EXP_COLORS[e.category] || "var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    {e.icon || EXP_ICONS[e.category]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {e.description}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      {e.date} · {e.category}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--danger)",
                  }}
                >
                  −₹{e.amount}
                </div>
              </div>
            ))
          )}
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              Total this week
            </span>
            <span
              className="badge badge-warning"
              style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
            >
              ₹{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
            </span>
          </div>
        </motion.div>

        {/* ── AI Insights ── */}
        <motion.div
          className="card col-4"
          {...cardAnim}
          transition={{ delay: 0.14, duration: 0.4 }}
          style={{
            background:
              "linear-gradient(145deg,rgba(13,13,31,0.8),var(--card))",
          }}
        >
          <div className="card-label">
            <span>✦ AI Insights</span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
              onClick={loadInsights}
              disabled={aiLoading}
            >
              {aiLoading ? "..." : "Refresh"}
            </button>
          </div>
          {insights.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🤖</div>
              <div className="empty-state-title">No insights yet</div>
              <div className="empty-state-sub">
                Click Refresh to get AI-powered insights
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 12 }}
                onClick={loadInsights}
                disabled={aiLoading}
              >
                {aiLoading ? "Generating..." : "Generate Insights"}
              </button>
            </div>
          ) : (
            insights.slice(0, 3).map((ins, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 11,
                  padding: 11,
                  background: "var(--primary-light)",
                  border: "1px solid rgba(99,102,241,0.14)",
                  borderRadius: 11,
                  marginBottom: 9,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "rgba(99,102,241,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {ins.icon}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text2)",
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: "var(--text)" }}>{ins.title}:</strong>{" "}
                  {ins.insight}
                </div>
              </div>
            ))
          )}
        </motion.div>

        {/* ── Weekly Chart ── */}
        <motion.div
          className="card col-7"
          {...cardAnim}
          transition={{ delay: 0.16, duration: 0.4 }}
        >
          <div className="card-label">Weekly Analytics</div>
          <div style={{ position: "relative", height: 190 }}>
            <Bar
              data={{
                labels: weeklyLabels,
                datasets: [
                  {
                    type: "line",
                    label: "Life Score",
                    data: [72, 75, 78, 74, 80, 82, lifeScore],
                    borderColor: "#6366F1",
                    backgroundColor: "rgba(99,102,241,0.1)",
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: "#6366F1",
                    yAxisID: "y",
                  },
                  {
                    label: "Habits",
                    data: [4, 5, 6, 4, 5, 6, completedToday],
                    backgroundColor: "rgba(34,197,94,0.45)",
                    borderRadius: 5,
                    yAxisID: "y1",
                  },
                ],
              }}
              options={{
                ...chartDefaults,
                scales: {
                  x: chartDefaults.scales.x,
                  y: {
                    ...chartDefaults.scales.y,
                    position: "left",
                    min: 60,
                    max: 100,
                    yAxisID: "y",
                  },
                  y1: {
                    ...chartDefaults.scales.y,
                    position: "right",
                    min: 0,
                    max: 8,
                    grid: { display: false },
                    yAxisID: "y1",
                  },
                },
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── Add Expense Modal ── */}
      {showExpModal && (
        <div className="modal-overlay" onClick={() => setShowExpModal(false)}>
          <motion.div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button
              className="modal-close"
              onClick={() => setShowExpModal(false)}
            >
              ✕
            </button>
            <div className="modal-title">Log Expense</div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder="e.g. Lunch at cafe"
                value={expForm.description}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                placeholder="0"
                value={expForm.amount}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={expForm.category}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {Object.keys(EXP_ICONS).map((c) => (
                  <option key={c} value={c}>
                    {EXP_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-full" onClick={addExpense}>
              Save Expense
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Add Habit Modal ── */}
      {showHabitModal && (
        <div className="modal-overlay" onClick={() => setShowHabitModal(false)}>
          <motion.div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button
              className="modal-close"
              onClick={() => setShowHabitModal(false)}
            >
              ✕
            </button>
            <div className="modal-title">New Habit</div>
            <div className="form-group">
              <label className="form-label">Habit name</label>
              <input
                className="form-input"
                placeholder="e.g. Morning meditation"
                value={habitForm.name}
                onChange={(e) =>
                  setHabitForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={habitForm.category}
                onChange={(e) =>
                  setHabitForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {Object.entries(CAT_ICONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v} {k.charAt(0).toUpperCase() + k.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-full" onClick={addHabit}>
              Create Habit
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

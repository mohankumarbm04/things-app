import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { analyticsApi, expensesApi, moodsApi } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const chartOpts = (extra = {}) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: 'rgba(128,128,128,0.7)', font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } },
    y: { ticks: { color: 'rgba(128,128,128,0.7)', font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } },
  },
  ...extra,
});

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [expSummary, setExpSummary] = useState(null);
  const [moods, setMoods] = useState([]);

  useEffect(() => {
    analyticsApi.overview({ days: 7 }).then(r => setOverview(r.data.overview)).catch(() => {});
    expensesApi.summary().then(r => setExpSummary(r.data)).catch(() => {});
    moodsApi.getAll({ limit: 7 }).then(r => setMoods(r.data.moods.reverse())).catch(() => {});
  }, []);

  const lifeScore = overview?.lifeScore ?? 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Analytics</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>Your life in data, beautifully visualized.</div>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Life Score',    value: lifeScore,                              color: '#6366F1', unit: '/100' },
          { label: 'Habit Rate',    value: `${overview?.habits?.rate ?? 0}%`,      color: '#22C55E' },
          { label: 'Focus Mins',    value: overview?.focus?.totalMinutes ?? 0,     color: '#F59E0B', unit: 'm' },
          { label: 'Total Spend',   value: `₹${(expSummary?.total ?? 0).toLocaleString()}`, color: '#EF4444' },
        ].map((s, i) => (
          <motion.div key={i} className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: s.color }}>{s.value}{s.unit || ''}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-label">Life Score — 7 days</div>
          <div style={{ position: 'relative', height: 200 }}>
            <Line
              data={{
                labels: LABELS,
                datasets: [{
                  data: [72, 75, 78, 74, 80, 82, lifeScore],
                  borderColor: '#6366F1',
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  fill: true, tension: 0.4, pointBackgroundColor: '#6366F1',
                }],
              }}
              options={chartOpts({ scales: { x: { ticks: { color: 'rgba(128,128,128,0.7)', font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } }, y: { min: 60, max: 100, ticks: { color: 'rgba(128,128,128,0.7)', font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } } } })}
            />
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="card-label">Expense Breakdown</div>
          <div style={{ position: 'relative', height: 200 }}>
            {expSummary?.breakdown?.length > 0 ? (
              <Doughnut
                data={{
                  labels: expSummary.breakdown.map(b => b._id),
                  datasets: [{
                    data: expSummary.breakdown.map(b => b.total),
                    backgroundColor: ['#F59E0B','#6366F1','#8B5CF6','#EC4899','#22C55E','#06B6D4'],
                    borderWidth: 0,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { color: 'rgba(128,128,128,0.8)', font: { size: 11 }, boxWidth: 10 } } } }}
              />
            ) : <div className="empty-state"><div className="empty-state-icon">💰</div><div className="empty-state-title">No expense data</div></div>}
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="card-label">Mood Trends — 7 days</div>
          <div style={{ position: 'relative', height: 200 }}>
            <Bar
              data={{
                labels: moods.map(m => m.date.slice(5)),
                datasets: [{
                  data: moods.map(m => m.score),
                  backgroundColor: moods.map(m => m.score >= 4 ? 'rgba(34,197,94,0.6)' : m.score >= 3 ? 'rgba(99,102,241,0.6)' : 'rgba(245,158,11,0.6)'),
                  borderRadius: 5,
                }],
              }}
              options={chartOpts({ scales: { x: { ticks: { color: 'rgba(128,128,128,0.7)', font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } }, y: { min: 0, max: 5, ticks: { color: 'rgba(128,128,128,0.7)', font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.06)' } } } })}
            />
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-label">Category Stats</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {[
              { label: 'Habits', value: overview?.habits?.rate ?? 0,  color: '#6366F1' },
              { label: 'Mood',   value: overview?.mood?.score ?? 0,   color: '#22C55E' },
              { label: 'Focus',  value: overview?.focus?.score ?? 0,  color: '#F59E0B' },
              { label: 'Workout',value: overview?.workout?.score ?? 0,color: '#EF4444' },
            ].map(c => (
              <div key={c.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{c.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: c.color }}>{c.value}%</span>
                </div>
                <div className="progress-wrap">
                  <motion.div className="progress-bar" style={{ background: c.color }} initial={{ width: 0 }} animate={{ width: `${c.value}%` }} transition={{ duration: 1, delay: 0.3 }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

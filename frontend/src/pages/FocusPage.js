// FocusPage.js
import React from 'react';
import PomodoroTimer from '../components/focus/PomodoroTimer';
import { motion } from 'framer-motion';

export default function FocusPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Focus Mode</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>Deep work. Zero distractions.</div>
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <motion.div className="card" style={{ padding: 36 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <PomodoroTimer compact={false} />
        </motion.div>
        <motion.div className="card" style={{ marginTop: 16 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-label">Focus Tips</div>
          {['Put your phone face-down and on silent.', 'Close all unrelated browser tabs.', 'Use headphones with focus music.', 'Work on one task per session.'].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{tip}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

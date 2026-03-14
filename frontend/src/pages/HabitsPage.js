// ─────────────────────────────────────────────────────────────────
// pages/HabitsPage.js
// ─────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { habitsApi } from '../services/api';
import toast from 'react-hot-toast';

const CAT_ICONS = { health:'🏃', mind:'🧘', learning:'📚', social:'👥', creative:'🎨', finance:'💰', other:'✓' };

export function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'health', description: '' });

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      const res = await habitsApi.getAll();
      setHabits(res.data.habits);
    } catch { toast.error('Failed to load habits'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (h) => {
    const done = h.completions?.some(c => c.date === today);
    try {
      if (done) await habitsApi.undo(h._id, { date: today });
      else { await habitsApi.complete(h._id, { date: today }); toast.success(`✓ ${h.name}`, { duration: 2000 }); }
      load();
    } catch { toast.error('Failed to update'); }
  };

  const create = async () => {
    if (!form.name.trim()) return;
    try {
      await habitsApi.create({ ...form, icon: CAT_ICONS[form.category] });
      toast.success('Habit created!');
      setShowModal(false);
      setForm({ name: '', category: 'health', description: '' });
      load();
    } catch { toast.error('Failed to create'); }
  };

  const deleteHabit = async (id) => {
    if (!window.confirm('Delete this habit?')) return;
    try { await habitsApi.delete(id); load(); } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const completedToday = habits.filter(h => h.completions?.some(c => c.date === today)).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Habit Tracker</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>
            {completedToday}/{habits.length} completed today
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Habit</button>
      </div>

      {habits.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No habits yet</div>
          <div style={{ color: 'var(--text3)', marginBottom: 20 }}>Start building positive habits today</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Habit</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14 }}>
          {habits.map((h, i) => {
            const done = h.completions?.some(c => c.date === today);
            const weekDates = Array.from({ length: 7 }, (_, d) => {
              const dt = new Date(); dt.setDate(dt.getDate() - (6 - d));
              return dt.toISOString().split('T')[0];
            });
            return (
              <motion.div key={h._id} className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 26 }}>{h.icon || CAT_ICONS[h.category]}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{h.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <motion.button
                      onClick={() => toggle(h)}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        border: `1.5px solid ${done ? 'var(--success)' : 'var(--border2)'}`,
                        background: done ? 'var(--success)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      {done && <span style={{ fontSize: 13, color: '#000', fontWeight: 700 }}>✓</span>}
                    </motion.button>
                    <button onClick={() => deleteHabit(h._id)} style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </div>
                {/* Week grid */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {weekDates.map(d => {
                    const c = h.completions?.some(x => x.date === d);
                    return <div key={d} style={{ flex: 1, height: 6, borderRadius: 3, background: c ? 'var(--success)' : 'var(--border)' }} />;
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-warning">{h.currentStreak}🔥 streak</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Best: {h.longestStreak}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <motion.div className="modal" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <div className="modal-title">New Habit</div>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="e.g. Morning meditation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(CAT_ICONS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Description (optional)</label><input className="form-input" placeholder="Why this habit matters..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <button className="btn btn-primary btn-full" onClick={create}>Create Habit</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default HabitsPage;

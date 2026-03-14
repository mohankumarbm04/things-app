import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { focusApi } from '../../services/api';
import toast from 'react-hot-toast';

const MODES = {
  focus:       { label: 'FOCUS SESSION',  mins: 25, color: '#6366F1' },
  shortBreak:  { label: 'SHORT BREAK',    mins: 5,  color: '#22C55E' },
  longBreak:   { label: 'LONG BREAK',     mins: 15, color: '#F59E0B' },
};

export default function PomodoroTimer({ compact = false }) {
  const [mode, setMode]       = useState('focus');
  const [secs, setSecs]       = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState(1);
  const [done, setDone]       = useState(0);
  const [totalMins, setTotalMins] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const intervalRef = useRef(null);
  const audioRef    = useRef(null);

  const totalSecs = MODES[mode].mins * 60;
  const pct = Math.round((secs / totalSecs) * 100);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const handleSessionEnd = useCallback(async () => {
    stop();
    // Play notification sound
    try { audioRef.current?.play(); } catch {}

    if (mode === 'focus') {
      const newDone = done + 1;
      setDone(newDone);
      setTotalMins(m => m + MODES.focus.mins);

      // Save to backend
      try {
        await focusApi.save({
          duration: MODES.focus.mins,
          type: 'pomodoro',
          completed: true,
          startTime,
          endTime: new Date(),
        });
      } catch {}

      toast.success(`🎉 Focus session ${session} complete!`, { duration: 4000 });
      setSession(s => s + 1);

      // Auto-switch to break
      const nextMode = newDone % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setSecs(MODES[nextMode].mins * 60);
    } else {
      toast('⏱ Break over — time to focus!', { icon: '🎯', duration: 3000 });
      setMode('focus');
      setSecs(MODES.focus.mins * 60);
    }
    setStartTime(null);
  }, [mode, done, session, stop, startTime]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { handleSessionEnd(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, handleSessionEnd]);

  const toggle = () => {
    if (!running) {
      setStartTime(new Date());
      setRunning(true);
    } else {
      stop();
    }
  };

  const reset = () => {
    stop();
    setSecs(MODES[mode].mins * 60);
    setStartTime(null);
  };

  const switchMode = (m) => {
    stop();
    setMode(m);
    setSecs(MODES[m].mins * 60);
    setStartTime(null);
  };

  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  const color = MODES[mode].color;

  if (compact) {
    return (
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 300, letterSpacing: -2, color: 'var(--text)', lineHeight: 1 }}>
          {m}:{s}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4, marginBottom: 16 }}>
          {MODES[mode].label}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={toggle}>{running ? 'Pause' : 'Start'}</button>
          <button className="btn btn-secondary btn-sm" onClick={reset}>Reset</button>
        </div>
        <div className="progress-wrap">
          <motion.div
            className="progress-bar"
            style={{ background: color }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
          Session #{session} · {done} done
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--card2)', borderRadius: 10, padding: 3, marginBottom: 28, justifyContent: 'center' }}>
        {Object.entries(MODES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: mode === key ? color : 'transparent',
              color: mode === key ? '#fff' : 'var(--text2)',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {val.label.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* SVG ring timer */}
      <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 24px' }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle cx={100} cy={100} r={88} fill="none" stroke="var(--border)" strokeWidth={6} />
          <motion.circle
            cx={100} cy={100} r={88}
            fill="none" stroke={color} strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 88}
            strokeDashoffset={2 * Math.PI * 88 * (1 - pct / 100)}
            transform="rotate(-90 100 100)"
            transition={{ duration: 1, ease: 'linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 300, letterSpacing: -3, lineHeight: 1 }}>
            {m}:{s}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
            {MODES[mode].label}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
        <motion.button
          className="btn btn-primary"
          style={{ padding: '12px 32px', fontSize: 15, background: color }}
          onClick={toggle}
          whileTap={{ scale: 0.95 }}
        >
          {running ? '⏸ Pause' : '▶ Start'}
        </motion.button>
        <button className="btn btn-secondary" onClick={reset}>Reset</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
        {[
          { label: 'Session', value: `#${session}` },
          { label: 'Completed', value: done },
          { label: 'Minutes', value: totalMins },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Hidden audio */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2UuAyhTk8bWrHI9HCpUi8LasX5JJDBQ" type="audio/wav" />
      </audio>
    </div>
  );
}

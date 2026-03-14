import React, { useEffect, useRef } from 'react';
import { motion, animate } from 'framer-motion';

export default function LifeScoreSphere({ score = 82, size = 170 }) {
  const numRef = useRef(null);
  const prevScore = useRef(score);

  // Animate number on change
  useEffect(() => {
    const from = prevScore.current;
    const to = score;
    prevScore.current = score;
    const controls = animate(from, to, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (val) => {
        if (numRef.current) numRef.current.textContent = Math.round(val);
      },
    });
    return () => controls.stop();
  }, [score]);

  const circumference = 2 * Math.PI * (size / 2 - 10);
  const offset = circumference * (1 - score / 100);

  const getColor = (s) => {
    if (s <= 40) return '#F59E0B';
    if (s <= 75) return '#6366F1';
    return 'url(#aurora-grad)';
  };

  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 10;

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="aurora-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#6366F1" />
            <stop offset="45%"  stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="bg-sphere" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="var(--card2)" />
            <stop offset="100%" stopColor="var(--bg)" />
          </linearGradient>
          <clipPath id="sphere-clip">
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* Outer decorative ring */}
        <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="var(--border)" strokeWidth="1" />

        {/* Background sphere */}
        <circle cx={cx} cy={cy} r={r} fill="url(#bg-sphere)" />

        {/* Liquid fill */}
        <g clipPath="url(#sphere-clip)">
          <motion.rect
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            fill="url(#aurora-grad)"
            opacity={0.85}
            initial={{ y: cy + r }}
            animate={{ y: cy - r + (r * 2 * (1 - score / 100)) }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
          {/* Wave effect */}
          <motion.ellipse
            cx={cx}
            cy={cy - r + (r * 2 * (1 - score / 100))}
            rx={r}
            ry={8}
            fill="url(#aurora-grad)"
            opacity={0.6}
            animate={{ rx: [r, r * 0.9, r] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </g>

        {/* Progress arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={getColor(score)}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          opacity={0.9}
        />

        {/* Rotating glow dot */}
        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx={cx} cy={cy - r} r={4} fill="url(#aurora-grad)" opacity={0.9} />
        </motion.g>
      </svg>

      {/* Score number overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span
          ref={numRef}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: size * 0.24,
            fontWeight: 500,
            background: 'linear-gradient(135deg, #a5b4fc, #6366F1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          /100
        </span>
      </div>
    </div>
  );
}

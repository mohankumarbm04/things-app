import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export default function AuthPage({ mode = 'login' }) {
  const [tab, setTab]         = useState(mode);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass,  setLoginPass]  = useState('');

  // Register fields
  const [regName,  setRegName]  = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass,  setRegPass]  = useState('');
  const [regPass2, setRegPass2] = useState('');

  const { login, register } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (tab === 'login') {
      if (!loginEmail) e.email = 'Email required';
      if (!loginPass)  e.password = 'Password required';
    } else {
      if (!regName || regName.length < 2) e.name = 'Name must be at least 2 characters';
      if (!regEmail || !/\S+@\S+\.\S+/.test(regEmail)) e.email = 'Valid email required';
      if (!regPass || regPass.length < 8) e.password = 'Password must be at least 8 characters';
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(regPass)) e.password = 'Password needs upper, lower case and a number';
      if (regPass !== regPass2) e.password2 = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(loginEmail, loginPass);
      toast.success('Welcome back! 👋');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
      if (msg.includes('locked')) setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await register(regName, regEmail, regPass, tz);
      toast.success('Account created! Welcome to THINGS 🎉');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.1) 0%, transparent 65%)',
    }}>
      {/* Theme toggle (top-right) */}
      <div style={{ position: 'fixed', top: 20, right: 20 }}>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--card)',
            border: '1px solid var(--border)', cursor: 'pointer', fontSize: 16,
          }}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          background: 'var(--card)', border: '1px solid var(--border2)',
          borderRadius: 22, padding: '36px 40px', width: 400, maxWidth: '100%',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
            THINGS<span style={{ color: 'var(--primary)' }}>.</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Your Personal Life Operating System
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 11, padding: 3, margin: '24px 0', gap: 3 }}>
          {['login', 'register'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setErrors({}); }}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: tab === t ? 'var(--primary)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text2)',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                transition: 'all 0.2s',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* General error */}
        {errors.general && (
          <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 9, fontSize: 13, marginBottom: 14 }}>
            {errors.general}
          </div>
        )}

        <AnimatePresence mode="wait">
          {tab === 'login' ? (
            <motion.form key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} autoComplete="email" />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)} autoComplete="current-password" />
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--text3)' }}>Forgot password?</Link>
              </div>
              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? <div className="spinner" /> : 'Sign In →'}
              </button>
            </motion.form>
          ) : (
            <motion.form key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" placeholder="Alex Johnson" value={regName} onChange={e => setRegName(e.target.value)} autoComplete="name" />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} autoComplete="email" />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min 8 chars, upper + lower + number" value={regPass} onChange={e => setRegPass(e.target.value)} autoComplete="new-password" />
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={regPass2} onChange={e => setRegPass2(e.target.value)} autoComplete="new-password" />
                {errors.password2 && <div className="form-error">{errors.password2}</div>}
              </div>
              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? <div className="spinner" /> : 'Create Account →'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 12 }}>
                By signing up you agree to our Terms of Service and Privacy Policy.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

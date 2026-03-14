import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_ITEMS = [
  { path: '/',          label: 'Dashboard', icon: '⊞' },
  { path: '/habits',    label: 'Habits',    icon: '🎯' },
  { path: '/focus',     label: 'Focus',     icon: '⏱' },
  { path: '/analytics', label: 'Analytics', icon: '📊' },
];

const ThemeIcon = ({ theme }) => {
  if (theme === 'dark')   return <span style={{fontSize:14}}>🌙</span>;
  if (theme === 'light')  return <span style={{fontSize:14}}>☀️</span>;
  return <span style={{fontSize:14}}>💻</span>;
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      height: 'var(--nav-height)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      backdropFilter: 'blur(20px)',
    }}>
      {/* Logo */}
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -1, cursor: 'pointer' }} onClick={() => navigate('/')}>
        THINGS<span style={{ color: 'var(--primary)' }}>.</span>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--card)', padding: 3, borderRadius: 12, border: '1px solid var(--border)' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              padding: '7px 16px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? '#fff' : 'var(--text2)',
              background: isActive ? 'var(--primary)' : 'transparent',
              transition: 'all 0.2s',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} ref={menuRef}>

        {/* Theme toggle */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setThemeOpen(o => !o); setMenuOpen(false); }}
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'var(--card2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'var(--transition)',
            }}
            title="Change theme"
          >
            <ThemeIcon theme={theme} />
          </button>

          <AnimatePresence>
            {themeOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 42, right: 0,
                  background: 'var(--card)', border: '1px solid var(--border2)',
                  borderRadius: 12, padding: 6, width: 150,
                  boxShadow: 'var(--shadow)', zIndex: 300,
                }}
              >
                {[
                  { val: 'dark',   label: '🌙 Dark' },
                  { val: 'light',  label: '☀️ Light' },
                  { val: 'system', label: '💻 System' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => { setTheme(val); setThemeOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: theme === val ? 'var(--primary-light)' : 'transparent',
                      color: theme === val ? 'var(--primary)' : 'var(--text2)',
                      border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      fontFamily: 'var(--font-ui)', textAlign: 'left',
                    }}
                  >
                    {label}
                    {theme === val && <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✓</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar + menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setMenuOpen(o => !o); setThemeOpen(false); }}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #8B5CF6)',
              border: '2px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
              transition: 'var(--transition)',
            }}
            title={user?.name}
          >
            {initials}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 42, right: 0,
                  background: 'var(--card)', border: '1px solid var(--border2)',
                  borderRadius: 14, padding: 8, width: 200,
                  boxShadow: 'var(--shadow)', zIndex: 300,
                }}
              >
                <div style={{ padding: '8px 10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{user?.email}</div>
                </div>

                {[
                  { label: '⚙️  Settings',       action: () => { navigate('/settings'); setMenuOpen(false); } },
                  { label: '📊  Analytics',       action: () => { navigate('/analytics'); setMenuOpen(false); } },
                  { label: '🔔  Notifications',   action: () => { navigate('/settings#notifications'); setMenuOpen(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    display: 'flex', width: '100%', padding: '9px 10px',
                    borderRadius: 8, background: 'transparent', border: 'none',
                    color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    fontFamily: 'var(--font-ui)', textAlign: 'left',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {item.label}
                  </button>
                ))}

                <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                  <button onClick={handleLogout} style={{
                    display: 'flex', width: '100%', padding: '9px 10px',
                    borderRadius: 8, background: 'transparent', border: 'none',
                    color: 'var(--danger)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    fontFamily: 'var(--font-ui)', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    🚪  Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_ITEMS = [
  { path: '/',          label: 'Home',      icon: '⊞' },
  { path: '/habits',    label: 'Habits',    icon: '🎯' },
  { path: '/focus',     label: 'Focus',     icon: '⏱' },
  { path: '/analytics', label: 'Stats',     icon: '📊' },
  { path: '/settings',  label: 'Settings',  icon: '⚙️' },
];

const ThemeIcon = ({ theme }) => {
  if (theme === 'dark')  return <span style={{fontSize:14}}>🌙</span>;
  if (theme === 'light') return <span style={{fontSize:14}}>☀️</span>;
  return <span style={{fontSize:14}}>💻</span>;
};

// ── Bottom Nav (Mobile) ──────────────────────────────────────────
function BottomNav({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom)',
      backdropFilter: 'blur(20px)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={{ textDecoration: 'none', flex: 1 }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 0',
              position: 'relative',
            }}>
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  style={{
                    position: 'absolute',
                    top: -1,
                    width: 24,
                    height: 3,
                    background: 'var(--primary)',
                    borderRadius: '0 0 4px 4px',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--primary)' : 'var(--text3)',
                transition: 'color 0.2s',
              }}>{item.label}</span>
            </div>
          </NavLink>
        );
      })}
    </nav>
  );
}

// ── Top Nav (Desktop) ────────────────────────────────────────────
function TopNav({ user, logout }) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]   = useState(false);
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
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -1, cursor: 'pointer' }} onClick={() => navigate('/')}>
        THINGS<span style={{ color: 'var(--primary)' }}>.</span>
      </div>

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} ref={menuRef}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setThemeOpen(o => !o); setMenuOpen(false); }}
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'var(--card2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
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
                    {theme === val && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setMenuOpen(o => !o); setThemeOpen(false); }}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #8B5CF6)',
              border: '2px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
            }}
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
                  { label: '⚙️  Settings',  action: () => { navigate('/settings'); setMenuOpen(false); } },
                  { label: '📊  Analytics', action: () => { navigate('/analytics'); setMenuOpen(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    display: 'flex', width: '100%', padding: '9px 10px',
                    borderRadius: 8, background: 'transparent', border: 'none',
                    color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                    fontFamily: 'var(--font-ui)', textAlign: 'left',
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
                    color: 'var(--danger)', cursor: 'pointer', fontSize: 13,
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

// ── Main Navbar (switches between mobile/desktop) ────────────────
export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (isMobile) return <BottomNav user={user} logout={logout} />;
  return <TopNav user={user} logout={logout} />;
}

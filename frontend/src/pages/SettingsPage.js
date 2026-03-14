import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notifApi } from '../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState('pushSubscription' in (user || {}));
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, theme });
      toast.success('Profile saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!pwForm.current || !pwForm.next) return;
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwForm.next)) {
      toast.error('Password needs uppercase, lowercase, and a number'); return;
    }
    setPwLoading(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success('Password changed! Please log in again.');
      await logout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  const toggleNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }
    if (notifEnabled) {
      try { await notifApi.unsubscribe(); setNotifEnabled(false); toast.success('Notifications disabled'); }
      catch { toast.error('Failed to disable notifications'); }
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast.error('Notification permission denied'); return; }
      const res = await notifApi.getVapidKey();
      const vapidKey = res.data.publicKey;
      if (!vapidKey) { toast.error('Push notifications not configured on server'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      await notifApi.subscribe(sub.toJSON());
      setNotifEnabled(true);
      toast.success('Notifications enabled! 🔔');
    } catch (err) {
      toast.error('Failed to enable notifications: ' + err.message);
    }
  };

  const Section = ({ title, children }) => (
    <motion.div className="card" style={{ marginBottom: 14 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card-label" style={{ marginBottom: 18 }}>{title}</div>
      {children}
    </motion.div>
  );

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Settings</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>Manage your account and preferences.</div>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <div className="form-group">
          <label className="form-label">Full name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Email cannot be changed.</div>
        </div>
        <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
          {saving ? <div className="spinner" /> : 'Save Profile'}
        </button>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { val: 'dark',   label: '🌙 Dark',   desc: 'OLED black' },
            { val: 'light',  label: '☀️ Light',  desc: 'Clean white' },
            { val: 'system', label: '💻 System', desc: 'Auto detect' },
          ].map(t => (
            <button
              key={t.val}
              onClick={() => { setTheme(t.val); toast.success(`${t.label} theme applied`); }}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                background: theme === t.val ? 'var(--primary-light)' : 'var(--card2)',
                border: `1.5px solid ${theme === t.val ? 'var(--primary)' : 'var(--border)'}`,
                color: theme === t.val ? 'var(--primary)' : 'var(--text2)',
                fontFamily: 'var(--font-ui)', textAlign: 'center', transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{t.label.split(' ')[0]}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{t.label.split(' ').slice(1).join(' ')}</div>
              <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Push Notifications</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Habit reminders, mood check-ins, weekly reports
            </div>
          </div>
          <button
            onClick={toggleNotifications}
            style={{
              width: 46, height: 26, borderRadius: 13, cursor: 'pointer', border: 'none',
              background: notifEnabled ? 'var(--primary)' : 'var(--border2)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3, transition: 'left 0.2s',
              left: notifEnabled ? 23 : 3,
            }} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
          🔔 Reminders at 8:00 AM · 😌 Evening check-in at 9:00 PM · 📊 Weekly report on Sundays
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Security — Change Password">
        <div className="form-group">
          <label className="form-label">Current password</label>
          <input className="form-input" type="password" placeholder="••••••••" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">New password</label>
          <input className="form-input" type="password" placeholder="Min 8 chars, upper + lower + number" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm new password</label>
          <input className="form-input" type="password" placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
        </div>
        <button className="btn btn-primary" onClick={savePassword} disabled={pwLoading}>
          {pwLoading ? <div className="spinner" /> : 'Change Password'}
        </button>
      </Section>

      {/* Danger Zone */}
      <Section title="Account">
        <div style={{ padding: '12px', background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Sign out of all devices</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>This will revoke all active sessions and refresh tokens.</div>
          <button className="btn btn-danger btn-sm" onClick={async () => {
            try { await logout(); toast.success('Signed out of all devices'); } catch {}
          }}>
            Sign Out All Devices
          </button>
        </div>
      </Section>
    </div>
  );
}

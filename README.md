# THINGS — Personal Life Operating System

> AI-powered full-stack SaaS life management app with real backend, JWT auth, push notifications, dark/light themes, and Claude AI insights.

---

## 🏗 Tech Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Frontend     | React 18, Framer Motion, Chart.js       |
| Backend      | Node.js, Express.js                     |
| Database     | MongoDB + Mongoose                      |
| Auth         | JWT (access + refresh tokens), bcrypt   |
| AI           | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Notifications| Web Push API + node-cron                |
| Security     | Helmet, CORS, rate limiting, sanitization, brute-force lockout |

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd things-app

# Backend
cd backend
npm install
cp .env.example .env   # Fill in all values

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### 2. Configure `.env` (backend)

```env
MONGO_URI=mongodb://localhost:27017/things_app
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<another 64-byte hex>
ANTHROPIC_API_KEY=sk-ant-...
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
VAPID_PUBLIC_KEY=<npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:you@email.com
CLIENT_URL=http://localhost:3000
```

### 3. Generate VAPID keys for push notifications

```bash
npx web-push generate-vapid-keys
```

### 4. Run

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm start
```

---

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| Password hashing | bcrypt with 12 rounds |
| JWT access tokens | Short-lived (7d), memory-only in client |
| Refresh tokens | Stored hashed in DB, rotated on each use |
| Brute-force protection | Account lockout after 5 failed attempts (15 min) |
| Rate limiting | Global 100/15min + Auth endpoints 10/15min + AI 10/hour |
| NoSQL injection | `express-mongo-sanitize` |
| XSS prevention | Input sanitization, Content Security Policy via Helmet |
| CORS | Strict origin whitelist |
| Token reuse detection | All sessions revoked if refresh token reuse detected |
| Password change | Invalidates all refresh tokens |
| Secure headers | Helmet (HSTS, X-Frame-Options, nosniff, referrer policy) |

---

## 📁 Project Structure

```
things-app/
├── backend/
│   ├── server.js              # Express app + security middleware
│   ├── models/
│   │   ├── User.js            # User model with brute-force protection
│   │   ├── Habit.js           # Habit + streak logic
│   │   └── index.js           # Mood, Expense, Focus, Workout models
│   ├── routes/
│   │   ├── auth.js            # Register, login, refresh, logout, password
│   │   ├── habits.js          # CRUD + complete/undo
│   │   ├── insights.js        # Claude AI insights + chat
│   │   └── _all.js            # Moods, Expenses, Focus, Workouts, Analytics, Notifications
│   ├── middleware/
│   │   └── auth.js            # JWT protect middleware
│   └── utils/
│       ├── jwt.js             # Token signing/verification
│       ├── email.js           # Nodemailer templates
│       ├── scheduler.js       # node-cron push notification scheduler
│       └── logger.js          # Winston logger
│
└── frontend/
    └── src/
        ├── App.js             # Router + providers
        ├── context/
        │   ├── AuthContext.js  # Silent refresh, secure token storage
        │   └── ThemeContext.js # Dark/light/system theme
        ├── services/
        │   └── api.js          # Axios + token refresh interceptor + sanitization
        ├── components/
        │   ├── common/Navbar.js
        │   ├── dashboard/LifeScoreSphere.js
        │   └── focus/PomodoroTimer.js
        ├── pages/
        │   ├── Dashboard.js    # Bento grid dashboard
        │   ├── AuthPage.js     # Login + Register
        │   ├── HabitsPage.js
        │   ├── FocusPage.js
        │   ├── AnalyticsPage.js
        │   └── SettingsPage.js
        └── styles/globals.css  # Full design system + CSS variables
```

---

## 🤖 AI Insights

AI insights analyze your last 14 days of:
- Habit completion patterns
- Mood trends and sleep correlation
- Spending patterns (weekday vs weekend)
- Focus session timing
- Workout consistency

Rate limited to 10 requests/hour per user to manage API costs.

---

## 📱 React Native (Mobile)

To convert to React Native:
1. Replace `react-router-dom` with `@react-navigation/native`
2. Replace HTML elements with RN components (`View`, `Text`, `TouchableOpacity`)
3. Use `AsyncStorage` instead of `sessionStorage` for refresh tokens
4. Use `expo-notifications` for push notifications
5. Replace Chart.js with `react-native-chart-kit` or `victory-native`

---

## 🚢 Production Deployment

```bash
# Build frontend
cd frontend && npm run build

# Serve with nginx or on Vercel/Netlify
# Deploy backend to Railway, Render, or EC2

# Environment checklist:
# ✅ NODE_ENV=production
# ✅ MongoDB Atlas URI
# ✅ Strong JWT secrets (64 bytes)
# ✅ SMTP credentials
# ✅ VAPID keys
# ✅ CLIENT_URL set to production domain
# ✅ HTTPS enabled (HSTS headers active)
```

---

## 📄 License

MIT

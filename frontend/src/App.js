import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/common/Navbar";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import "./styles/globals.css";

const HabitsPage = React.lazy(() => import("./pages/HabitsPage"));
const FocusPage = React.lazy(() => import("./pages/FocusPage"));
const AnalyticsPage = React.lazy(() => import("./pages/AnalyticsPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const isMobile = window.innerWidth < 768;

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1 }}>
          THINGS<span style={{ color: "#6366F1" }}>.</span>
        </div>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <React.Suspense
          fallback={
            <div className="page-loader">
              <div className="spinner" />
            </div>
          }
        >
          <Outlet />
        </React.Suspense>
      </main>
    </div>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const isMobile = window.innerWidth < 768;

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <AuthPage mode="login" />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <AuthPage mode="register" />
                </PublicRoute>
              }
            />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position={isMobile ? "top-center" : "bottom-right"}
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--border2)",
              borderRadius: 12,
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              boxShadow: "var(--shadow)",
            },
            success: { iconTheme: { primary: "#22C55E", secondary: "#000" } },
            error: { iconTheme: { primary: "#EF4444", secondary: "#fff" } },
            duration: 3000,
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

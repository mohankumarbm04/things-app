import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const initialState = {
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        user: action.user,
        accessToken: action.accessToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case "LOGOUT":
      return { ...initialState, isLoading: false };
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.updates } };
    case "SET_LOADING":
      return { ...state, isLoading: action.value };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refreshTimerRef = useRef(null);

  const storeRefreshToken = (token) => {
    try {
      sessionStorage.setItem("_rt", token);
    } catch {}
  };
  const getRefreshToken = () => {
    try {
      return sessionStorage.getItem("_rt");
    } catch {
      return null;
    }
  };
  const clearRefreshToken = () => {
    try {
      sessionStorage.removeItem("_rt");
    } catch {}
  };

  // ── Schedule refresh ──────────────────────────────────────────
  const scheduleRefresh = useCallback(
    (expiresInMs = 6 * 24 * 60 * 60 * 1000) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      const delay = Math.max(expiresInMs - 5 * 60 * 1000, 60 * 1000);
      refreshTimerRef.current = setTimeout(async () => {
        const rt = getRefreshToken();
        if (!rt) {
          dispatch({ type: "LOGOUT" });
          return;
        }
        try {
          const res = await api.post("/auth/refresh", { refreshToken: rt });
          const { accessToken, refreshToken: newRt, user } = res.data;
          storeRefreshToken(newRt);
          api.defaults.headers.common["Authorization"] =
            `Bearer ${accessToken}`;
          dispatch({ type: "LOGIN", user, accessToken });
        } catch {
          dispatch({ type: "LOGOUT" });
          clearRefreshToken();
          delete api.defaults.headers.common["Authorization"];
        }
      }, delay);
    },
    [],
  );

  // ── Silent refresh ────────────────────────────────────────────
  const silentRefresh = useCallback(async () => {
    const rt = getRefreshToken();
    if (!rt) {
      dispatch({ type: "LOGOUT" });
      return;
    }
    try {
      const res = await api.post("/auth/refresh", { refreshToken: rt });
      const { accessToken, refreshToken: newRt, user } = res.data;
      storeRefreshToken(newRt);
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      dispatch({ type: "LOGIN", user, accessToken });
      scheduleRefresh();
    } catch {
      dispatch({ type: "LOGOUT" });
      clearRefreshToken();
      delete api.defaults.headers.common["Authorization"];
    }
  }, [scheduleRefresh]);

  // ── Boot ──────────────────────────────────────────────────────
  useEffect(() => {
    const rt = getRefreshToken();
    if (rt) {
      silentRefresh();
    } else {
      dispatch({ type: "SET_LOADING", value: false });
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [silentRefresh]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { accessToken, refreshToken, user } = res.data;
    storeRefreshToken(refreshToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    dispatch({ type: "LOGIN", user, accessToken });
    scheduleRefresh();
    return user;
  };

  const register = async (name, email, password, timezone) => {
    const res = await api.post("/auth/register", {
      name,
      email,
      password,
      timezone,
    });
    const { accessToken, refreshToken, user } = res.data;
    storeRefreshToken(refreshToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    dispatch({ type: "LOGIN", user, accessToken });
    scheduleRefresh();
    return user;
  };

  const logout = async () => {
    const rt = getRefreshToken();
    try {
      await api.post("/auth/logout", { refreshToken: rt });
    } catch {}
    clearRefreshToken();
    delete api.defaults.headers.common["Authorization"];
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    dispatch({ type: "LOGOUT" });
  };

  const updateProfile = async (updates) => {
    const res = await api.patch("/auth/profile", updates);
    dispatch({ type: "UPDATE_USER", updates: res.data.user });
    return res.data.user;
  };

  const changePassword = async (currentPassword, newPassword) => {
    await api.patch("/auth/password", { currentPassword, newPassword });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        silentRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

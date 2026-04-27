'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { authAPI } from '@/lib/api';

const TOKEN_LIFETIME_MS = 30 * 60 * 1000;   // 30 minutes — must match backend jwt.expiration
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;  // Refresh when <5 min remaining
const CHECK_INTERVAL_MS = 60 * 1000;          // Check every 60 seconds

interface User {
  id: number;
  userId?: number;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: 'CLIENT' | 'WORKER' | 'ADMIN';
  vettingLevel: 'STANDARD' | 'VERIFIED' | 'PRO';
  trustScore?: number;
  totalJobsCompleted?: number;
  totalReviews?: number;
  locationName?: string;
  isVerified?: boolean;
}

function normaliseUser(raw: Record<string, unknown>): User {
  return {
    ...raw,
    id: (raw.id ?? raw.userId) as number,
  } as User;
}

/** Decode JWT exp claim (seconds → ms). Returns 0 if invalid. */
function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    phoneNumber: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'CLIENT' | 'WORKER';
    referralCode?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Track last user activity timestamp
  const lastActivity = useRef<number>(Date.now());
  const refreshing = useRef(false);

  // ── Persist helpers ──────────────────────────────────────────────────────

  const saveSession = useCallback((newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // ── Logout (usable from anywhere via context) ────────────────────────────

  const logout = useCallback(() => {
    clearSession();
    window.location.href = '/login';
  }, [clearSession]);

  // ── Restore session on mount ─────────────────────────────────────────────

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser && storedUser !== 'undefined') {
      const exp = getTokenExpiry(storedToken);
      if (exp && exp < Date.now()) {
        // Token already expired
        clearSession();
      } else {
        setToken(storedToken);
        try {
          setUser(normaliseUser(JSON.parse(storedUser)));
        } catch {
          clearSession();
        }
      }
    }
    setLoading(false);
  }, [clearSession]);

  // ── Track user activity ──────────────────────────────────────────────────

  useEffect(() => {
    const onActivity = () => { lastActivity.current = Date.now(); };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, []);

  // ── Periodic token check: refresh if active, logout if expired ───────────

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;

      const exp = getTokenExpiry(currentToken);
      const now = Date.now();
      const timeLeft = exp - now;

      // Token already expired → force logout
      if (timeLeft <= 0) {
        clearSession();
        window.location.href = '/login?reason=expired';
        return;
      }

      // Token expiring soon + user was active in the last 30 min → refresh
      const userActive = (now - lastActivity.current) < TOKEN_LIFETIME_MS;

      if (timeLeft < REFRESH_THRESHOLD_MS && userActive && !refreshing.current) {
        refreshing.current = true;
        try {
          const res = await authAPI.refreshToken();
          const newToken = res.data?.token;
          if (newToken) {
            localStorage.setItem('token', newToken);
            setToken(newToken);
          }
        } catch {
          // Refresh failed (e.g. backend restarted) → logout
          clearSession();
          window.location.href = '/login?reason=expired';
        } finally {
          refreshing.current = false;
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [token, clearSession]);

  // ── Login / Register ─────────────────────────────────────────────────────

  const login = async (emailOrPhone: string, password: string) => {
    const response = await authAPI.login({ emailOrPhone, password });
    const { token: newToken, ...rawUserData } = response.data;
    const userData = normaliseUser(rawUserData);
    lastActivity.current = Date.now();
    saveSession(newToken, userData);
  };

  const register = async (data: {
    email: string;
    phoneNumber: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'CLIENT' | 'WORKER';
    referralCode?: string;
  }) => {
    const response = await authAPI.register(data);
    const { token: newToken, ...rawUserData } = response.data;
    const userData = normaliseUser(rawUserData);
    lastActivity.current = Date.now();
    saveSession(newToken, userData);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

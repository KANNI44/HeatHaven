import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, getToken, setToken } from './tokenStore';
import * as api from '../api/heatHaven';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: api.User };

type AuthContextValue = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refreshMe = useCallback(async () => {
    const res = await api.me();
    setState({ status: 'signedIn', user: res.user });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setState({ status: 'signedOut' });
          return;
        }
        await refreshMe();
      } catch {
        await clearToken();
        if (!cancelled) setState({ status: 'signedOut' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await setToken(res.token);
    setState({ status: 'signedIn', user: res.user });
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setState({ status: 'signedOut' });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ state, signIn, signOut, refreshMe }), [state, signIn, signOut, refreshMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


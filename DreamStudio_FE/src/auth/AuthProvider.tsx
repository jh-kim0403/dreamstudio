import React, { ReactNode, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import * as Keychain from 'react-native-keychain';
import AuthContext, { LoginPayload } from '../context/AuthContext.tsx';
import { API_BASE_URL } from '../config/api';

interface AuthContextProviderProps {
  children: ReactNode;
}

export default function AuthContextProvider({ children } : AuthContextProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const login = useCallback(async (data: LoginPayload) => {
    setToken(data.access_token);
    setUser({
      id: data.user_id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
    });
    await Keychain.setGenericPassword(data.user_id, data.refresh_token, {
      service: 'refresh-token',
    });
  }, []);

  const logout = useCallback(async () => {
    const credentials = await Keychain.getGenericPassword({ service: 'refresh-token' });
    setToken(null);
    setUser(null);
    await Keychain.resetGenericPassword({ service: 'refresh-token' });
    if (credentials && credentials.password) {
      try {
        await fetch(`${API_BASE_URL}/user/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: credentials.password }),
        });
      } catch {
        // Local logout already done — server revocation is best-effort
      }
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }
    refreshInFlight.current = (async () => {
      const credentials = await Keychain.getGenericPassword({
        service: 'refresh-token',
      });
      if (!credentials || (credentials as any) === false || !credentials.password) {
        logout();
        return null;
      }
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: credentials.username,
          refresh_token: credentials.password,
        }),
      });
      if (!response.ok) {
        logout();
        return null;
      }
      const data = await response.json();
      if (!data?.access_token || !data?.refresh_token) {
        logout();
        return null;
      }
      setToken(data.access_token);
      setUser({
        id: data.user_id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      await Keychain.setGenericPassword(data.user_id, data.refresh_token, {
        service: 'refresh-token',
      });
      return data.access_token as string;
    })();
    try {
      return await refreshInFlight.current;
    } finally {
      refreshInFlight.current = null;
    }
  }, [logout]);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        await refreshToken();
      } finally {
        if (isMounted) {
          setIsAuthBootstrapping(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [refreshToken]);

  const decodeBase64 = (input: string) => {
    const atobFn = (globalThis as any)?.atob;
    if (typeof atobFn === "function") {
      return atobFn(input);
    }
    const bufferCtor = (globalThis as any)?.Buffer;
    if (bufferCtor) {
      return bufferCtor.from(input, "base64").toString("binary");
    }
    throw new Error("Base64 decoder not available");
  };

  const getTokenExpiryMs = (jwt: string) => {
    try {
      const [, payload] = jwt.split(".");
      if (!payload) {
        return null;
      }
      let normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const pad = normalized.length % 4;
      if (pad) {
        normalized += "=".repeat(4 - pad);
      }
      const decoded = JSON.parse(decodeBase64(normalized));
      if (!decoded?.exp) {
        return null;
      }
      return Number(decoded.exp) * 1000;
    } catch {
      return null;
    }
  };

  const authFetch = useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      let currentToken = token;
      if (currentToken) {
        const expMs = getTokenExpiryMs(currentToken);
        if (expMs && expMs - Date.now() <= 90_000) {
          currentToken = await refreshToken();
        }
        if (currentToken) {
          headers.set("Authorization", `Bearer ${currentToken}`);
        }
      }
      const response = await fetch(input, { ...init, headers });
      if (response.status !== 401) {
        return response;
      }
      const newToken = await refreshToken();
      if (!newToken) {
        return response;
      }
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      return fetch(input, { ...init, headers: retryHeaders });
    },
    [token, refreshToken]
  );

  const updateProfile = useCallback(async (changes: any) => {
    setUser((prev: any) => ({ ...(prev || {}), ...(changes || {}) }));
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isLoggedIn: Boolean(token),
    isAuthBootstrapping,
    login,
    logout,
    refreshToken,
    authFetch,
    updateProfile,
  }), [token, user, isAuthBootstrapping, authFetch, refreshToken, login, logout, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, setCsrfToken } from "../api/client";
import { authApi } from "../api/endpoints";
import type { MeResponse, RoleName } from "../api/types";

export type CurrentUser = MeResponse["user"];

interface AuthValue {
  user: CurrentUser | null;
  loading: boolean;
  error: boolean;
  hasRole: (...roles: RoleName[]) => boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

// Where each role lands after login. The first matching role wins.
export function homePathFor(roles: readonly RoleName[]): string {
  if (roles.includes("STUDENT")) return "/student";
  if (roles.includes("SYSTEM_ADMIN")) return "/admin";
  if (roles.includes("AUTHORIZED_SIGNER")) return "/signer";
  if (roles.includes("SPECIALIST") || roles.includes("ACCOUNTANT")) return "/staff";
  return "/";
}

interface SessionResult {
  user: CurrentUser | null;
  csrfToken: string | null;
  failed: boolean;
}

async function loadSession(): Promise<SessionResult> {
  try {
    const me = await authApi.me();
    return { user: me.user, csrfToken: me.csrfToken, failed: false };
  } catch (caught) {
    // 401 simply means "not logged in".
    return { user: null, csrfToken: null, failed: !(caught instanceof ApiError && caught.status === 401) };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const apply = useCallback((session: SessionResult) => {
    setCsrfToken(session.user ? session.csrfToken : null);
    setUser(session.user);
    setError(session.failed);
    setLoading(false);
  }, []);

  const refresh = useCallback(() => loadSession().then(apply), [apply]);

  useEffect(() => {
    void loadSession().then(apply);
    // The session cookie is shared by all tabs: logging in as someone else in another
    // tab replaces it, so re-check whenever this tab becomes active again.
    const recheck = () => {
      if (document.visibilityState === "visible") void loadSession().then(apply);
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [apply]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setCsrfToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      error,
      hasRole: (...roles) => Boolean(user && user.roles.some((role) => roles.includes(role))),
      refresh,
      logout,
    }),
    [user, loading, error, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

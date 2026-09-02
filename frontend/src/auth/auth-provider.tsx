import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AUTHENTICATION_REQUIRED_EVENT,
  login as createLogin,
  logout as deleteSession,
  register as createAccount,
  restoreSession,
  type User,
} from "@/api/auth";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from "@/auth/auth-context";

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "DevStash could not restore your session.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preserveReturnPath, setPreserveReturnPath] = useState(true);
  const authOperation = useRef(0);

  const retry = useCallback(async () => {
    const operation = ++authOperation.current;
    setStatus("loading");
    setError(null);
    try {
      const session = await restoreSession();
      if (operation !== authOperation.current) return;
      setUser(session?.user ?? null);
      setPreserveReturnPath(true);
      setStatus(session === null ? "anonymous" : "authenticated");
    } catch (caught: unknown) {
      if (operation !== authOperation.current) return;
      setUser(null);
      setError(messageFrom(caught));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const operation = ++authOperation.current;
    void restoreSession()
      .then((session) => {
        if (!active || operation !== authOperation.current) return;
        setUser(session?.user ?? null);
        setPreserveReturnPath(true);
        setStatus(session === null ? "anonymous" : "authenticated");
      })
      .catch((caught: unknown) => {
        if (!active || operation !== authOperation.current) return;
        setUser(null);
        setError(messageFrom(caught));
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const requireAuthentication = () => {
      ++authOperation.current;
      setUser(null);
      setError(null);
      setPreserveReturnPath(true);
      setStatus("anonymous");
    };
    window.addEventListener(
      AUTHENTICATION_REQUIRED_EVENT,
      requireAuthentication,
    );
    return () =>
      window.removeEventListener(
        AUTHENTICATION_REQUIRED_EVENT,
        requireAuthentication,
      );
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const operation = ++authOperation.current;
    const session = await createLogin(email, password);
    if (operation !== authOperation.current) return;
    setUser(session.user);
    setError(null);
    setPreserveReturnPath(true);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const operation = ++authOperation.current;
    const session = await createAccount(email, password);
    if (operation !== authOperation.current) return;
    setUser(session.user);
    setError(null);
    setPreserveReturnPath(true);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const operation = ++authOperation.current;
    try {
      await deleteSession();
      if (operation !== authOperation.current) return;
      setUser(null);
      setError(null);
      setPreserveReturnPath(false);
      setStatus("anonymous");
    } catch (caught: unknown) {
      try {
        const session = await restoreSession();
        if (operation !== authOperation.current) return;
        setUser(session?.user ?? null);
        setPreserveReturnPath(true);
        setStatus(session === null ? "anonymous" : "authenticated");
      } catch {
        if (operation !== authOperation.current) return;
        setStatus("error");
      }
      throw caught;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      preserveReturnPath,
      login,
      register,
      logout,
      retry,
    }),
    [error, login, logout, preserveReturnPath, register, retry, status, user],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

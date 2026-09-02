import { createContext, useContext } from "react";

import type { User } from "@/api/auth";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  preserveReturnPath: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

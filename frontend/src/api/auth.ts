import { clearCsrfToken, getCsrfToken, setCsrfToken } from "@/api/csrf";

export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type AuthSession = {
  user: User;
  csrf_token: string;
};

export const AUTHENTICATION_REQUIRED_EVENT = "devstash:authentication-required";

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.created_at === "string"
  );
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Record<string, unknown>;
  return isUser(session.user) && typeof session.csrf_token === "string";
}

async function readSession(response: Response): Promise<AuthSession> {
  const value: unknown = await response.json();
  if (!isAuthSession(value)) {
    throw new AuthApiError("DevStash returned an invalid session.");
  }
  setCsrfToken(value.csrf_token);
  return value;
}

async function credentialsRequest(
  path: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new AuthApiError(
      "DevStash could not reach the authentication service.",
    );
  }
  if (response.status === 401) {
    throw new AuthApiError("Email or password is incorrect.");
  }
  if (response.status === 409) {
    throw new AuthApiError("An account with this email already exists.");
  }
  if (response.status === 429) {
    throw new AuthApiError("Too many attempts. Please wait and try again.");
  }
  if (!response.ok) {
    throw new AuthApiError("Authentication could not be completed.");
  }
  return readSession(response);
}

export function register(
  email: string,
  password: string,
): Promise<AuthSession> {
  return credentialsRequest("/api/users", email, password);
}

export function login(email: string, password: string): Promise<AuthSession> {
  return credentialsRequest("/api/sessions", email, password);
}

export async function restoreSession(): Promise<AuthSession | null> {
  let response: Response;
  try {
    response = await fetch("/api/session", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new AuthApiError("DevStash could not restore your session.");
  }
  if (response.status === 401) {
    clearCsrfToken();
    return null;
  }
  if (!response.ok) {
    throw new AuthApiError("DevStash could not restore your session.");
  }
  return readSession(response);
}

export async function logout(): Promise<void> {
  const token = getCsrfToken();
  try {
    const response = await fetch("/api/session", {
      method: "DELETE",
      credentials: "same-origin",
      headers: token === null ? {} : { "X-CSRF-Token": token },
    });
    if (!response.ok) throw new Error("logout failed");
  } catch {
    throw new AuthApiError("DevStash could not sign you out.");
  } finally {
    clearCsrfToken();
  }
}

export function announceAuthenticationRequired(): void {
  clearCsrfToken();
  window.dispatchEvent(new Event(AUTHENTICATION_REQUIRED_EVENT));
}

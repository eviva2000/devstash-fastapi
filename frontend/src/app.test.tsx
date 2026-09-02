import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import type { AuthSession } from "@/api/auth";
import { App } from "@/app";

const authMocks = vi.hoisted(() => ({
  restoreSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/auth")>();
  return { ...actual, ...authMocks };
});

vi.mock("@/components/dashboard/dashboard-page", () => ({
  DashboardPage: ({
    user,
    onLogout,
  }: {
    user: { email: string };
    onLogout: () => Promise<void>;
  }) => (
    <>
      <h1>Dashboard for {user.email}</h1>
      <button type="button" onClick={() => void onLogout()}>
        Sign out
      </button>
    </>
  ),
}));

const session: AuthSession = {
  user: {
    id: "bbfe91a0-29f7-43a7-b917-42f3cccf7930",
    email: "developer@example.com",
    created_at: "2026-09-01T09:30:00Z",
  },
  csrf_token: "csrf-proof",
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
  authMocks.logout.mockResolvedValue(undefined);
});

test("restores a session before rendering a protected dashboard", async () => {
  let resolveSession: ((value: AuthSession) => void) | undefined;
  authMocks.restoreSession.mockReturnValue(
    new Promise<AuthSession>((resolve) => {
      resolveSession = resolve;
    }),
  );
  window.history.replaceState({}, "", "/dashboard");

  render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent("Restoring session");
  expect(screen.queryByText(/Dashboard for/)).not.toBeInTheDocument();

  resolveSession?.(session);
  expect(
    await screen.findByRole("heading", {
      name: "Dashboard for developer@example.com",
    }),
  ).toBeVisible();
});

test("redirects signed-out visitors to login and returns after sign in", async () => {
  authMocks.restoreSession.mockResolvedValue(null);
  authMocks.login.mockResolvedValue(session);
  window.history.replaceState({}, "", "/dashboard?type=note");
  const user = userEvent.setup();

  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Sign in to DevStash" }),
  ).toBeVisible();

  await user.type(screen.getByLabelText("Email"), session.user.email);
  await user.type(screen.getByLabelText("Password"), "correct horse battery");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(authMocks.login).toHaveBeenCalledWith(
    session.user.email,
    "correct horse battery",
  );
  expect(
    await screen.findByRole("heading", {
      name: "Dashboard for developer@example.com",
    }),
  ).toBeVisible();
  await waitFor(() => expect(window.location.search).toBe("?type=note"));
});

test("does not let a delayed session restore overwrite a completed login", async () => {
  let resolveSession: ((value: AuthSession) => void) | undefined;
  const previousSession: AuthSession = {
    ...session,
    user: { ...session.user, email: "previous@example.com" },
  };
  authMocks.restoreSession.mockReturnValue(
    new Promise<AuthSession>((resolve) => {
      resolveSession = resolve;
    }),
  );
  authMocks.login.mockResolvedValue(session);
  window.history.replaceState({}, "", "/login");
  const user = userEvent.setup();

  render(<App />);
  await user.type(screen.getByLabelText("Email"), session.user.email);
  await user.type(screen.getByLabelText("Password"), "correct horse battery");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(
    await screen.findByRole("heading", {
      name: "Dashboard for developer@example.com",
    }),
  ).toBeVisible();

  resolveSession?.(previousSession);
  await waitFor(() =>
    expect(
      screen.getByRole("heading", {
        name: "Dashboard for developer@example.com",
      }),
    ).toBeVisible(),
  );
  expect(
    screen.queryByRole("heading", {
      name: "Dashboard for previous@example.com",
    }),
  ).not.toBeInTheDocument();
});

test("registers an account and rejects unsafe external return paths", async () => {
  authMocks.restoreSession.mockResolvedValue(null);
  authMocks.register.mockResolvedValue(session);
  window.history.replaceState(
    { usr: { from: "//attacker.example" } },
    "",
    "/register",
  );
  const user = userEvent.setup();

  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await user.type(screen.getByLabelText("Email"), session.user.email);
  await user.type(screen.getByLabelText("Password"), "correct horse battery");
  await user.click(screen.getByRole("button", { name: "Create account" }));

  expect(
    await screen.findByRole("heading", {
      name: "Dashboard for developer@example.com",
    }),
  ).toBeVisible();
  expect(window.location.pathname).toBe("/dashboard");
});

test("explicit sign out does not carry dashboard filters into another account", async () => {
  authMocks.restoreSession.mockResolvedValue(session);
  authMocks.login.mockResolvedValue(session);
  window.history.replaceState({}, "", "/dashboard?type=note");
  const user = userEvent.setup();

  render(<App />);
  await screen.findByRole("heading", {
    name: "Dashboard for developer@example.com",
  });
  await user.click(screen.getByRole("button", { name: "Sign out" }));

  expect(
    await screen.findByRole("heading", { name: "Sign in to DevStash" }),
  ).toBeVisible();
  expect(window.location.pathname).toBe("/login");
  expect(window.location.search).toBe("");

  await user.type(screen.getByLabelText("Email"), "another@example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse battery");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  await screen.findByRole("heading", {
    name: "Dashboard for developer@example.com",
  });
  expect(window.location.pathname).toBe("/dashboard");
  expect(window.location.search).toBe("");
});

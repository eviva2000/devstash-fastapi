import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  AuthApiError,
  login,
  logout,
  register,
  restoreSession,
} from "@/api/auth";
import { getCsrfToken } from "@/api/csrf";

const fetchMock = vi.fn<typeof fetch>();
const session = {
  user: {
    id: "bbfe91a0-29f7-43a7-b917-42f3cccf7930",
    email: "developer@example.com",
    created_at: "2026-09-01T09:30:00Z",
  },
  csrf_token: "csrf-proof",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

test("registers and signs in with cookie-backed JSON requests", async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse(session, 201))
    .mockResolvedValueOnce(jsonResponse(session));

  await expect(
    register("developer@example.com", "correct horse battery staple"),
  ).resolves.toEqual(session);
  await expect(
    login("developer@example.com", "correct horse battery staple"),
  ).resolves.toEqual(session);

  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    "/api/users",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({
        email: "developer@example.com",
        password: "correct horse battery staple",
      }),
    }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    "/api/sessions",
    expect.objectContaining({ method: "POST", credentials: "same-origin" }),
  );
  expect(getCsrfToken()).toBe("csrf-proof");
});

test("restores a valid session and treats 401 as signed out", async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse(session))
    .mockResolvedValueOnce(
      jsonResponse({ detail: "Authentication required" }, 401),
    );

  await expect(restoreSession()).resolves.toEqual(session);
  expect(getCsrfToken()).toBe("csrf-proof");
  await expect(restoreSession()).resolves.toBeNull();
  expect(getCsrfToken()).toBeNull();
});

test("sends the CSRF proof when signing out", async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse(session))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  await restoreSession();

  await expect(logout()).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/session",
    expect.objectContaining({
      method: "DELETE",
      headers: expect.objectContaining({ "X-CSRF-Token": "csrf-proof" }),
    }),
  );
  expect(getCsrfToken()).toBeNull();
});

test("translates safe authentication failures", async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ detail: "Invalid email or password" }, 401),
    )
    .mockResolvedValueOnce(jsonResponse({ detail: "Too many requests" }, 429));

  await expect(
    login("developer@example.com", "this password is incorrect"),
  ).rejects.toEqual(new AuthApiError("Email or password is incorrect."));
  await expect(
    register("developer@example.com", "correct horse battery staple"),
  ).rejects.toEqual(
    new AuthApiError("Too many attempts. Please wait and try again."),
  );
});

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

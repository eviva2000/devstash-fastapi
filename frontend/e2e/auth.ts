import { expect, type Page, type TestInfo } from "@playwright/test";

let account: { email: string; password: string } | undefined;

export async function registerAccount(
  page: Page,
  credentials: { email: string; password: string },
) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  const registrationResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/users") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create account" }).click();
  const response = await registrationResponse;
  expect(response.status(), await response.text()).toBe(201);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function authenticate(page: Page, testInfo: TestInfo) {
  if (account === undefined) {
    account = {
      email: `e2e-worker-${testInfo.workerIndex}-${Date.now()}@example.com`,
      password: "e2e correct horse battery staple",
    };
    await registerAccount(page, account);
  } else {
    await page.goto("/login");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function authenticatedHeaders(page: Page) {
  const response = await page.request.get("/api/session");
  expect(response.status()).toBe(200);
  const session = (await response.json()) as { csrf_token: string };
  return {
    Origin: new URL(page.url()).origin,
    "X-CSRF-Token": session.csrf_token,
  };
}

export async function removeItem(page: Page, itemId: string) {
  const response = await page.request.delete(`/api/items/${itemId}`, {
    headers: await authenticatedHeaders(page),
  });
  expect([204, 404]).toContain(response.status());
}

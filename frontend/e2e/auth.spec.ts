import { expect, test } from "@playwright/test";

import { authenticate } from "./auth";

test("restores and revokes a browser session", async ({ page }, testInfo) => {
  await authenticate(page, testInfo);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "Sign in to DevStash" }),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

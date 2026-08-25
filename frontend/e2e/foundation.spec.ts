import { expect, test } from "@playwright/test";

test("shows the connected full-stack foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "DevStash" })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Keep the useful parts of your work within reach.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("API connected");
});

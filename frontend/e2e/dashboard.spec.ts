import { expect, test } from "@playwright/test";

test("shows the dashboard and supports desktop sidebar collapse", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent collections" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent items" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
});

test("keeps the desktop sidebar fixed while dashboard content scrolls", async ({
  page,
}) => {
  await page.goto("/dashboard");
  const sidebar = page.getByRole("complementary", {
    name: "Dashboard navigation",
  });
  await expect(sidebar).toBeVisible();

  const initialTop = await sidebar.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const scrolledTop = await sidebar.evaluate(
    (element) => element.getBoundingClientRect().top,
  );

  expect(Math.abs(initialTop - scrolledTop)).toBeLessThan(1);
});

test("uses a navigation drawer on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  const openNavigation = page.getByRole("button", { name: "Open navigation" });
  await openNavigation.click();
  await expect(
    page.getByRole("dialog", { name: "Mobile navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close navigation", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Mobile navigation" }),
  ).toBeHidden();
  await expect(openNavigation).toBeFocused();
});

test("uses responsive recent-item grid columns", async ({ page }) => {
  const recentGrid = page.getByTestId("recent-items-grid");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  expect(
    (
      await recentGrid.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns,
      )
    ).split(" "),
  ).toHaveLength(1);

  await page.setViewportSize({ width: 900, height: 900 });
  expect(
    (
      await recentGrid.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns,
      )
    ).split(" "),
  ).toHaveLength(3);

  await page.setViewportSize({ width: 1440, height: 900 });
  expect(
    (
      await recentGrid.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns,
      )
    ).split(" "),
  ).toHaveLength(4);
});

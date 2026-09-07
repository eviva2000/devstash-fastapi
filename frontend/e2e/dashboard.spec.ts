import { expect, test, type Page } from "@playwright/test";

import { authenticate, authenticatedHeaders, removeItem } from "./auth";

async function sidebarItemTypeCount(page: Page, slug: string) {
  const link = page.locator(`a[href="/items/${slug}"]`);
  await expect(link).toHaveAttribute("aria-label", /, \d+ items?$/);
  const label = await link.getAttribute("aria-label");
  const count = label?.match(/, (\d+) items?$/)?.[1];
  expect(
    count,
    `Expected a live count in sidebar label: ${label}`,
  ).toBeDefined();
  return Number(count);
}

test("shows the dashboard and supports desktop sidebar collapse", async ({
  page,
}, testInfo) => {
  await authenticate(page, testInfo);
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

test("creates, edits, and deletes a collection with persisted state", async ({
  page,
}, testInfo) => {
  const name = `Release references ${Date.now()}`;
  const itemTitle = `Collection member ${Date.now()}`;
  await authenticate(page, testInfo);
  const itemResponse = await page.request.post("/api/items", {
    headers: await authenticatedHeaders(page),
    data: {
      title: itemTitle,
      content: "Membership test item",
      item_type: "note",
      language: null,
    },
  });
  expect(itemResponse.status()).toBe(201);
  const itemId = ((await itemResponse.json()) as { id: string }).id;
  await page.reload();

  await page.getByRole("button", { name: "New collection" }).click();
  const dialog = page.getByRole("dialog", { name: "Create collection" });
  await dialog.getByLabel("Name").fill(name);
  await dialog
    .getByLabel("Description")
    .fill("Checklists and notes for safe releases");
  await dialog
    .getByRole("button", { name: "Create collection", exact: true })
    .click();

  await expect(page.getByRole("status")).toContainText(
    `“${name}” was created.`,
  );
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
  await page.keyboard.press("Control+K");
  const palette = page.getByRole("dialog", { name: "Global search" });
  await palette
    .getByRole("combobox", { name: "Search items and collections" })
    .fill(name);
  await expect(
    palette.getByRole("option", { name: new RegExp(`${name}\\s+0 items`) }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: `Open ${name}` }).click();
  let drawer = page.getByRole("dialog", { name });
  await drawer.getByRole("button", { name: "Edit" }).click();
  const updatedName = `${name} updated`;
  await drawer.getByLabel("Name").fill(updatedName);
  await drawer.getByLabel("Description").fill("Updated release knowledge");
  await drawer.getByRole("button", { name: "Save changes" }).click();
  drawer = page.getByRole("dialog", { name: updatedName });
  await expect(drawer.getByText("Updated release knowledge")).toBeVisible();
  await drawer.getByRole("button", { name: "Edit" }).click();
  await drawer.getByRole("combobox", { name: "Add item" }).click();
  await page.getByRole("option", { name: itemTitle }).click();
  await expect(drawer.getByText("Current items (1)")).toBeVisible();
  await expect(
    drawer.getByRole("button", {
      name: `Remove ${itemTitle} from collection`,
    }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: `Open ${updatedName}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Open ${updatedName}` }).click();
  drawer = page.getByRole("dialog", { name: updatedName });
  await expect(drawer.getByText("Items (1)")).toBeVisible();
  await expect(drawer.getByText(itemTitle)).toBeVisible();
  await drawer.getByRole("button", { name: "Edit" }).click();
  await drawer
    .getByRole("button", {
      name: `Remove ${itemTitle} from collection`,
    })
    .click();
  await expect(drawer.getByText("Current items (0)")).toBeVisible();
  await drawer.getByRole("button", { name: "Cancel" }).click();
  await drawer.getByRole("button", { name: "Delete" }).click();
  const confirmation = page.getByRole("alertdialog", {
    name: `Delete “${updatedName}”?`,
  });
  await expect(confirmation.getByText(/cannot be undone/i)).toBeVisible();
  await confirmation.getByRole("button", { name: "Delete collection" }).click();
  await expect(page.getByRole("dialog", { name: updatedName })).toBeHidden();
  await expect(
    page.getByRole("button", { name: `Open ${updatedName}` }),
  ).toBeHidden();

  await page.reload();
  await expect(
    page.getByRole("button", { name: `Open ${updatedName}` }),
  ).toHaveCount(0);
  await removeItem(page, itemId);
});

test("keeps sidebar item type counts synchronized with item mutations", async ({
  page,
}, testInfo) => {
  const title = `Sidebar count item ${Date.now()}`;
  await authenticate(page, testInfo);
  const initialNotes = await sidebarItemTypeCount(page, "notes");
  const initialPrompts = await sidebarItemTypeCount(page, "prompts");

  await page.getByRole("button", { name: "New item" }).click();
  const createDialog = page.getByRole("dialog", { name: "Create item" });
  await createDialog.getByLabel("Title").fill(title);
  await createDialog.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Note", exact: true }).click();
  await createDialog
    .getByRole("textbox", { name: "Content" })
    .fill("Live counts");
  await createDialog
    .getByRole("button", { name: "Create item", exact: true })
    .click();

  let drawer = page.getByRole("dialog", { name: title });
  await expect(drawer).toBeVisible();
  await expect(page.locator('a[href="/items/notes"]')).toHaveAttribute(
    "aria-label",
    `Notes, ${initialNotes + 1} ${initialNotes === 0 ? "item" : "items"}`,
  );

  await drawer.getByRole("button", { name: "Edit" }).click();
  await drawer.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Prompt", exact: true }).click();
  await drawer.getByRole("button", { name: "Save changes" }).click();
  drawer = page.getByRole("dialog", { name: title });
  await expect(drawer).toBeVisible();
  await expect(page.locator('a[href="/items/notes"]')).toHaveAttribute(
    "aria-label",
    `Notes, ${initialNotes} ${initialNotes === 1 ? "item" : "items"}`,
  );
  await expect(page.locator('a[href="/items/prompts"]')).toHaveAttribute(
    "aria-label",
    `Prompts, ${initialPrompts + 1} ${initialPrompts === 0 ? "item" : "items"}`,
  );

  await drawer.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("alertdialog", { name: `Delete “${title}”?` })
    .getByRole("button", { name: "Delete item" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator('a[href="/items/prompts"]')).toHaveAttribute(
    "aria-label",
    `Prompts, ${initialPrompts} ${initialPrompts === 1 ? "item" : "items"}`,
  );

  await page.reload();
  expect(await sidebarItemTypeCount(page, "notes")).toBe(initialNotes);
  expect(await sidebarItemTypeCount(page, "prompts")).toBe(initialPrompts);
});

test("keeps the desktop sidebar fixed while dashboard content scrolls", async ({
  page,
}, testInfo) => {
  await authenticate(page, testInfo);
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

test("uses a navigation drawer on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await authenticate(page, testInfo);
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

test("uses responsive recent-item grid columns", async ({ page }, testInfo) => {
  const recentGrid = page.getByTestId("recent-items-grid");

  await page.setViewportSize({ width: 390, height: 844 });
  await authenticate(page, testInfo);
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

test("opens global search from the keyboard and finds prefetched item content", async ({
  page,
}, testInfo) => {
  const marker = `palette-${Date.now()}`;
  const title = `Global search item ${Date.now()}`;
  await authenticate(page, testInfo);
  const createResponse = await page.request.post("/api/items", {
    headers: await authenticatedHeaders(page),
    data: {
      title,
      content: `Unique searchable content ${marker}`,
      item_type: "note",
      language: null,
    },
  });
  expect(createResponse.status()).toBe(201);
  const itemId = ((await createResponse.json()) as { id: string }).id;

  try {
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: "Global search" });
    await expect(palette).toBeVisible();
    await palette
      .getByRole("combobox", { name: "Search items and collections" })
      .fill(marker);
    await expect(
      palette.getByRole("option", { name: new RegExp(title) }),
    ).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("dialog", { name: title })).toBeVisible();
  } finally {
    await removeItem(page, itemId);
  }
});

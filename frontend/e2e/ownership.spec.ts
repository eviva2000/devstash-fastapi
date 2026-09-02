import { expect, test } from "@playwright/test";

import { authenticatedHeaders, registerAccount, removeItem } from "./auth";

test("keeps two browser workspaces isolated", async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== "string")
    throw new Error("Playwright baseURL is required");
  const firstContext = await browser.newContext({ baseURL });
  const secondContext = await browser.newContext({ baseURL });
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const marker = `${testInfo.workerIndex}-${Date.now()}`;
  let firstItemId: string | undefined;
  let secondItemId: string | undefined;

  try {
    await registerAccount(firstPage, {
      email: `first-owner-${marker}@example.com`,
      password: "first correct horse battery staple",
    });
    await registerAccount(secondPage, {
      email: `second-owner-${marker}@example.com`,
      password: "second correct horse battery staple",
    });

    const firstTitle = `First private item ${marker}`;
    const secondTitle = `Second private item ${marker}`;
    const firstCreate = await firstPage.request.post("/api/items", {
      headers: await authenticatedHeaders(firstPage),
      data: {
        title: firstTitle,
        content: `Only the first account can read ${marker}`,
        item_type: "note",
        language: null,
      },
    });
    const secondCreate = await secondPage.request.post("/api/items", {
      headers: await authenticatedHeaders(secondPage),
      data: {
        title: secondTitle,
        content: `Only the second account can read ${marker}`,
        item_type: "note",
        language: null,
      },
    });
    expect(firstCreate.status()).toBe(201);
    expect(secondCreate.status()).toBe(201);
    firstItemId = ((await firstCreate.json()) as { id: string }).id;
    secondItemId = ((await secondCreate.json()) as { id: string }).id;

    const firstSearch = await firstPage.request.get(
      `/api/items?q=${encodeURIComponent(secondTitle)}`,
    );
    const secondSearch = await secondPage.request.get(
      `/api/items?q=${encodeURIComponent(firstTitle)}`,
    );
    expect((await firstSearch.json()) as { total: number }).toMatchObject({
      total: 0,
    });
    expect((await secondSearch.json()) as { total: number }).toMatchObject({
      total: 0,
    });

    expect(
      (await secondPage.request.get(`/api/items/${firstItemId}`)).status(),
    ).toBe(404);
    expect(
      (
        await secondPage.request.patch(`/api/items/${firstItemId}`, {
          headers: await authenticatedHeaders(secondPage),
          data: { title: "Unauthorized edit" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await secondPage.request.delete(`/api/items/${firstItemId}`, {
          headers: await authenticatedHeaders(secondPage),
        })
      ).status(),
    ).toBe(404);
    expect(
      (await firstPage.request.get(`/api/items/${firstItemId}`)).status(),
    ).toBe(200);

    await Promise.all([firstPage.reload(), secondPage.reload()]);
    await expect(firstPage.getByText(firstTitle)).toBeVisible();
    await expect(firstPage.getByText(secondTitle)).toHaveCount(0);
    await expect(secondPage.getByText(secondTitle)).toBeVisible();
    await expect(secondPage.getByText(firstTitle)).toHaveCount(0);

    await firstPage.keyboard.press("Control+K");
    const firstPalette = firstPage.getByRole("dialog", {
      name: "Global search",
    });
    await firstPalette
      .getByRole("combobox", { name: "Search items and collections" })
      .fill(secondTitle);
    await expect(
      firstPalette.getByRole("option", { name: new RegExp(secondTitle) }),
    ).toHaveCount(0);

    await secondPage.keyboard.press("Control+K");
    const secondPalette = secondPage.getByRole("dialog", {
      name: "Global search",
    });
    await secondPalette
      .getByRole("combobox", { name: "Search items and collections" })
      .fill(firstTitle);
    await expect(
      secondPalette.getByRole("option", { name: new RegExp(firstTitle) }),
    ).toHaveCount(0);
  } finally {
    if (firstItemId) await removeItem(firstPage, firstItemId);
    if (secondItemId) await removeItem(secondPage, secondItemId);
    await firstContext.close();
    await secondContext.close();
  }
});

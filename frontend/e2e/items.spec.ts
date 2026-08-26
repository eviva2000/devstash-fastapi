import { expect, test } from "@playwright/test";

test("previews Markdown notes before saving and while reopening and editing", async ({
  page,
  request,
}) => {
  const title = `E2E Markdown note ${Date.now()}`;
  const markdown = "# Deployment checklist\n\n- [x] Preview before saving";
  const updatedMarkdown = `${markdown}\n\n> Keep the dashboard route stable.`;
  let itemId: string | undefined;

  try {
    await page.goto("/dashboard");
    const dashboardUrl = page.url();
    await page.getByRole("button", { name: "New item" }).click();

    const createDrawer = page.getByRole("dialog", { name: "Create item" });
    await createDrawer.getByLabel("Title").fill(title);
    await createDrawer.getByLabel("Type").selectOption("note");
    await createDrawer.getByRole("textbox", { name: "Content" }).fill(markdown);
    await createDrawer.getByRole("tab", { name: "Preview" }).click();
    await expect(
      createDrawer.getByRole("heading", { name: "Deployment checklist" }),
    ).toBeVisible();

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/items") &&
        response.request().method() === "POST",
    );
    await createDrawer.getByRole("button", { name: "Create item" }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    itemId = ((await createResponse.json()) as { id: string }).id;

    const detailsDrawer = page.getByRole("dialog", { name: title });
    await expect(
      detailsDrawer.getByRole("heading", { name: "Deployment checklist" }),
    ).toBeVisible();
    await expect(
      detailsDrawer.getByRole("tab", { name: "Preview" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      detailsDrawer.getByRole("textbox", { name: "Content" }),
    ).toHaveCount(0);

    await detailsDrawer.getByRole("button", { name: "Edit" }).click();
    await detailsDrawer
      .getByRole("textbox", { name: "Content" })
      .fill(updatedMarkdown);
    await detailsDrawer.getByRole("tab", { name: "Preview" }).click();
    await expect(
      detailsDrawer.getByText("Keep the dashboard route stable."),
    ).toBeVisible();

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/items/${itemId}`) &&
        response.request().method() === "PATCH",
    );
    await detailsDrawer.getByRole("button", { name: "Save changes" }).click();
    expect((await updateResponsePromise).status()).toBe(200);
    await expect(page).toHaveURL(dashboardUrl);
  } finally {
    if (itemId) await request.delete(`/api/items/${itemId}`);
  }
});

test("creates, reopens, edits, and deletes an item in the dashboard drawer", async ({
  page,
  request,
}) => {
  const title = `E2E snippet ${Date.now()}`;
  const updatedTitle = `${title} updated`;
  let itemId: string | undefined;

  try {
    await page.goto("/dashboard");
    const dashboardUrl = page.url();
    await page.getByRole("button", { name: "New item" }).click();

    const createDrawer = page.getByRole("dialog", { name: "Create item" });
    await createDrawer.getByLabel("Title").fill(title);
    await createDrawer.getByLabel("Type").selectOption("snippet");
    await createDrawer.getByLabel("Language (optional)").fill("typescript");
    await createDrawer
      .getByLabel("Content")
      .fill("export const answer: number = 42;");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/items") &&
        response.request().method() === "POST",
    );
    await createDrawer.getByRole("button", { name: "Create item" }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    itemId = ((await createResponse.json()) as { id: string }).id;

    const createdDrawer = page.getByRole("dialog", { name: title });
    await expect(createdDrawer).toBeVisible();
    await expect(page).toHaveURL(dashboardUrl);
    await createdDrawer
      .getByRole("button", { name: "Close item drawer" })
      .click();

    await page.getByRole("button", { name: `Open ${title}` }).click();
    const detailsDrawer = page.getByRole("dialog", { name: title });
    await detailsDrawer.getByRole("button", { name: "Edit" }).click();
    await detailsDrawer.getByLabel("Title").fill(updatedTitle);
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/items/${itemId}`) &&
        response.request().method() === "PATCH",
    );
    await detailsDrawer.getByRole("button", { name: "Save changes" }).click();
    expect((await updateResponsePromise).status()).toBe(200);
    await expect(
      page.getByRole("dialog", { name: updatedTitle }),
    ).toBeVisible();
    await expect(page).toHaveURL(dashboardUrl);

    page.once("dialog", (dialog) => dialog.accept());
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/items/${itemId}`) &&
        response.request().method() === "DELETE",
    );
    await page
      .getByRole("dialog", { name: updatedTitle })
      .getByRole("button", { name: "Delete" })
      .click();
    expect((await deleteResponsePromise).status()).toBe(204);
    itemId = undefined;
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("button", { name: `Open ${updatedTitle}` }),
    ).toHaveCount(0);
  } finally {
    if (itemId) await request.delete(`/api/items/${itemId}`);
  }
});

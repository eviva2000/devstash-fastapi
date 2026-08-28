import { expect, test, type Locator, type Page } from "@playwright/test";

async function typeMonacoSource(page: Page, editor: Locator, source: string) {
  await editor.locator(".monaco-editor").click();
  await page.keyboard.insertText(source);
}

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
    await createDrawer
      .getByRole("button", { name: "Create item", exact: true })
      .click();
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

test("creates an item in a dialog, then reopens, edits, and deletes it in the drawer", async ({
  context,
  page,
  request,
}) => {
  const title = `E2E snippet ${Date.now()}`;
  const updatedTitle = `${title} updated`;
  const source = "export const answer: number = 42;";
  const appendedSource = "\nexport const nextAnswer: number = 43;";
  let itemId: string | undefined;

  try {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:5173",
    });
    await page.goto("/dashboard");
    const dashboardUrl = page.url();
    await page.getByRole("button", { name: "New item" }).click();

    const createDialog = page.getByRole("dialog", { name: "Create item" });
    await createDialog.getByLabel("Title").fill(title);
    await createDialog.getByLabel("Type").selectOption("snippet");
    await createDialog
      .getByRole("combobox", { name: "Language (optional)" })
      .click();
    await page.getByRole("option", { name: "TypeScript", exact: true }).click();
    const createEditor = createDialog.getByRole("group", {
      name: "Content code editor",
    });
    await expect(createEditor.getByText("TypeScript")).toBeVisible();
    await expect(createEditor.getByTestId("window-controls")).toBeVisible();
    await typeMonacoSource(page, createEditor, source);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/items") &&
        response.request().method() === "POST",
    );
    await createDialog
      .getByRole("button", { name: "Create item", exact: true })
      .click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    itemId = ((await createResponse.json()) as { id: string }).id;

    const createdDrawer = page.getByRole("dialog", { name: title });
    await expect(createdDrawer).toBeVisible();
    const readOnlyEditor = createdDrawer.getByRole("group", {
      name: `${title} content code editor`,
    });
    await expect(readOnlyEditor.getByText("TypeScript")).toBeVisible();
    await expect(readOnlyEditor).toHaveAttribute("aria-readonly", "true");
    await readOnlyEditor.getByRole("button", { name: "Copy code" }).click();
    await expect(readOnlyEditor.getByRole("status")).toHaveText("Copied");
    await expect(page).toHaveURL(dashboardUrl);
    await createdDrawer
      .getByRole("button", { name: "Close item drawer" })
      .click();

    await page.getByRole("button", { name: `Open ${title}` }).click();
    const detailsDrawer = page.getByRole("dialog", { name: title });
    await detailsDrawer.getByRole("button", { name: "Edit" }).click();
    await detailsDrawer.getByLabel("Title").fill(updatedTitle);
    await typeMonacoSource(
      page,
      detailsDrawer.getByRole("group", { name: "Content code editor" }),
      appendedSource,
    );
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/items/${itemId}`) &&
        response.request().method() === "PATCH",
    );
    await detailsDrawer.getByRole("button", { name: "Save changes" }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.status()).toBe(200);
    const updatedPayload = updateResponse.request().postDataJSON() as {
      content: string;
    };
    expect(updatedPayload.content).toContain(source);
    expect(updatedPayload.content).toContain(
      "export const nextAnswer: number = 43;",
    );
    await expect(
      page.getByRole("dialog", { name: updatedTitle }),
    ).toBeVisible();
    await expect(page).toHaveURL(dashboardUrl);

    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/items/${itemId}`) &&
        response.request().method() === "DELETE",
    );
    await page
      .getByRole("dialog", { name: updatedTitle })
      .getByRole("button", { name: "Delete" })
      .click();
    const deleteAlert = page.getByRole("alertdialog", {
      name: `Delete “${updatedTitle}”?`,
    });
    await expect(deleteAlert).toBeVisible();
    await deleteAlert.getByRole("button", { name: "Delete item" }).click();
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

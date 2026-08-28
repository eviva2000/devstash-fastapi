import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { Item } from "@/api/items";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

const apiMocks = vi.hoisted(() => ({
  fetchItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

vi.mock("@/components/items/lazy-code-editor", () => ({
  LazyCodeEditor: ({
    value,
    language,
    onChange,
    label,
    readOnly,
  }: {
    value: string;
    language: { id: string; label: string };
    onChange: (value: string) => void;
    label: string;
    readOnly: boolean;
  }) => (
    <div role="group" aria-label={`${label} code editor`}>
      <span>{language.label}</span>
      <textarea
        aria-label={label}
        data-language={language.id}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  ),
}));

vi.mock("@/api/items", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/items")>();
  return {
    ...actual,
    fetchItems: apiMocks.fetchItems,
    createItem: apiMocks.createItem,
    updateItem: apiMocks.updateItem,
    deleteItem: apiMocks.deleteItem,
  };
});

const items: Item[] = Array.from({ length: 7 }, (_, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  title: index === 0 ? "useAuth Hook" : `Saved item ${index + 1}`,
  content:
    index === 0
      ? "Custom authentication hook for React applications"
      : `Content ${index + 1}`,
  item_type: index % 2 === 0 ? "snippet" : "note",
  language: index % 2 === 0 ? "typescript" : null,
  created_at: `2026-08-${String(20 - index).padStart(2, "0")}T09:00:00Z`,
  updated_at: `2026-08-${String(20 - index).padStart(2, "0")}T09:00:00Z`,
}));

function itemPage(entries: Item[]) {
  return { items: entries, page: 1, page_size: 12, total: entries.length };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.fetchItems.mockResolvedValue(itemPage(items));
});

afterEach(() => vi.restoreAllMocks());

function LocationProbe() {
  const location = useLocation();
  return (
    <>
      <span data-testid="location">{location.pathname}</span>
      <span data-testid="search-params">{location.search}</span>
    </>
  );
}

function renderDashboard(initialEntry = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DashboardPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

test("renders dashboard overview and its server-provided item page", async () => {
  renderDashboard();
  expect(screen.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  expect(screen.getByText("Total items")).toBeVisible();
  expect(
    screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/items/snippets"),
  ).toBeVisible();
  const recentSection = screen.getByRole("heading", {
    name: "Recent items",
  }).parentElement;
  expect(recentSection).not.toBeNull();
  await waitFor(() =>
    expect(
      within(recentSection!).getAllByRole("heading", { level: 3 }),
    ).toHaveLength(7),
  );
  expect(screen.getByText("Saved item 7")).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Pinned" }),
  ).not.toBeInTheDocument();
});

test("shows loading, empty, and recoverable request-error states", async () => {
  let resolveItems: ((value: ReturnType<typeof itemPage>) => void) | undefined;
  apiMocks.fetchItems.mockReturnValueOnce(
    new Promise<ReturnType<typeof itemPage>>((resolve) => {
      resolveItems = resolve;
    }),
  );
  const loadingView = renderDashboard();
  expect(screen.getByText("Loading items…")).toBeVisible();
  resolveItems?.(itemPage([]));
  expect(
    await screen.findByRole("heading", { name: "No items yet" }),
  ).toBeVisible();
  loadingView.unmount();

  apiMocks.fetchItems
    .mockRejectedValueOnce(new Error("Items are temporarily unavailable."))
    .mockResolvedValueOnce(itemPage(items));
  const user = userEvent.setup();
  renderDashboard();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Items are temporarily unavailable.",
  );
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("button", { name: "Open useAuth Hook" }),
  ).toBeVisible();
});

test("restores shareable search and filter state from the URL", async () => {
  apiMocks.fetchItems.mockResolvedValueOnce(itemPage([items[0]]));

  renderDashboard(
    "/dashboard?q=authentication&type=snippet&language=typescript&page=2",
  );

  expect(screen.getByRole("textbox", { name: "Search items" })).toHaveValue(
    "authentication",
  );
  expect(screen.getByRole("combobox", { name: "Filter by type" })).toHaveValue(
    "snippet",
  );
  expect(
    screen.getByRole("combobox", { name: "Filter by language" }),
  ).toHaveValue("typescript");
  await waitFor(() =>
    expect(apiMocks.fetchItems).toHaveBeenCalledWith(
      {
        q: "authentication",
        itemType: "snippet",
        language: "typescript",
        page: 2,
        pageSize: 12,
      },
      expect.any(AbortSignal),
    ),
  );
});

test("shows a distinct no-results state and clears URL filters", async () => {
  apiMocks.fetchItems.mockResolvedValue(itemPage([]));
  const user = userEvent.setup();
  renderDashboard("/dashboard?q=missing&type=note");

  expect(
    await screen.findByRole("heading", { name: "No matching items" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Clear filters" }));

  expect(screen.getByTestId("search-params")).toHaveTextContent("");
  expect(screen.getByRole("textbox", { name: "Search items" })).toHaveValue("");
});

test("creates an item in a modal with a selectable snippet language", async () => {
  apiMocks.fetchItems.mockResolvedValueOnce(itemPage([]));
  const created: Item = {
    ...items[0],
    id: "10000000-0000-4000-8000-000000000000",
    title: "Deployment checklist",
    content: "Check migrations before deploy",
    item_type: "note",
    language: null,
  };
  apiMocks.createItem
    .mockRejectedValueOnce(new Error("The item could not be saved."))
    .mockResolvedValueOnce(created);
  const user = userEvent.setup();
  renderDashboard();
  await screen.findByRole("heading", { name: "No items yet" });

  await user.click(screen.getByRole("button", { name: "New item" }));
  const createDialog = screen.getByRole("dialog", { name: "Create item" });
  expect(
    within(createDialog).getByText("Add a snippet, prompt, command, or note."),
  ).toBeVisible();
  expect(
    within(createDialog).getByRole("combobox", {
      name: "Language (optional)",
    }),
  ).toBeVisible();
  await user.click(
    within(createDialog).getByRole("combobox", {
      name: "Language (optional)",
    }),
  );
  await user.click(screen.getByRole("option", { name: "TypeScript" }));
  expect(
    within(createDialog).getByRole("combobox", {
      name: "Language (optional)",
    }),
  ).toHaveTextContent("TypeScript");
  await user.click(
    within(createDialog).getByRole("button", { name: "Create item" }),
  );
  expect(within(createDialog).getByText("Title is required.")).toBeVisible();
  expect(within(createDialog).getByText("Content is required.")).toBeVisible();

  await user.type(within(createDialog).getByLabelText("Title"), created.title);
  await user.selectOptions(within(createDialog).getByLabelText("Type"), "note");
  expect(
    within(createDialog).queryByRole("combobox", {
      name: "Language (optional)",
    }),
  ).not.toBeInTheDocument();
  await user.type(
    within(createDialog).getByLabelText("Content"),
    created.content,
  );
  await user.click(
    within(createDialog).getByRole("button", { name: "Create item" }),
  );
  expect(await within(createDialog).findByRole("alert")).toHaveTextContent(
    "The item could not be saved.",
  );
  expect(createDialog).toBeVisible();
  await user.click(
    within(createDialog).getByRole("button", { name: "Create item" }),
  );

  await waitFor(() =>
    expect(apiMocks.createItem).toHaveBeenCalledWith({
      title: created.title,
      content: created.content,
      item_type: "note",
      language: null,
    }),
  );
  expect(
    within(screen.getByRole("dialog")).getByRole("heading", {
      name: created.title,
    }),
  ).toBeVisible();
  expect(
    within(screen.getByRole("dialog")).getByRole("tab", { name: "Preview" }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    within(screen.getByRole("dialog")).queryByRole("textbox", {
      name: "Content",
    }),
  ).not.toBeInTheDocument();
  expect(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Close item drawer",
    }),
  ).toHaveFocus();
  expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
});

test("returns focus to the New item button when the creation modal closes", async () => {
  const user = userEvent.setup();
  renderDashboard();

  const newItemButton = screen.getByRole("button", { name: "New item" });
  await user.click(newItemButton);
  const createDialog = screen.getByRole("dialog", { name: "Create item" });
  await user.click(
    within(createDialog).getByRole("button", {
      name: "Close create item dialog",
    }),
  );

  expect(screen.queryByRole("dialog", { name: "Create item" })).toBeNull();
  expect(newItemButton).toHaveFocus();
});

test("renders and edits prompt Markdown inside the item drawer", async () => {
  const prompt: Item = {
    ...items[1],
    title: "Review prompt",
    content: "# Review checklist\n\n- Check types",
    item_type: "prompt",
  };
  apiMocks.fetchItems.mockResolvedValueOnce(itemPage([prompt]));
  const user = userEvent.setup();
  renderDashboard();

  await user.click(
    await screen.findByRole("button", { name: "Open Review prompt" }),
  );
  const dialog = screen.getByRole("dialog", { name: "Review prompt" });
  expect(
    within(dialog).getByRole("heading", { name: "Review checklist", level: 1 }),
  ).toBeVisible();
  expect(
    within(dialog).queryByRole("tab", { name: "Write" }),
  ).not.toBeInTheDocument();
  expect(within(dialog).getByRole("tab", { name: "Preview" })).toBeVisible();

  await user.click(within(dialog).getByRole("button", { name: "Edit" }));
  expect(within(dialog).getByRole("tab", { name: "Write" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(within(dialog).getByRole("textbox", { name: "Content" })).toHaveValue(
    prompt.content,
  );
});

test("renders commands with a Shell code editor in view and edit modes", async () => {
  const command: Item = {
    ...items[0],
    title: "Build command",
    content: "npm run build",
    item_type: "command",
    language: null,
  };
  apiMocks.fetchItems.mockResolvedValueOnce(itemPage([command]));
  const user = userEvent.setup();
  renderDashboard();

  await user.click(
    await screen.findByRole("button", { name: "Open Build command" }),
  );
  const dialog = screen.getByRole("dialog", { name: "Build command" });
  let editor = within(dialog).getByRole("textbox", {
    name: "Build command content",
  });
  expect(editor).toHaveAttribute("readonly");
  expect(editor).toHaveAttribute("data-language", "shell");
  expect(within(dialog).getByText("Shell")).toBeVisible();

  await user.click(within(dialog).getByRole("button", { name: "Edit" }));
  editor = within(dialog).getByRole("textbox", { name: "Content" });
  expect(editor).not.toHaveAttribute("readonly");
  expect(editor).toHaveAttribute("data-language", "shell");
  expect(
    within(dialog).queryByLabelText("Language (optional)"),
  ).not.toBeInTheDocument();
});

test("cancels drawer editing without changing the item", async () => {
  const user = userEvent.setup();
  renderDashboard();
  await user.click(
    await screen.findByRole("button", { name: "Open useAuth Hook" }),
  );
  const dialog = screen.getByRole("dialog", { name: "useAuth Hook" });
  await user.click(within(dialog).getByRole("button", { name: "Edit" }));
  await user.clear(within(dialog).getByLabelText("Title"));
  await user.type(within(dialog).getByLabelText("Title"), "Discarded title");
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

  expect(
    within(dialog).getByRole("heading", { name: "useAuth Hook" }),
  ).toBeVisible();
  expect(within(dialog).queryByLabelText("Title")).not.toBeInTheDocument();
  expect(apiMocks.updateItem).not.toHaveBeenCalled();
  expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
});

test("views, edits, and deletes an item inside the drawer without routing", async () => {
  const updated = {
    ...items[0],
    title: "Updated authentication hook",
    item_type: "prompt" as const,
    language: null,
    updated_at: "2026-08-26T12:00:00Z",
  };
  apiMocks.updateItem.mockResolvedValueOnce(updated);
  apiMocks.deleteItem.mockResolvedValueOnce(undefined);
  const user = userEvent.setup();
  renderDashboard();

  const itemButton = await screen.findByRole("button", {
    name: "Open useAuth Hook",
  });
  await user.click(itemButton);
  let dialog = screen.getByRole("dialog", { name: "useAuth Hook" });
  expect(within(dialog).queryByRole("tab")).not.toBeInTheDocument();
  expect(
    within(dialog).getByRole("textbox", { name: "useAuth Hook content" }),
  ).toHaveAttribute("readonly");
  expect(within(dialog).getByText("TypeScript")).toBeVisible();
  await user.click(within(dialog).getByRole("button", { name: "Edit" }));
  expect(within(dialog).queryByRole("tab")).not.toBeInTheDocument();
  const titleInput = within(dialog).getByLabelText("Title");
  await user.clear(titleInput);
  await user.type(titleInput, updated.title);
  await user.selectOptions(within(dialog).getByLabelText("Type"), "prompt");
  await user.click(
    within(dialog).getByRole("button", { name: "Save changes" }),
  );

  dialog = await screen.findByRole("dialog", { name: updated.title });
  expect(apiMocks.updateItem).toHaveBeenCalledWith(items[0].id, {
    title: updated.title,
    content: items[0].content,
    item_type: "prompt",
    language: null,
  });
  const updatedCard = screen
    .getByRole("button", { name: `Open ${updated.title}`, hidden: true })
    .closest<HTMLDivElement>("div.rounded-xl");
  expect(updatedCard).toHaveClass("border-l-violet-500");
  expect(within(updatedCard!).getByTestId("item-type-icon")).toHaveClass(
    "text-violet-400",
  );
  expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");

  await user.click(within(dialog).getByRole("button", { name: "Delete" }));
  const deleteAlert = screen.getByRole("alertdialog", {
    name: `Delete “${updated.title}”?`,
  });
  expect(apiMocks.deleteItem).not.toHaveBeenCalled();
  expect(
    within(deleteAlert).getByText(
      "This action cannot be undone. The item will be permanently deleted.",
    ),
  ).toBeVisible();
  await user.click(
    within(deleteAlert).getByRole("button", { name: "Delete item" }),
  );
  await waitFor(() =>
    expect(apiMocks.deleteItem).toHaveBeenCalledWith(items[0].id),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: `Open ${updated.title}` }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "New item" })).toHaveFocus();
});

test("keeps an item visible and reports a failed delete", async () => {
  apiMocks.deleteItem.mockRejectedValueOnce(
    new Error("Delete request failed."),
  );
  const user = userEvent.setup();
  renderDashboard();

  await user.click(
    await screen.findByRole("button", { name: "Open useAuth Hook" }),
  );
  const dialog = screen.getByRole("dialog", { name: "useAuth Hook" });
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));
  const deleteAlert = screen.getByRole("alertdialog", {
    name: "Delete “useAuth Hook”?",
  });
  await user.click(
    within(deleteAlert).getByRole("button", { name: "Delete item" }),
  );

  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Delete request failed.",
  );
  expect(dialog).toBeVisible();
  expect(screen.getByText("useAuth Hook", { selector: "h3" })).toBeVisible();
});

test("cancels deletion and restores focus to the drawer Delete button", async () => {
  const user = userEvent.setup();
  renderDashboard();

  await user.click(
    await screen.findByRole("button", { name: "Open useAuth Hook" }),
  );
  const drawer = screen.getByRole("dialog", { name: "useAuth Hook" });
  const deleteButton = within(drawer).getByRole("button", { name: "Delete" });
  await user.click(deleteButton);
  const deleteAlert = screen.getByRole("alertdialog", {
    name: "Delete “useAuth Hook”?",
  });
  await user.click(within(deleteAlert).getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(deleteButton).toHaveFocus();
  expect(apiMocks.deleteItem).not.toHaveBeenCalled();
  expect(drawer).toBeVisible();
});

test("collapses and expands the desktop sidebar", async () => {
  const user = userEvent.setup();
  renderDashboard();
  await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(
    screen.getByRole("button", { name: "Collapse sidebar" }),
  ).toBeVisible();
});

test("opens the mobile drawer and closes it with Escape", async () => {
  const user = userEvent.setup();
  renderDashboard();
  const openNavigation = screen.getByRole("button", {
    name: "Open navigation",
  });
  await user.click(openNavigation);
  expect(
    screen.getByRole("dialog", { name: "Mobile navigation" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Close navigation" }),
  ).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("dialog", { name: "Mobile navigation" }),
  ).not.toBeInTheDocument();
  expect(openNavigation).toHaveFocus();
});

import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { Collection } from "@/api/collections";
import type { Item } from "@/api/items";
import type { User } from "@/api/auth";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { collections as mockCollections } from "@/lib/mock-data";

const apiMocks = vi.hoisted(() => ({
  fetchItems: vi.fn(),
  fetchAllItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  fetchCollections: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  addCollectionItem: vi.fn(),
  removeCollectionItem: vi.fn(),
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
    fetchAllItems: apiMocks.fetchAllItems,
    createItem: apiMocks.createItem,
    updateItem: apiMocks.updateItem,
    deleteItem: apiMocks.deleteItem,
  };
});

vi.mock("@/api/collections", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/collections")>();
  return {
    ...actual,
    fetchCollections: apiMocks.fetchCollections,
    createCollection: apiMocks.createCollection,
    updateCollection: apiMocks.updateCollection,
    deleteCollection: apiMocks.deleteCollection,
    addCollectionItem: apiMocks.addCollectionItem,
    removeCollectionItem: apiMocks.removeCollectionItem,
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

const user: User = {
  id: "bbfe91a0-29f7-43a7-b917-42f3cccf7930",
  email: "developer@example.com",
  created_at: "2026-09-01T09:30:00Z",
};

const collections: Collection[] = mockCollections.map((collection, index) => ({
  ...collection,
  itemIds: [],
  createdAt: `2026-08-${String(20 - index).padStart(2, "0")}T09:00:00Z`,
  updatedAt: `2026-08-${String(20 - index).padStart(2, "0")}T09:00:00Z`,
}));

function itemPage(entries: Item[]) {
  return { items: entries, page: 1, page_size: 12, total: entries.length };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.fetchItems.mockResolvedValue(itemPage(items));
  apiMocks.fetchAllItems.mockResolvedValue(items);
  apiMocks.fetchCollections.mockResolvedValue(collections);
});

afterEach(() => vi.restoreAllMocks());

function LocationProbe() {
  const location = useLocation();
  return (
    <>
      <span data-testid="location">{location.pathname}</span>
      <span data-testid="search-params">{location.search}</span>
      <span data-testid="hash">{location.hash}</span>
    </>
  );
}

function renderDashboard(initialEntry = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DashboardPage user={user} onLogout={vi.fn()} />
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

test("shows live owner-scoped item type counts without mock-only categories", async () => {
  apiMocks.fetchItems.mockResolvedValueOnce(itemPage([items[0]]));
  renderDashboard("/dashboard?type=snippet&page=2");

  const sidebar = screen.getByRole("complementary", {
    name: "Dashboard navigation",
  });
  await waitFor(() =>
    expect(
      within(sidebar).getByRole("link", { name: "Snippets, 4 items" }),
    ).toBeVisible(),
  );
  expect(
    within(sidebar).getByRole("link", { name: "Prompts, 0 items" }),
  ).toBeVisible();
  expect(
    within(sidebar).getByRole("link", { name: "Commands, 0 items" }),
  ).toBeVisible();
  expect(
    within(sidebar).getByRole("link", { name: "Notes, 3 items" }),
  ).toBeVisible();
  const sidebarLinks = within(sidebar).getAllByRole("link");
  expect(
    sidebarLinks.some((link) => link.getAttribute("href") === "/items/files"),
  ).toBe(false);
  expect(
    sidebarLinks.some((link) => link.getAttribute("href") === "/items/images"),
  ).toBe(false);
  expect(
    sidebarLinks.some((link) => link.getAttribute("href") === "/items/links"),
  ).toBe(false);
});

test("does not show invented item type counts while live data is unavailable", async () => {
  let rejectItems: ((reason: Error) => void) | undefined;
  apiMocks.fetchAllItems.mockReturnValueOnce(
    new Promise<Item[]>((_resolve, reject) => {
      rejectItems = reject;
    }),
  );
  const user = userEvent.setup();
  renderDashboard();

  expect(
    screen.getByRole("link", { name: "Snippets, count unavailable" }),
  ).toBeVisible();
  rejectItems?.(new Error("Sidebar item counts are unavailable."));

  await user.click(screen.getByRole("button", { name: "Open global search" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Sidebar item counts are unavailable.",
  );
  expect(
    screen.getByRole("link", {
      name: "Snippets, count unavailable",
      hidden: true,
    }),
  ).toBeInTheDocument();
});

test("shows only the three most recent collections", async () => {
  renderDashboard();

  const recentCollections = screen
    .getByRole("heading", { name: "Recent collections" })
    .closest("section");

  expect(recentCollections).not.toBeNull();
  await waitFor(() =>
    expect(
      within(recentCollections!).getAllByRole("heading", { level: 3 }),
    ).toHaveLength(3),
  );
  expect(within(recentCollections!).getByText("React Patterns")).toBeVisible();
  expect(within(recentCollections!).getByText("Python Snippets")).toBeVisible();
  expect(within(recentCollections!).getByText("Context Files")).toBeVisible();
  expect(
    within(recentCollections!).queryByText("Interview Prep"),
  ).not.toBeInTheDocument();
});

test("opens a collection drawer, edits it, and confirms deletion", async () => {
  const user = userEvent.setup();
  const original = collections[0];
  const updated = {
    ...original,
    name: "Updated collection",
    description: "Updated description",
    itemCount: 0,
    itemIds: [],
    types: [],
    updatedAt: "2026-09-07T12:00:00Z",
  };
  apiMocks.updateCollection.mockResolvedValueOnce(updated);
  apiMocks.deleteCollection.mockResolvedValueOnce(undefined);
  apiMocks.addCollectionItem.mockResolvedValueOnce({
    ...updated,
    itemIds: [items[0].id],
    itemCount: 1,
    types: ["snippet"],
  });
  apiMocks.removeCollectionItem.mockResolvedValueOnce(updated);
  renderDashboard();

  const trigger = await screen.findByRole("button", {
    name: `Open ${original.name}`,
  });
  await user.click(trigger);
  let drawer = screen.getByRole("dialog", { name: original.name });
  expect(within(drawer).getByText(original.description)).toBeVisible();
  expect(within(drawer).queryByText(items[0].title)).not.toBeInTheDocument();
  expect(
    within(drawer).getByText("No items in this collection."),
  ).toBeVisible();
  await user.click(within(drawer).getByRole("button", { name: "Edit" }));
  await user.clear(within(drawer).getByLabelText("Name"));
  await user.type(within(drawer).getByLabelText("Name"), updated.name);
  await user.clear(within(drawer).getByLabelText("Description"));
  await user.type(
    within(drawer).getByLabelText("Description"),
    updated.description,
  );
  await user.click(
    within(drawer).getByRole("button", { name: "Save changes" }),
  );

  expect(apiMocks.updateCollection).toHaveBeenCalledWith(original.id, {
    name: updated.name,
    description: updated.description,
  });
  drawer = await screen.findByRole("dialog", { name: updated.name });
  expect(screen.getAllByText(updated.name).length).toBeGreaterThan(1);
  expect(within(drawer).queryByText(items[0].title)).not.toBeInTheDocument();
  await user.click(within(drawer).getByRole("button", { name: "Edit" }));
  await user.click(within(drawer).getByRole("combobox", { name: "Add item" }));
  await user.click(screen.getByRole("option", { name: items[0].title }));
  expect(apiMocks.addCollectionItem).toHaveBeenCalledWith(
    original.id,
    items[0].id,
  );
  expect(
    await within(drawer).findByRole("button", {
      name: `Remove ${items[0].title} from collection`,
    }),
  ).toBeVisible();
  expect(within(drawer).getByText("Current items (1)")).toBeVisible();
  await user.click(
    within(drawer).getByRole("button", {
      name: `Remove ${items[0].title} from collection`,
    }),
  );
  expect(apiMocks.removeCollectionItem).toHaveBeenCalledWith(
    original.id,
    items[0].id,
  );
  expect(await within(drawer).findByText("Current items (0)")).toBeVisible();
  await user.click(within(drawer).getByRole("button", { name: "Cancel" }));
  await user.click(within(drawer).getByRole("button", { name: "Delete" }));
  const confirmation = screen.getByRole("alertdialog", {
    name: `Delete “${updated.name}”?`,
  });
  expect(within(confirmation).getByText(/cannot be undone/i)).toBeVisible();
  await user.click(
    within(confirmation).getByRole("button", { name: "Delete collection" }),
  );

  await waitFor(() =>
    expect(apiMocks.deleteCollection).toHaveBeenCalledWith(original.id),
  );
  expect(
    screen.queryByRole("dialog", { name: updated.name }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(updated.name)).not.toBeInTheDocument();
});

test("creates a collection and updates collection surfaces with toast feedback", async () => {
  const created: Collection = {
    id: "40000000-0000-4000-8000-000000000001",
    name: "API Design",
    description: "Stable interface patterns",
    itemIds: [],
    itemCount: 0,
    favorite: false,
    accent: "orange",
    types: [],
    createdAt: "2026-09-04T09:00:00Z",
    updatedAt: "2026-09-04T09:00:00Z",
  };
  apiMocks.createCollection
    .mockRejectedValueOnce(new Error("Collection creation failed."))
    .mockResolvedValueOnce(created);
  const user = userEvent.setup();
  renderDashboard();

  await user.click(screen.getByRole("button", { name: "New collection" }));
  const dialog = screen.getByRole("dialog", { name: "Create collection" });
  await user.click(
    within(dialog).getByRole("button", { name: "Create collection" }),
  );
  expect(within(dialog).getByText("Name is required.")).toBeVisible();
  expect(within(dialog).getByText("Description is required.")).toBeVisible();

  await user.type(within(dialog).getByLabelText("Name"), created.name);
  await user.type(
    within(dialog).getByLabelText("Description"),
    created.description,
  );
  await user.click(
    within(dialog).getByRole("button", { name: "Create collection" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Collection creation failed.",
  );
  expect(within(dialog).getByLabelText("Name")).toHaveValue(created.name);

  await user.click(
    within(dialog).getByRole("button", { name: "Create collection" }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    `“${created.name}” was created.`,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getAllByText(created.name).length).toBeGreaterThanOrEqual(2);

  await user.click(screen.getByRole("button", { name: "Open global search" }));
  await user.type(
    screen.getByRole("combobox", { name: "Search items and collections" }),
    created.name,
  );
  expect(
    screen.getByRole("option", { name: /API Design0 items/ }),
  ).toBeVisible();
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

  expect(
    screen.getByRole("button", { name: "Open global search" }),
  ).toBeVisible();
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
  expect(
    screen.getByRole("button", { name: "Open global search" }),
  ).toBeVisible();
});

test("opens a prefetched item from global search even when it is not on the current page", async () => {
  const globalItem: Item = {
    ...items[0],
    id: "20000000-0000-4000-8000-000000000000",
    title: "Remote deployment checklist",
    content: "Production release steps",
    item_type: "note",
    language: null,
  };
  const updatedGlobalItem = {
    ...globalItem,
    title: "Updated deployment checklist",
  };
  apiMocks.fetchAllItems.mockResolvedValueOnce([globalItem]);
  apiMocks.updateItem.mockResolvedValueOnce(updatedGlobalItem);
  const user = userEvent.setup();
  renderDashboard();

  await user.click(screen.getByRole("button", { name: "Open global search" }));
  await user.type(
    screen.getByRole("combobox", { name: "Search items and collections" }),
    "Remote deployment",
  );
  await user.click(screen.getByText(globalItem.title));

  expect(screen.getByRole("dialog", { name: globalItem.title })).toBeVisible();

  const drawer = screen.getByRole("dialog", { name: globalItem.title });
  await user.click(within(drawer).getByRole("button", { name: "Edit" }));
  const titleInput = within(drawer).getByLabelText("Title");
  await user.clear(titleInput);
  await user.type(titleInput, updatedGlobalItem.title);
  await user.click(
    within(drawer).getByRole("button", { name: "Save changes" }),
  );

  expect(
    await screen.findByRole("dialog", { name: updatedGlobalItem.title }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", {
      name: `Open ${updatedGlobalItem.title}`,
      hidden: true,
    }),
  ).not.toBeInTheDocument();
});

test("navigates a global collection result to its dashboard card", async () => {
  const user = userEvent.setup();
  renderDashboard();

  await user.keyboard("{Control>}k{/Control}");
  const searchDialog = screen.getByRole("dialog", { name: "Global search" });
  await user.type(
    within(searchDialog).getByRole("combobox", {
      name: "Search items and collections",
    }),
    "React Patterns",
  );
  await user.click(
    within(searchDialog).getByRole("option", {
      name: /React Patterns12 items/,
    }),
  );

  expect(screen.getByTestId("hash")).toHaveTextContent("#react-patterns");
  expect(
    screen.getByRole("button", { name: "Open global search" }),
  ).toHaveFocus();
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
  expect(screen.getByRole("link", { name: "Notes, 3 items" })).toBeVisible();

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
  await user.click(
    within(createDialog).getByRole("combobox", { name: "Type" }),
  );
  await user.click(screen.getByRole("option", { name: "Note" }));
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
  expect(
    screen.getByRole("link", { name: "Notes, 4 items", hidden: true }),
  ).toBeInTheDocument();
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

  expect(
    await screen.findByRole("link", { name: "Snippets, 4 items" }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Prompts, 0 items" })).toBeVisible();

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
  await user.click(within(dialog).getByRole("combobox", { name: "Type" }));
  await user.click(screen.getByRole("option", { name: "Prompt" }));
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
  expect(
    screen.getByRole("link", { name: "Snippets, 3 items", hidden: true }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Prompts, 1 item", hidden: true }),
  ).toBeInTheDocument();

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
  expect(screen.getByRole("link", { name: "Prompts, 0 items" })).toBeVisible();
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

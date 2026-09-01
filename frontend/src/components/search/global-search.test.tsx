import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import type { Item } from "@/api/items";
import { GlobalSearch } from "@/components/search/global-search";
import type { Collection } from "@/lib/mock-data";

const items: Item[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "useAuth Hook",
    content: "Custom authentication hook for React applications",
    item_type: "snippet",
    language: "typescript",
    created_at: "2026-08-20T09:00:00Z",
    updated_at: "2026-08-20T09:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "Auth review prompt",
    content: "Review an authentication implementation",
    item_type: "prompt",
    language: null,
    created_at: "2026-08-19T09:00:00Z",
    updated_at: "2026-08-19T09:00:00Z",
  },
];

const collections: Collection[] = [
  {
    id: "react-patterns",
    name: "React Patterns",
    description: "Common React patterns and hooks",
    itemCount: 12,
    favorite: true,
    accent: "blue",
    types: ["snippet", "note"],
  },
];

test("opens from the top bar and groups fuzzy item and collection matches", async () => {
  const user = userEvent.setup();
  render(
    <GlobalSearch
      items={items}
      collections={collections}
      state="ready"
      error={null}
      onSelectItem={vi.fn()}
      onSelectCollection={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Open global search" }));
  const dialog = screen.getByRole("dialog", { name: "Global search" });
  await user.type(
    within(dialog).getByRole("combobox", {
      name: "Search items and collections",
    }),
    "react",
  );

  expect(within(dialog).getByText("Items")).toBeVisible();
  expect(within(dialog).getByText("Collections")).toBeVisible();
  expect(within(dialog).getByText("useAuth Hook")).toBeVisible();
  expect(within(dialog).getByText("snippet")).toBeVisible();
  expect(within(dialog).getByText("React Patterns")).toBeVisible();
  expect(within(dialog).getByText("12 items")).toBeVisible();
});

test("opens with the platform shortcut and activates the keyboard-selected item", async () => {
  const onSelectItem = vi.fn();
  const user = userEvent.setup();
  render(
    <GlobalSearch
      items={items}
      collections={collections}
      state="ready"
      error={null}
      onSelectItem={onSelectItem}
      onSelectCollection={vi.fn()}
    />,
  );

  await user.keyboard("{Control>}k{/Control}");
  const input = screen.getByRole("combobox", {
    name: "Search items and collections",
  });
  await user.type(input, "authentication");
  await user.keyboard("{ArrowDown}{Enter}");

  expect(onSelectItem).toHaveBeenCalledWith(items[1]);
  expect(screen.queryByRole("dialog", { name: "Global search" })).toBeNull();
});

test("selects a collection and reports empty and failed item data", async () => {
  const onSelectCollection = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <GlobalSearch
      items={[]}
      collections={collections}
      state="ready"
      error={null}
      onSelectItem={vi.fn()}
      onSelectCollection={onSelectCollection}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Open global search" }));
  await user.type(
    screen.getByRole("combobox", { name: "Search items and collections" }),
    "React Patterns",
  );
  await user.click(screen.getByText("React Patterns"));
  expect(onSelectCollection).toHaveBeenCalledWith(collections[0]);

  await user.click(screen.getByRole("button", { name: "Open global search" }));
  await user.type(
    screen.getByRole("combobox", { name: "Search items and collections" }),
    "nothing matches this",
  );
  expect(screen.getByText("No matching items or collections.")).toBeVisible();

  view.rerender(
    <GlobalSearch
      items={[]}
      collections={[]}
      state="error"
      error="Searchable items could not be loaded."
      onSelectItem={vi.fn()}
      onSelectCollection={vi.fn()}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Searchable items could not be loaded.",
  );
  expect(screen.getByText("No collections available.")).toBeVisible();
});

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  createItem,
  deleteItem,
  fetchAllItems,
  fetchItem,
  fetchItems,
  ItemApiError,
  updateItem,
  type Item,
  type ItemInput,
} from "@/api/items";

const item: Item = {
  id: "0f5c14b5-49c4-4a64-afd4-1cba7284ffdf",
  title: "Restart local services",
  content: "docker compose restart",
  item_type: "command",
  language: null,
  created_at: "2026-08-26T09:30:00Z",
  updated_at: "2026-08-26T09:30:00Z",
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

test("loads the item list and an individual item from canonical API routes", async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ items: [item], page: 1, page_size: 12, total: 1 }),
    )
    .mockResolvedValueOnce(jsonResponse(item));

  await expect(fetchItems()).resolves.toEqual({
    items: [item],
    page: 1,
    page_size: 12,
    total: 1,
  });
  await expect(fetchItem(item.id)).resolves.toEqual(item);
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    "/api/items",
    expect.objectContaining({
      headers: { Accept: "application/json" },
    }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    `/api/items/${item.id}`,
    expect.objectContaining({
      headers: { Accept: "application/json" },
    }),
  );
});

test("serializes search, filters, and pagination into the list URL", async () => {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ items: [item], page: 2, page_size: 6, total: 7 }),
  );

  await fetchItems({
    q: "restart services",
    itemType: "command",
    language: "shell",
    page: 2,
    pageSize: 6,
  });

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/items?q=restart+services&item_type=command&language=shell&page=2&page_size=6",
    expect.objectContaining({ headers: { Accept: "application/json" } }),
  );
});

test("prefetches every item page for client-side global search", async () => {
  const secondItem = { ...item, id: "1f5c14b5-49c4-4a64-afd4-1cba7284ffdf" };
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ items: [item], page: 1, page_size: 50, total: 51 }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ items: [secondItem], page: 2, page_size: 50, total: 51 }),
    );

  await expect(fetchAllItems()).resolves.toEqual([item, secondItem]);
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    "/api/items?page_size=50",
    expect.any(Object),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    "/api/items?page=2&page_size=50",
    expect.any(Object),
  );
});

test("creates and updates items with JSON requests", async () => {
  const input: ItemInput = {
    title: item.title,
    content: item.content,
    item_type: item.item_type,
    language: item.language,
  };
  const updated = { ...item, title: "Restart development services" };
  fetchMock
    .mockResolvedValueOnce(jsonResponse(item, 201))
    .mockResolvedValueOnce(jsonResponse(updated));

  await expect(createItem(input)).resolves.toEqual(item);
  await expect(updateItem(item.id, { title: updated.title })).resolves.toEqual(
    updated,
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    "/api/items",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    `/api/items/${item.id}`,
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ title: updated.title }),
    }),
  );
});

test("deletes an item without reading a response body", async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

  await expect(deleteItem(item.id)).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/items/${item.id}`,
    expect.objectContaining({ method: "DELETE" }),
  );
});

test("rejects failed requests and malformed service responses", async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ detail: "missing" }, 404))
    .mockResolvedValueOnce(
      jsonResponse({
        items: [{ ...item, item_type: "file" }],
        page: 1,
        page_size: 12,
        total: 1,
      }),
    );

  await expect(fetchItem(item.id)).rejects.toEqual(
    new ItemApiError("The item request could not be completed."),
  );
  await expect(fetchItems()).rejects.toEqual(
    new ItemApiError("The item service returned invalid data."),
  );
});

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

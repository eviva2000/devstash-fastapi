import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  CollectionApiError,
  addCollectionItem,
  createCollection,
  deleteCollection,
  fetchCollections,
  removeCollectionItem,
  updateCollection,
} from "@/api/collections";
import { clearCsrfToken, setCsrfToken } from "@/api/csrf";

const responseCollection = {
  id: "40000000-0000-4000-8000-000000000001",
  name: "Backend references",
  description: "Useful API patterns",
  item_count: 0,
  favorite: false,
  types: [],
  created_at: "2026-09-04T09:00:00Z",
  updated_at: "2026-09-04T09:00:00Z",
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  clearCsrfToken();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

test("loads and normalizes server collections", async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse([responseCollection]));

  const collections = await fetchCollections();

  expect(collections[0]).toEqual(
    expect.objectContaining({
      id: responseCollection.id,
      name: responseCollection.name,
      itemCount: 0,
      favorite: false,
      types: [],
      createdAt: responseCollection.created_at,
      updatedAt: responseCollection.updated_at,
    }),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/collections",
    expect.objectContaining({
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    }),
  );
});

test("creates a collection with JSON and CSRF protection", async () => {
  setCsrfToken("csrf-proof");
  fetchMock.mockResolvedValueOnce(jsonResponse(responseCollection, 201));
  const input = {
    name: responseCollection.name,
    description: responseCollection.description,
  };

  await expect(createCollection(input)).resolves.toEqual(
    expect.objectContaining({ name: responseCollection.name }),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/collections",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": "csrf-proof",
      },
    }),
  );
});

test("updates and deletes a collection with scoped URLs and CSRF protection", async () => {
  setCsrfToken("csrf-proof");
  const input = { name: "Updated", description: "Changed" };
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ ...responseCollection, ...input }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));

  await expect(updateCollection(responseCollection.id, input)).resolves.toEqual(
    expect.objectContaining(input),
  );
  await expect(
    deleteCollection(responseCollection.id),
  ).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    `/api/collections/${responseCollection.id}`,
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify(input),
      headers: expect.objectContaining({ "X-CSRF-Token": "csrf-proof" }),
    }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    `/api/collections/${responseCollection.id}`,
    expect.objectContaining({ method: "DELETE" }),
  );
});

test("adds and removes collection items through nested resource URLs", async () => {
  setCsrfToken("csrf-proof");
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({
        ...responseCollection,
        item_ids: ["item-1"],
        item_count: 1,
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ ...responseCollection, item_ids: [], item_count: 0 }),
    );

  await expect(
    addCollectionItem(responseCollection.id, "item-1"),
  ).resolves.toEqual(
    expect.objectContaining({ itemIds: ["item-1"], itemCount: 1 }),
  );
  await expect(
    removeCollectionItem(responseCollection.id, "item-1"),
  ).resolves.toEqual(expect.objectContaining({ itemIds: [], itemCount: 0 }));
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    `/api/collections/${responseCollection.id}/items/item-1`,
    expect.objectContaining({ method: "PUT" }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    `/api/collections/${responseCollection.id}/items/item-1`,
    expect.objectContaining({ method: "DELETE" }),
  );
});

test("rejects failed requests and malformed collection data", async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ detail: "failed" }, 500))
    .mockResolvedValueOnce(jsonResponse([{ ...responseCollection, name: 42 }]));

  await expect(fetchCollections()).rejects.toEqual(
    new CollectionApiError("The collection request could not be completed."),
  );
  await expect(fetchCollections()).rejects.toEqual(
    new CollectionApiError("The collection service returned invalid data."),
  );
});

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

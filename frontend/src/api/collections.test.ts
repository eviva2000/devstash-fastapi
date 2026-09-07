import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  CollectionApiError,
  createCollection,
  fetchCollections,
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

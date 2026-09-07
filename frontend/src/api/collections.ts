import { announceAuthenticationRequired } from "@/api/auth";
import { getCsrfToken } from "@/api/csrf";

export type CollectionAccent =
  "blue" | "yellow" | "orange" | "violet" | "slate";

export type Collection = {
  id: string;
  name: string;
  description: string;
  itemIds: string[];
  itemCount: number;
  favorite: boolean;
  types: string[];
  accent: CollectionAccent;
  createdAt: string;
  updatedAt: string;
};

export type CollectionInput = {
  name: string;
  description: string;
};

export class CollectionApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionApiError";
  }
}

const accents: CollectionAccent[] = [
  "blue",
  "violet",
  "orange",
  "yellow",
  "slate",
];

function accentFor(id: string): CollectionAccent {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return accents[Math.abs(hash) % accents.length];
}

function readCollection(value: unknown): Collection | null {
  if (typeof value !== "object" || value === null) return null;
  const collection = value as Record<string, unknown>;
  if (
    typeof collection.id !== "string" ||
    typeof collection.name !== "string" ||
    typeof collection.description !== "string" ||
    (collection.item_ids !== undefined &&
      (!Array.isArray(collection.item_ids) ||
        !collection.item_ids.every((id) => typeof id === "string"))) ||
    typeof collection.item_count !== "number" ||
    typeof collection.favorite !== "boolean" ||
    !Array.isArray(collection.types) ||
    !collection.types.every((type) => typeof type === "string") ||
    typeof collection.created_at !== "string" ||
    typeof collection.updated_at !== "string"
  )
    return null;
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    itemIds: (collection.item_ids as string[] | undefined) ?? [],
    itemCount: collection.item_count,
    favorite: collection.favorite,
    types: collection.types,
    accent: accentFor(collection.id),
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
  };
}

async function request(path = "", init?: RequestInit): Promise<Response> {
  try {
    const csrfToken = getCsrfToken();
    const unsafe = init?.method !== undefined && init.method !== "GET";
    const response = await fetch(`/api/collections${path}`, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(unsafe && csrfToken !== null ? { "X-CSRF-Token": csrfToken } : {}),
        ...init?.headers,
      },
    });
    if (response.status === 401) announceAuthenticationRequired();
    if (!response.ok)
      throw new CollectionApiError(
        "The collection request could not be completed.",
      );
    return response;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    if (error instanceof CollectionApiError) throw error;
    throw new CollectionApiError(
      "DevStash could not reach the collection service.",
    );
  }
}

export async function fetchCollections(
  signal?: AbortSignal,
): Promise<Collection[]> {
  const response = await request("", { signal });
  const value: unknown = await response.json();
  if (!Array.isArray(value))
    throw new CollectionApiError(
      "The collection service returned invalid data.",
    );
  const collections = value.map(readCollection);
  if (collections.some((collection) => collection === null))
    throw new CollectionApiError(
      "The collection service returned invalid data.",
    );
  return collections as Collection[];
}

export async function createCollection(
  input: CollectionInput,
): Promise<Collection> {
  const response = await request("", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const collection = readCollection(await response.json());
  if (collection === null)
    throw new CollectionApiError(
      "The collection service returned invalid data.",
    );
  return collection;
}

export async function updateCollection(
  id: string,
  input: CollectionInput,
): Promise<Collection> {
  const response = await request(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const collection = readCollection(await response.json());
  if (collection === null)
    throw new CollectionApiError(
      "The collection service returned invalid data.",
    );
  return collection;
}

export async function deleteCollection(id: string): Promise<void> {
  await request(`/${id}`, { method: "DELETE" });
}

async function changeCollectionItem(
  collectionId: string,
  itemId: string,
  method: "PUT" | "DELETE",
): Promise<Collection> {
  const response = await request(`/${collectionId}/items/${itemId}`, {
    method,
  });
  const collection = readCollection(await response.json());
  if (collection === null)
    throw new CollectionApiError(
      "The collection service returned invalid data.",
    );
  return collection;
}

export function addCollectionItem(collectionId: string, itemId: string) {
  return changeCollectionItem(collectionId, itemId, "PUT");
}

export function removeCollectionItem(collectionId: string, itemId: string) {
  return changeCollectionItem(collectionId, itemId, "DELETE");
}

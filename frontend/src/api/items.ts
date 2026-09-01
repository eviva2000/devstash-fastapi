export const itemTypes = ["snippet", "prompt", "command", "note"] as const;
export type ItemType = (typeof itemTypes)[number];

export type Item = {
  id: string;
  title: string;
  content: string;
  item_type: ItemType;
  language: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemInput = {
  title: string;
  content: string;
  item_type: ItemType;
  language: string | null;
};

export type ItemUpdate = Partial<ItemInput>;

export type ItemQuery = {
  q?: string;
  itemType?: ItemType;
  language?: string;
  page?: number;
  pageSize?: number;
};

export type ItemPage = {
  items: Item[];
  page: number;
  page_size: number;
  total: number;
};

export class ItemApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItemApiError";
  }
}

function isItemType(value: unknown): value is ItemType {
  return typeof value === "string" && itemTypes.includes(value as ItemType);
}

function isItem(value: unknown): value is Item {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.content === "string" &&
    isItemType(item.item_type) &&
    (typeof item.language === "string" || item.language === null) &&
    typeof item.created_at === "string" &&
    typeof item.updated_at === "string"
  );
}

function isItemPage(value: unknown): value is ItemPage {
  if (typeof value !== "object" || value === null) return false;
  const page = value as Record<string, unknown>;
  return (
    Array.isArray(page.items) &&
    page.items.every(isItem) &&
    typeof page.page === "number" &&
    typeof page.page_size === "number" &&
    typeof page.total === "number"
  );
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`/api/items${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
    if (!response.ok)
      throw new ItemApiError("The item request could not be completed.");
    return response;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    if (error instanceof ItemApiError) throw error;
    throw new ItemApiError("DevStash could not reach the item service.");
  }
}

async function readItem(response: Response): Promise<Item> {
  const value: unknown = await response.json();
  if (!isItem(value))
    throw new ItemApiError("The item service returned invalid data.");
  return value;
}

export async function fetchItems(
  query: ItemQuery = {},
  signal?: AbortSignal,
): Promise<ItemPage> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.itemType) params.set("item_type", query.itemType);
  if (query.language) params.set("language", query.language);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const response = await request(suffix, { signal });
  const value: unknown = await response.json();
  if (!isItemPage(value)) {
    throw new ItemApiError("The item service returned invalid data.");
  }
  return value;
}

export async function fetchAllItems(signal?: AbortSignal): Promise<Item[]> {
  const pageSize = 50;
  const firstPage = await fetchItems({ pageSize }, signal);
  const pageCount = Math.ceil(firstPage.total / pageSize);
  if (pageCount <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      fetchItems({ page: index + 2, pageSize }, signal),
    ),
  );
  return [...firstPage.items, ...remainingPages.flatMap((page) => page.items)];
}

export async function fetchItem(
  id: string,
  signal?: AbortSignal,
): Promise<Item> {
  return readItem(await request(`/${id}`, { signal }));
}

export async function createItem(input: ItemInput): Promise<Item> {
  return readItem(
    await request("", { method: "POST", body: JSON.stringify(input) }),
  );
}

export async function updateItem(id: string, input: ItemUpdate): Promise<Item> {
  return readItem(
    await request(`/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  );
}

export async function deleteItem(id: string): Promise<void> {
  await request(`/${id}`, { method: "DELETE" });
}

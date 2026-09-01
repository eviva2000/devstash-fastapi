import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createItem as createItemRequest,
  deleteItem as deleteItemRequest,
  fetchAllItems,
  fetchItems,
  updateItem as updateItemRequest,
  type Item,
  type ItemInput,
  type ItemQuery,
  type ItemUpdate,
} from "@/api/items";

export type ItemLoadState = "loading" | "ready" | "error";

export function useGlobalSearchItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<ItemLoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function prefetch() {
      try {
        setItems(await fetchAllItems(controller.signal));
        setState("ready");
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === "AbortError")
          return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Searchable items could not be loaded.",
        );
        setState("error");
      }
    }
    void prefetch();
    return () => controller.abort();
  }, []);

  const add = useCallback((item: Item) => {
    setItems((current) => [item, ...current]);
  }, []);
  const replace = useCallback((item: Item) => {
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? item : entry)),
    );
  }, []);
  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return { items, state, error, add, replace, remove };
}

export function useItems(query: ItemQuery) {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<ItemLoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const queryKey = JSON.stringify(query);
  const stableQuery = useMemo(
    () => JSON.parse(queryKey) as ItemQuery,
    [queryKey],
  );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState("loading");
      setError(null);
      try {
        const result = await fetchItems(stableQuery, signal);
        setItems(result.items);
        setTotal(result.total);
        setState("ready");
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === "AbortError")
          return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Items could not be loaded.",
        );
        setState("error");
      }
    },
    [stableQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    async function initialLoad() {
      try {
        const result = await fetchItems(stableQuery, controller.signal);
        setItems(result.items);
        setTotal(result.total);
        setState("ready");
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === "AbortError")
          return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Items could not be loaded.",
        );
        setState("error");
      }
    }
    void initialLoad();
    return () => controller.abort();
  }, [stableQuery]);

  const create = useCallback(async (input: ItemInput) => {
    const item = await createItemRequest(input);
    setItems((current) => [item, ...current]);
    setTotal((current) => current + 1);
    return item;
  }, []);

  const update = useCallback(async (id: string, input: ItemUpdate) => {
    const item = await updateItemRequest(id, input);
    setItems((current) =>
      current.some((entry) => entry.id === id)
        ? [item, ...current.filter((entry) => entry.id !== id)]
        : current,
    );
    return item;
  }, []);

  const remove = useCallback(
    async (id: string) => {
      const isOnCurrentPage = items.some((item) => item.id === id);
      await deleteItemRequest(id);
      if (!isOnCurrentPage) return;
      setItems((current) => current.filter((item) => item.id !== id));
      setTotal((current) => Math.max(0, current - 1));
    },
    [items],
  );

  return { items, total, state, error, retry: load, create, update, remove };
}

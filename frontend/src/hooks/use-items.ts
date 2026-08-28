import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createItem as createItemRequest,
  deleteItem as deleteItemRequest,
  fetchItems,
  updateItem as updateItemRequest,
  type Item,
  type ItemInput,
  type ItemQuery,
  type ItemUpdate,
} from "@/api/items";

export type ItemLoadState = "loading" | "ready" | "error";

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
    setItems((current) => [
      item,
      ...current.filter((entry) => entry.id !== id),
    ]);
    return item;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteItemRequest(id);
    setItems((current) => current.filter((item) => item.id !== id));
    setTotal((current) => Math.max(0, current - 1));
  }, []);

  return { items, total, state, error, retry: load, create, update, remove };
}

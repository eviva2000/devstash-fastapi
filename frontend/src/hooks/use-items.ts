import { useCallback, useEffect, useState } from "react";

import {
  createItem as createItemRequest,
  deleteItem as deleteItemRequest,
  fetchItems,
  updateItem as updateItemRequest,
  type Item,
  type ItemInput,
  type ItemUpdate,
} from "@/api/items";

export type ItemLoadState = "loading" | "ready" | "error";

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<ItemLoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    setError(null);
    try {
      setItems(await fetchItems(signal));
      setState("ready");
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      setError(
        caught instanceof Error ? caught.message : "Items could not be loaded.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function initialLoad() {
      try {
        setItems(await fetchItems(controller.signal));
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
  }, []);

  const create = useCallback(async (input: ItemInput) => {
    const item = await createItemRequest(input);
    setItems((current) => [item, ...current]);
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
  }, []);

  return { items, state, error, retry: load, create, update, remove };
}

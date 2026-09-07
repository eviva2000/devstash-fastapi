import { useCallback, useEffect, useState } from "react";

import {
  createCollection as createCollectionRequest,
  fetchCollections,
  type Collection,
  type CollectionInput,
} from "@/api/collections";

export type CollectionLoadState = "loading" | "ready" | "error";

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [state, setState] = useState<CollectionLoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      setCollections(await fetchCollections(signal));
      setState("ready");
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Collections could not be loaded.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function initialLoad() {
      try {
        setCollections(await fetchCollections(controller.signal));
        setState("ready");
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === "AbortError")
          return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Collections could not be loaded.",
        );
        setState("error");
      }
    }
    void initialLoad();
    return () => controller.abort();
  }, []);

  const create = useCallback(async (input: CollectionInput) => {
    const collection = await createCollectionRequest(input);
    setCollections((current) => [
      collection,
      ...current.filter((entry) => entry.id !== collection.id),
    ]);
    return collection;
  }, []);

  return { collections, state, error, retry: load, create };
}

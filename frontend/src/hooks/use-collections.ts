import { useCallback, useEffect, useState } from "react";

import {
  addCollectionItem as addCollectionItemRequest,
  createCollection as createCollectionRequest,
  deleteCollection as deleteCollectionRequest,
  fetchCollections,
  removeCollectionItem as removeCollectionItemRequest,
  updateCollection as updateCollectionRequest,
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

  const update = useCallback(async (id: string, input: CollectionInput) => {
    const collection = await updateCollectionRequest(id, input);
    setCollections((current) =>
      current.map((entry) => (entry.id === id ? collection : entry)),
    );
    return collection;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteCollectionRequest(id);
    setCollections((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const replace = useCallback((collection: Collection) => {
    setCollections((current) =>
      current.map((entry) => (entry.id === collection.id ? collection : entry)),
    );
    return collection;
  }, []);

  const addItem = useCallback(
    async (collectionId: string, itemId: string) =>
      replace(await addCollectionItemRequest(collectionId, itemId)),
    [replace],
  );

  const removeItem = useCallback(
    async (collectionId: string, itemId: string) =>
      replace(await removeCollectionItemRequest(collectionId, itemId)),
    [replace],
  );

  return {
    collections,
    state,
    error,
    retry: load,
    create,
    update,
    remove,
    addItem,
    removeItem,
  };
}

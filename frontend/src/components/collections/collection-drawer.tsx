import { Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type { Collection, CollectionInput } from "@/api/collections";
import type { Item } from "@/api/items";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CollectionDrawerProps = {
  collection: Collection;
  items: Item[];
  onClose: () => void;
  onUpdate: (id: string, input: CollectionInput) => Promise<Collection>;
  onDelete: (id: string) => Promise<void>;
  onAddItem: (collectionId: string, itemId: string) => Promise<Collection>;
  onRemoveItem: (collectionId: string, itemId: string) => Promise<Collection>;
};

export function CollectionDrawer({
  collection,
  items,
  onClose,
  onUpdate,
  onDelete,
  onAddItem,
  onRemoveItem,
}: CollectionDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, textarea, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function remove() {
    setDeleting(true);
    setActionError(null);
    try {
      await onDelete(collection.id);
      onClose();
    } catch (caught: unknown) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The collection could not be deleted.",
      );
      setDeleting(false);
    }
  }

  async function changeItem(itemId: string, member: boolean) {
    setPendingItemId(itemId);
    setActionError(null);
    try {
      if (member) await onRemoveItem(collection.id, itemId);
      else await onAddItem(collection.id, itemId);
    } catch (caught: unknown) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The collection membership could not be changed.",
      );
    } finally {
      setPendingItemId(null);
    }
  }

  const memberItems = items.filter((item) =>
    collection.itemIds.includes(item.id),
  );

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close collection drawer overlay"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-drawer-title"
        className="bg-card border-border absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l shadow-2xl"
      >
        <header className="border-border flex items-start gap-4 border-b p-5">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Collection
            </p>
            <h2
              id="collection-drawer-title"
              className="mt-1 truncate text-xl font-semibold"
            >
              {collection.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close collection drawer"
            onClick={onClose}
            className="hover:bg-muted rounded-md p-2"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {actionError && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
            >
              {actionError}
            </p>
          )}
          {editing ? (
            <CollectionEditForm
              collection={collection}
              items={items}
              pendingItemId={pendingItemId}
              onAddItem={(itemId) => changeItem(itemId, false)}
              onRemoveItem={(itemId) => changeItem(itemId, true)}
              onCancel={() => setEditing(false)}
              onSubmit={async (input) => {
                await onUpdate(collection.id, input);
                setEditing(false);
              }}
            />
          ) : (
            <div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="border-border hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2"
                >
                  <Pencil aria-hidden="true" className="size-4" /> Edit
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 aria-hidden="true" className="size-4" /> Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete “{collection.name}”?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The collection will be
                        permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={deleting}
                        onClick={() => void remove()}
                      >
                        {deleting ? "Deleting…" : "Delete collection"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <h3 className="text-muted-foreground mt-8 text-sm font-medium">
                Description
              </h3>
              <p className="mt-3 whitespace-pre-wrap">
                {collection.description}
              </p>
              <h3 className="text-muted-foreground mt-8 text-sm font-medium">
                Items ({collection.itemCount})
              </h3>
              {memberItems.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                  No items in this collection.
                </p>
              ) : (
                <ul className="mt-3 space-y-2" aria-label="Collection items">
                  {memberItems.map((item) => (
                    <li
                      key={item.id}
                      className="border-border rounded-lg border p-3"
                    >
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {item.item_type}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function CollectionEditForm({
  collection,
  items,
  pendingItemId,
  onAddItem,
  onRemoveItem,
  onCancel,
  onSubmit,
}: {
  collection: Collection;
  items: Item[];
  pendingItemId: string | null;
  onAddItem: (itemId: string) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onCancel: () => void;
  onSubmit: (input: CollectionInput) => Promise<void>;
}) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const memberItems = items.filter((item) =>
    collection.itemIds.includes(item.id),
  );
  const availableItems = items.filter(
    (item) => !collection.itemIds.includes(item.id),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      ...(!name.trim() ? { name: "Name is required." } : {}),
      ...(!description.trim()
        ? { description: "Description is required." }
        : {}),
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setRequestError(null);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() });
    } catch (caught: unknown) {
      setRequestError(
        caught instanceof Error
          ? caught.message
          : "The collection could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={(event) => void submit(event)}>
      {requestError && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
        >
          {requestError}
        </p>
      )}
      <div>
        <label
          htmlFor="collection-edit-name"
          className="mb-2 block text-sm font-medium"
        >
          Name
        </label>
        <input
          id="collection-edit-name"
          value={name}
          maxLength={200}
          disabled={saving}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={
            errors.name ? "collection-edit-name-error" : undefined
          }
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          className="border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
        {errors.name && (
          <p
            id="collection-edit-name-error"
            role="alert"
            className="mt-2 text-sm text-red-300"
          >
            {errors.name}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="collection-edit-description"
          className="mb-2 block text-sm font-medium"
        >
          Description
        </label>
        <textarea
          id="collection-edit-description"
          value={description}
          maxLength={2000}
          rows={8}
          disabled={saving}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? "collection-edit-description-error" : undefined
          }
          onChange={(event) => {
            setDescription(event.target.value);
            setErrors((current) => ({ ...current, description: undefined }));
          }}
          className="border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
        {errors.description && (
          <p
            id="collection-edit-description-error"
            role="alert"
            className="mt-2 text-sm text-red-300"
          >
            {errors.description}
          </p>
        )}
      </div>
      <div>
        <p id="collection-add-item-label" className="mb-2 text-sm font-medium">
          Add item
        </p>
        <Select
          disabled={pendingItemId !== null || availableItems.length === 0}
          onValueChange={(itemId) => void onAddItem(itemId)}
        >
          <SelectTrigger aria-labelledby="collection-add-item-label">
            <SelectValue
              placeholder={
                availableItems.length === 0
                  ? "All items are already added"
                  : "Select an item"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <h3 className="text-muted-foreground text-sm font-medium">
          Current items ({collection.itemCount})
        </h3>
        {memberItems.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            No items in this collection.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="Current collection items">
            {memberItems.map((item) => (
              <li
                key={item.id}
                className="border-border flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {item.item_type}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pendingItemId !== null}
                  aria-label={`Remove ${item.title} from collection`}
                  onClick={() => void onRemoveItem(item.id)}
                  className="border-border hover:bg-muted rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  {pendingItemId === item.id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="border-border hover:bg-muted rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-foreground text-background rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

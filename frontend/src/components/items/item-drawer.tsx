import { Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type Item, type ItemInput } from "@/api/items";
import { ItemForm } from "@/components/items/item-form";
import { LazyCodeEditor } from "@/components/items/lazy-code-editor";
import { MarkdownEditor } from "@/components/items/markdown-editor";
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
import { resolveCodeLanguage } from "@/lib/code-language";

type ItemDrawerProps = {
  item: Item;
  onClose: () => void;
  onUpdate: (id: string, input: ItemInput) => Promise<Item>;
  onDelete: (id: string) => Promise<void>;
};

export function ItemDrawer(props: ItemDrawerProps) {
  const { item, onClose, onUpdate, onDelete } = props;
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function remove() {
    setActionError(null);
    try {
      await onDelete(item.id);
      onClose();
    } catch (caught: unknown) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The item could not be deleted.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close item drawer overlay"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-drawer-title"
        className="bg-card border-border absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l shadow-2xl"
      >
        <header className="border-border flex items-start gap-4 border-b p-5">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {item.item_type}
            </p>
            <h2
              id="item-drawer-title"
              className="mt-1 truncate text-xl font-semibold"
            >
              {item.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close item drawer"
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
            <ItemForm
              item={item}
              submitLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSubmit={async (input) => {
                await onUpdate(item.id, input);
                setEditing(false);
              }}
            />
          ) : (
            <ItemDetails
              item={item}
              onEdit={() => setEditing(true)}
              onDelete={() => void remove()}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function ItemDetails({
  item,
  onEdit,
  onDelete,
}: {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="border-border hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2"
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edit
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-red-300 hover:bg-red-500/10"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{item.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The item will be permanently
                deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>
                Delete item
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <h3 className="text-muted-foreground mt-8 text-sm font-medium">
        Content
      </h3>
      <div className="mt-3">
        {item.item_type === "snippet" || item.item_type === "command" ? (
          <LazyCodeEditor
            value={item.content}
            language={resolveCodeLanguage(item.item_type, item.language)}
            label={`${item.title} content`}
            readOnly
          />
        ) : item.item_type === "note" || item.item_type === "prompt" ? (
          <MarkdownEditor
            value={item.content}
            label={`${item.title} content`}
            readOnly
          />
        ) : (
          <pre className="border-border bg-background overflow-x-auto rounded-lg border p-4 font-mono text-sm leading-6 whitespace-pre-wrap">
            {item.content}
          </pre>
        )}
      </div>
      <dl className="border-border text-muted-foreground mt-8 grid grid-cols-2 gap-4 border-t pt-5 text-sm">
        <div>
          <dt>Created</dt>
          <dd className="text-foreground mt-1">
            {formatDate(item.created_at)}
          </dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd className="text-foreground mt-1">
            {formatDate(item.updated_at)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

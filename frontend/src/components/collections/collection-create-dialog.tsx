import { useState, type FormEvent } from "react";

import type { Collection, CollectionInput } from "@/api/collections";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";

type CollectionCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CollectionInput) => Promise<Collection>;
  onCreated: (collection: Collection) => void;
};

export function CollectionCreateDialog({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: CollectionCreateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      ...(!name.trim() ? { name: "Name is required." } : {}),
      ...(!description.trim()
        ? { description: "Description is required." }
        : {}),
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setFailureMessage(null);
    try {
      const collection = await onCreate({
        name: name.trim(),
        description: description.trim(),
      });
      setName("");
      setDescription("");
      onCreated(collection);
    } catch (caught: unknown) {
      setFailureMessage(
        caught instanceof Error
          ? caught.message
          : "The collection could not be created.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="collection-create-description"
        closeLabel="Close create collection dialog"
      >
        <DialogHeader>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            New collection
          </p>
          <DialogTitle className="text-xl font-semibold">
            Create collection
          </DialogTitle>
          <DialogDescription
            id="collection-create-description"
            className="text-muted-foreground text-sm"
          >
            Group related developer knowledge in one place.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={(event) => void submit(event)}>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="collection-name"
            >
              Name
            </label>
            <input
              id="collection-name"
              value={name}
              maxLength={200}
              disabled={saving}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={
                errors.name ? "collection-name-error" : undefined
              }
              onChange={(event) => {
                setName(event.target.value);
                setErrors((current) => ({ ...current, name: undefined }));
              }}
              className={inputClasses}
            />
            {errors.name && (
              <FieldError id="collection-name-error" message={errors.name} />
            )}
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="collection-description"
            >
              Description
            </label>
            <textarea
              id="collection-description"
              value={description}
              maxLength={2000}
              rows={5}
              disabled={saving}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={
                errors.description ? "collection-description-error" : undefined
              }
              onChange={(event) => {
                setDescription(event.target.value);
                setErrors((current) => ({
                  ...current,
                  description: undefined,
                }));
              }}
              className={inputClasses}
            />
            {errors.description && (
              <FieldError
                id="collection-description-error"
                message={errors.description}
              />
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="border-border hover:bg-muted rounded-lg border px-4 py-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-foreground text-background rounded-lg px-4 py-2 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create collection"}
            </button>
          </div>
        </form>
        {failureMessage && (
          <Toast
            kind="error"
            message={failureMessage}
            onDismiss={() => setFailureMessage(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const inputClasses =
  "border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50";

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-red-300">
      {message}
    </p>
  );
}

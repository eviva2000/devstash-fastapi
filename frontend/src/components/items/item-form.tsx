import { useState, type FormEvent, type ReactNode } from "react";

import { itemTypes, type Item, type ItemInput } from "@/api/items";
import { LazyCodeEditor } from "@/components/items/lazy-code-editor";
import { MarkdownEditor } from "@/components/items/markdown-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveCodeLanguage, snippetLanguages } from "@/lib/code-language";

type ItemFormProps = {
  item?: Item;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (input: ItemInput) => Promise<void>;
};

type FieldErrors = {
  title?: string;
  content?: string;
};

export function ItemForm({
  item,
  submitLabel,
  onCancel,
  onSubmit,
}: ItemFormProps) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [itemType, setItemType] = useState<ItemInput["item_type"]>(
    item?.item_type ?? "snippet",
  );
  const [language, setLanguage] = useState(item?.language ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const usesMarkdown = itemType === "note" || itemType === "prompt";
  const usesCode = itemType === "snippet" || itemType === "command";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!title.trim()) nextErrors.title = "Title is required.";
    if (!content.trim()) nextErrors.content = "Content is required.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setRequestError(null);
    try {
      await onSubmit({
        title: title.trim(),
        content,
        item_type: itemType,
        language:
          itemType === "snippet" && language.trim() ? language.trim() : null,
      });
    } catch (caught: unknown) {
      setRequestError(
        caught instanceof Error
          ? caught.message
          : "The item could not be saved.",
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
      <Field label="Title" htmlFor="item-title" error={fieldErrors.title}>
        <input
          id="item-title"
          value={title}
          maxLength={200}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? "item-title-error" : undefined}
          onChange={(event) => {
            setTitle(event.target.value);
            setFieldErrors((current) => ({ ...current, title: undefined }));
          }}
          className={inputClasses}
        />
      </Field>
      <Field label="Type" htmlFor="item-type">
        <select
          id="item-type"
          value={itemType}
          onChange={(event) => {
            const nextType = event.target.value as ItemInput["item_type"];
            setItemType(nextType);
            if (nextType !== "snippet") setLanguage("");
          }}
          className={inputClasses}
        >
          {itemTypes.map((type) => (
            <option key={type} value={type}>
              {type[0].toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      {itemType === "snippet" && (
        <div>
          <p id="item-language-label" className="mb-2 text-sm font-medium">
            Language (optional)
          </p>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger aria-labelledby="item-language-label">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {snippetLanguages.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Field label="Content" htmlFor="item-content" error={fieldErrors.content}>
        {usesCode ? (
          <LazyCodeEditor
            value={content}
            language={resolveCodeLanguage(itemType, language)}
            label="Content"
            maxLength={50_000}
            ariaInvalid={fieldErrors.content ? true : undefined}
            ariaDescribedBy={
              fieldErrors.content ? "item-content-error" : undefined
            }
            onChange={(value) => {
              setContent(value);
              setFieldErrors((current) => ({
                ...current,
                content: undefined,
              }));
            }}
          />
        ) : usesMarkdown ? (
          <MarkdownEditor
            id="item-content"
            label="Content"
            value={content}
            maxLength={50_000}
            ariaInvalid={fieldErrors.content ? true : undefined}
            ariaDescribedBy={
              fieldErrors.content ? "item-content-error" : undefined
            }
            onChange={(value) => {
              setContent(value);
              setFieldErrors((current) => ({
                ...current,
                content: undefined,
              }));
            }}
          />
        ) : (
          <textarea
            id="item-content"
            value={content}
            maxLength={50_000}
            rows={12}
            aria-invalid={fieldErrors.content ? true : undefined}
            aria-describedby={
              fieldErrors.content ? "item-content-error" : undefined
            }
            onChange={(event) => {
              setContent(event.target.value);
              setFieldErrors((current) => ({
                ...current,
                content: undefined,
              }));
            }}
            className={inputClasses}
          />
        )}
      </Field>
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
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

const inputClasses =
  "border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="mt-2 text-sm text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}

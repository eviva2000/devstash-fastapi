import { Check, Copy } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownEditorBaseProps = {
  value: string;
  id?: string;
  label?: string;
  maxLength?: number;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
};

type MarkdownEditorProps = MarkdownEditorBaseProps &
  (
    | {
        readOnly?: false;
        onChange: (value: string) => void;
      }
    | {
        readOnly: true;
        onChange?: never;
      }
  );

type EditorTab = "write" | "preview";
type CopyStatus = "idle" | "copied" | "error";

export function MarkdownEditor({
  value,
  id,
  label = "Markdown content",
  maxLength,
  ariaInvalid,
  ariaDescribedBy,
  readOnly = false,
  onChange,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>(
    readOnly ? "preview" : "write",
  );
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeTabRef = useRef<HTMLButtonElement>(null);
  const previewTabRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const editorId = id ?? `${generatedId}-editor`;
  const writeTabId = `${generatedId}-write-tab`;
  const previewTabId = `${generatedId}-preview-tab`;
  const writePanelId = `${generatedId}-write-panel`;
  const previewPanelId = `${generatedId}-preview-panel`;

  useEffect(
    () => () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    },
    [],
  );

  async function copyMarkdown() {
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    copyResetRef.current = setTimeout(() => setCopyStatus("idle"), 2_000);
  }

  function moveTabFocus(event: KeyboardEvent<HTMLButtonElement>) {
    let nextTab: EditorTab | undefined;
    if (event.key === "ArrowRight" || event.key === "End") {
      nextTab = "preview";
    } else if (event.key === "ArrowLeft" || event.key === "Home") {
      nextTab = "write";
    }
    if (!nextTab) return;

    event.preventDefault();
    setActiveTab(nextTab);
    (nextTab === "write" ? writeTabRef : previewTabRef).current?.focus();
  }

  const previewSelected = readOnly || activeTab === "preview";

  return (
    <div className="flex max-h-[400px] min-h-0 flex-col overflow-hidden rounded-lg border border-[#3b3b3b] bg-[#1e1e1e]">
      <div className="flex min-h-11 shrink-0 items-center gap-2 bg-[#2d2d2d] px-2">
        <div
          role="tablist"
          aria-label={`${label} mode`}
          className="flex min-w-0 items-center gap-1"
        >
          {!readOnly && (
            <button
              ref={writeTabRef}
              id={writeTabId}
              type="button"
              role="tab"
              aria-selected={activeTab === "write"}
              aria-controls={writePanelId}
              tabIndex={activeTab === "write" ? 0 : -1}
              onClick={() => setActiveTab("write")}
              onKeyDown={moveTabFocus}
              className="focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 outline-none hover:text-zinc-100 focus-visible:ring-2 aria-selected:bg-[#1e1e1e] aria-selected:text-zinc-100"
            >
              Write
            </button>
          )}
          <button
            ref={previewTabRef}
            id={previewTabId}
            type="button"
            role="tab"
            aria-selected={previewSelected}
            aria-controls={previewPanelId}
            tabIndex={previewSelected ? 0 : -1}
            onClick={() => setActiveTab("preview")}
            onKeyDown={readOnly ? undefined : moveTabFocus}
            className="focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 outline-none hover:text-zinc-100 focus-visible:ring-2 aria-selected:bg-[#1e1e1e] aria-selected:text-zinc-100"
          >
            Preview
          </button>
        </div>
        <span
          role="status"
          aria-live="polite"
          className="ml-auto text-xs text-zinc-300"
        >
          {copyStatus === "copied"
            ? "Copied"
            : copyStatus === "error"
              ? "Copy failed"
              : ""}
        </span>
        <button
          type="button"
          aria-label="Copy Markdown"
          title="Copy Markdown"
          onClick={() => void copyMarkdown()}
          className="focus-visible:ring-ring rounded-md p-2 text-zinc-300 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2"
        >
          {copyStatus === "copied" ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>

      {!readOnly && activeTab === "write" ? (
        <div
          id={writePanelId}
          role="tabpanel"
          aria-labelledby={writeTabId}
          className="min-h-0 flex-1"
        >
          <textarea
            id={editorId}
            aria-label={label}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            value={value}
            maxLength={maxLength}
            onChange={(event) => onChange?.(event.target.value)}
            className="focus-visible:ring-ring block h-72 max-h-[350px] min-h-48 w-full resize-y bg-transparent p-4 font-mono text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-inset"
          />
        </div>
      ) : (
        <div
          id={previewPanelId}
          role="tabpanel"
          aria-labelledby={previewTabId}
          className="min-h-48 overflow-auto p-4"
        >
          <div className="markdown-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

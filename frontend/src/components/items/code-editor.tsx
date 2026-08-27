import Editor, { type BeforeMount } from "@monaco-editor/react";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CodeLanguage } from "@/lib/code-language";
import "@/lib/monaco-setup";

type CodeEditorBaseProps = {
  value: string;
  language: CodeLanguage;
  label?: string;
  maxLength?: number;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
};

export type CodeEditorProps = CodeEditorBaseProps &
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

type CopyStatus = "idle" | "copied" | "error";

const configureTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("devstash-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
      "editorGutter.background": "#1e1e1e",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#52525b88",
      "scrollbarSlider.hoverBackground": "#71717aaa",
      "scrollbarSlider.activeBackground": "#a1a1aacc",
    },
  });
};

export function CodeEditor({
  value,
  language,
  label = "Code content",
  maxLength,
  ariaInvalid,
  ariaDescribedBy,
  readOnly = false,
  onChange,
}: CodeEditorProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineCount = Math.max(1, value.split("\n").length);
  const editorHeight = Math.min(356, Math.max(192, lineCount * 19 + 28));

  useEffect(
    () => () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    },
    [],
  );

  async function copySource() {
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    copyResetRef.current = setTimeout(() => setCopyStatus("idle"), 2_000);
  }

  function changeSource(nextValue: string | undefined) {
    if (readOnly || nextValue === undefined) return;
    onChange?.(
      maxLength === undefined ? nextValue : nextValue.slice(0, maxLength),
    );
  }

  return (
    <div
      role="group"
      aria-label={`${label} code editor`}
      aria-readonly={readOnly}
      className="max-h-[400px] overflow-hidden rounded-lg border border-[#3b3b3b] bg-[#1e1e1e]"
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      data-testid="code-editor"
    >
      <div className="flex min-h-11 items-center gap-2 bg-[#2d2d2d] px-3">
        <span
          aria-hidden="true"
          className="flex items-center gap-1.5"
          data-testid="window-controls"
        >
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-auto truncate text-xs font-medium text-zinc-300">
          {language.label}
        </span>
        <span
          role="status"
          aria-live="polite"
          className="min-w-0 text-xs text-zinc-300"
        >
          {copyStatus === "copied"
            ? "Copied"
            : copyStatus === "error"
              ? "Copy failed"
              : ""}
        </span>
        <button
          type="button"
          aria-label="Copy code"
          title="Copy code"
          onClick={() => void copySource()}
          className="focus-visible:ring-ring rounded-md p-2 text-zinc-300 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2"
        >
          {copyStatus === "copied" ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      <Editor
        aria-label={label}
        beforeMount={configureTheme}
        height={editorHeight}
        language={language.id}
        loading={
          <div className="flex h-full items-center px-4 text-sm text-zinc-400">
            Loading editor…
          </div>
        }
        onChange={changeSource}
        options={{
          ariaLabel: label,
          automaticLayout: true,
          contextmenu: false,
          fontFamily:
            '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
          fontSize: 14,
          lineHeight: 19,
          minimap: { enabled: false },
          padding: { top: 12, bottom: 12 },
          readOnly,
          renderValidationDecorations: "off",
          scrollBeyondLastLine: false,
          scrollbar: {
            horizontalScrollbarSize: 10,
            verticalScrollbarSize: 10,
            useShadows: false,
          },
          stickyScroll: { enabled: false },
          wordWrap: "off",
        }}
        theme="devstash-dark"
        value={value}
      />
    </div>
  );
}

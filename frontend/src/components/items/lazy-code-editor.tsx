import { lazy, Suspense } from "react";

import type { CodeEditorProps } from "@/components/items/code-editor";

const MonacoCodeEditor = lazy(() =>
  import("@/components/items/code-editor").then((module) => ({
    default: module.CodeEditor,
  })),
);

export function LazyCodeEditor(props: CodeEditorProps) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-52 items-center rounded-lg border border-[#3b3b3b] bg-[#1e1e1e] px-4 text-sm text-zinc-400"
        >
          Loading code editor…
        </div>
      }
    >
      <MonacoCodeEditor {...props} />
    </Suspense>
  );
}

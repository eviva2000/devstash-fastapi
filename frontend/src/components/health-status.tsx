import { CircleCheck, CloudOff, LoaderCircle, RefreshCw } from "lucide-react";

import { useHealthStatus } from "@/hooks/use-health-status";

export function HealthStatus() {
  const { checkHealth, state } = useHealthStatus();

  if (state === "loading") {
    return (
      <output className="text-muted-foreground flex items-center gap-3 text-sm">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Checking API…
      </output>
    );
  }

  if (state === "healthy") {
    return (
      <output className="flex items-center gap-3 text-sm text-emerald-400">
        <CircleCheck aria-hidden="true" className="size-4" />
        API connected
      </output>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <output className="flex items-center gap-3 text-sm text-amber-300">
        <CloudOff aria-hidden="true" className="size-4" />
        API unavailable
      </output>
      <button
        className="border-border text-foreground hover:bg-muted focus-visible:ring-ring inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        type="button"
        onClick={checkHealth}
      >
        <RefreshCw aria-hidden="true" className="size-3.5" />
        Retry
      </button>
    </div>
  );
}

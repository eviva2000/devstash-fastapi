import { CircleCheck, CloudOff, LoaderCircle, RefreshCw } from "lucide-react";

import { useHealthStatus } from "@/hooks/use-health-status";

export function HealthStatus() {
  const { checkHealth, state } = useHealthStatus();

  if (state === "loading") {
    return (
      <div
        className="text-muted-foreground flex items-center gap-3 text-sm"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Checking API…
      </div>
    );
  }

  if (state === "healthy") {
    return (
      <div
        className="flex items-center gap-3 text-sm text-emerald-400"
        role="status"
      >
        <CircleCheck aria-hidden="true" className="size-4" />
        API connected
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className="flex items-center gap-3 text-sm text-amber-300"
        role="status"
      >
        <CloudOff aria-hidden="true" className="size-4" />
        API unavailable
      </span>
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

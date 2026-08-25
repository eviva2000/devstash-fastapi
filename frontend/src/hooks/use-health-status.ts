import { useCallback, useEffect, useState } from "react";

import { fetchHealth } from "@/api/health";

type HealthState = "loading" | "healthy" | "unavailable";

interface UseHealthStatusResult {
  checkHealth: () => void;
  state: HealthState;
}

export function useHealthStatus(): UseHealthStatusResult {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<HealthState>("loading");

  const checkHealth = useCallback(() => {
    setState("loading");
    setAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void fetchHealth(controller.signal)
      .then(() => setState("healthy"))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setState("unavailable");
        }
      });

    return () => controller.abort();
  }, [attempt]);

  return { checkHealth, state };
}

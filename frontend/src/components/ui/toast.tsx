import { CheckCircle2, CircleAlert, X } from "lucide-react";

type ToastProps = {
  kind: "success" | "error";
  message: string;
  onDismiss: () => void;
};

export function Toast({ kind, message, onDismiss }: ToastProps) {
  const Icon = kind === "success" ? CheckCircle2 : CircleAlert;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className="bg-card border-border fixed right-4 bottom-4 z-70 flex max-w-sm items-start gap-3 rounded-lg border p-4 shadow-xl"
    >
      <Icon
        aria-hidden="true"
        className={kind === "success" ? "text-emerald-400" : "text-red-300"}
      />
      <p className="flex-1 text-sm">{message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground rounded"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

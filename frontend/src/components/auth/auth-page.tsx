import { Eye, EyeOff } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/auth-context";

type AuthMode = "login" | "register";

function safeReturnPath(value: unknown): string {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/dashboard";
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isRegister = mode === "register";
  const state = location.state as { from?: unknown } | null;

  if (auth.status === "authenticated") {
    return <Navigate replace to={safeReturnPath(state?.from)} />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    try {
      const action = isRegister ? auth.register : auth.login;
      await action(email, password);
      navigate(safeReturnPath(state?.from), { replace: true });
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Authentication could not be completed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="bg-background text-foreground relative grid min-h-svh place-items-center overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top,oklch(0.55_0.2_255_/_0.2),transparent_62%)]"
      />
      <section className="border-border bg-card/85 relative w-full max-w-md rounded-2xl border p-7 shadow-2xl sm:p-9">
        <Link
          className="mb-8 inline-flex items-center gap-3 font-semibold"
          to="/"
        >
          <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-xl text-sm font-bold">
            DS
          </span>
          DevStash
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isRegister ? "Create your account" : "Sign in to DevStash"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {isRegister
            ? "Start a private workspace for your developer knowledge."
            : "Continue to your private developer workspace."}
        </p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Email
            <input
              required
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-border bg-background focus-visible:ring-ring mt-2 h-11 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
            />
          </label>
          <div>
            <label
              className="block text-sm font-medium"
              htmlFor="auth-password"
            >
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="auth-password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={isRegister ? "new-password" : "current-password"}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-border bg-background focus-visible:ring-ring h-11 w-full rounded-lg border pr-11 pl-3 outline-none focus-visible:ring-2"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 grid w-11 place-items-center"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
          </div>
          {isRegister && (
            <p className="text-muted-foreground text-xs">
              Use at least 12 characters. DevStash never returns your password.
            </p>
          )}
          {formError && (
            <p role="alert" className="text-sm text-red-400">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring h-11 w-full rounded-lg px-4 font-medium focus-visible:ring-2 disabled:cursor-wait disabled:opacity-60"
          >
            {pending
              ? isRegister
                ? "Creating account…"
                : "Signing in…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <p className="text-muted-foreground mt-6 text-center text-sm">
          {isRegister ? "Already have an account?" : "New to DevStash?"}{" "}
          <Link
            className="text-primary hover:underline"
            to={isRegister ? "/login" : "/register"}
            state={location.state}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}

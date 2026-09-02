import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { useAuth } from "@/auth/auth-context";
import { AuthProvider } from "@/auth/auth-provider";
import { AuthPage } from "@/components/auth/auth-page";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { LandingPage } from "@/components/landing-page";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/dashboard" element={<ProtectedDashboard />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function ProtectedDashboard() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === "loading") return <SessionLoadingPage />;
  if (auth.status === "error") {
    return (
      <main className="bg-background text-foreground grid min-h-svh place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Session unavailable</h1>
          <p role="alert" className="text-muted-foreground mt-2">
            {auth.error}
          </p>
          <button
            type="button"
            onClick={() => void auth.retry()}
            className="bg-primary text-primary-foreground mt-5 rounded-lg px-4 py-2"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }
  if (auth.status === "anonymous" || auth.user === null) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        replace
        state={auth.preserveReturnPath ? { from } : null}
        to="/login"
      />
    );
  }
  return <DashboardPage user={auth.user} onLogout={auth.logout} />;
}

function SessionLoadingPage() {
  return (
    <main className="bg-background text-foreground grid min-h-svh place-items-center p-6">
      <p role="status" className="text-muted-foreground">
        Restoring session…
      </p>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="bg-background text-foreground grid min-h-svh place-items-center p-6 text-center">
      <div>
        <p className="text-primary font-mono text-sm">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
        <Link
          className="text-primary mt-5 inline-block hover:underline"
          to="/dashboard"
        >
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}

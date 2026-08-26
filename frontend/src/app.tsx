import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { LandingPage } from "@/components/landing-page";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
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

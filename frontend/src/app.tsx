import { Archive, Braces, Search, Sparkles, Terminal } from "lucide-react";

import { HealthStatus } from "@/components/health-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const resourceTypes = [
  { icon: Braces, label: "Snippets" },
  { icon: Sparkles, label: "Prompts" },
  { icon: Terminal, label: "Commands" },
];

export function App() {
  return (
    <main className="bg-background text-foreground relative isolate min-h-svh overflow-x-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top,oklch(0.55_0.2_255_/_0.18),transparent_62%)]"
      />

      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6 py-8 sm:px-10 sm:py-12">
        <header className="border-border flex items-center justify-between border-b pb-5">
          <a
            className="flex items-center gap-3 font-semibold tracking-tight"
            href="/"
          >
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg text-sm font-bold">
              DS
            </span>
            DevStash
          </a>
          <span className="border-border bg-card/60 text-muted-foreground rounded-full border px-3 py-1 font-mono text-xs">
            foundation
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-primary mb-4 font-mono text-xs tracking-[0.24em] uppercase">
              Developer knowledge, organized
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Keep the useful parts of your work within reach.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-base leading-7 text-pretty sm:text-lg">
              DevStash brings snippets, prompts, commands, notes, and links into
              one searchable workspace.
            </p>

            <div
              className="mt-8 flex flex-wrap gap-3"
              aria-label="Planned resource types"
            >
              {resourceTypes.map(({ icon: Icon, label }) => (
                <span
                  className="border-border bg-card/50 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                  key={label}
                >
                  <Icon aria-hidden="true" className="text-primary size-4" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <Card className="bg-card/75 border-white/10 shadow-2xl shadow-black/20 backdrop-blur">
            <CardHeader>
              <div className="border-border bg-muted mb-2 flex size-10 items-center justify-center rounded-lg border">
                <Archive aria-hidden="true" className="text-primary size-5" />
              </div>
              <CardTitle>Application foundation</CardTitle>
              <CardDescription>
                React and FastAPI are connected and ready for the first product
                feature.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="border-border bg-background/70 rounded-lg border p-4">
                <HealthStatus />
              </div>
              <div className="border-border text-muted-foreground flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm">
                <Search aria-hidden="true" className="size-4" />
                Search arrives with a future feature.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

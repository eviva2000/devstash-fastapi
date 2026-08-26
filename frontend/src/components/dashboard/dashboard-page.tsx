import {
  Braces,
  FileText,
  Folder,
  Menu,
  Plus,
  Search,
  Sparkles,
  Star,
  Terminal,
} from "lucide-react";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import {
  collections,
  recentItems,
  resourceTypes,
  type Collection,
  type DashboardItem,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const itemIcons = {
  snippet: Braces,
  prompt: Sparkles,
  command: Terminal,
  note: FileText,
};
const accentClasses = {
  blue: "border-l-blue-500",
  yellow: "border-l-yellow-400",
  orange: "border-l-orange-500",
  violet: "border-l-violet-500",
  slate: "border-l-slate-500",
};

export function DashboardPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const drawerWasOpen = useRef(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useEffect(() => {
    if (drawerWasOpen.current && !drawerOpen) {
      navigationButtonRef.current?.focus();
    }
    drawerWasOpen.current = drawerOpen;
  }, [drawerOpen]);
  const totalItems = resourceTypes.reduce(
    (total, type) => total + type.count,
    0,
  );
  const stats = [
    { label: "Total items", value: totalItems },
    { label: "Collections", value: collections.length },
    {
      label: "Favorite items",
      value: recentItems.filter((item) => item.favorite).length,
    },
    {
      label: "Favorite collections",
      value: collections.filter((collection) => collection.favorite).length,
    },
  ];

  return (
    <main className="bg-background text-foreground flex min-h-svh">
      <DashboardSidebar
        collapsed={collapsed}
        onCollapse={() => setCollapsed((value) => !value)}
      />
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/70"
            onClick={closeDrawer}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="relative w-fit"
          >
            <DashboardSidebar mobile onClose={closeDrawer} />
          </div>
        </div>
      )}
      <section
        aria-hidden={drawerOpen ? true : undefined}
        className="min-w-0 flex-1"
      >
        <DashboardTopbar
          navigationButtonRef={navigationButtonRef}
          onOpenNavigation={() => setDrawerOpen(true)}
        />
        <div className="mx-auto max-w-[104rem] p-4 sm:p-6 lg:p-8">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Your developer knowledge hub
            </p>
          </header>
          <section aria-labelledby="stats-heading" className="mt-8">
            <h2 id="stats-heading" className="sr-only">
              Workspace statistics
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="bg-card/50">
                  <CardContent className="p-4 sm:p-5">
                    <p className="text-muted-foreground text-sm">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          <section className="mt-10" aria-labelledby="collections-heading">
            <div className="flex items-end justify-between">
              <h2 id="collections-heading" className="text-xl font-semibold">
                Recent collections
              </h2>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                View all
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </section>
          <ItemSection title="Recent items" items={recentItems} />
        </div>
      </section>
    </main>
  );
}

function DashboardTopbar({
  onOpenNavigation,
  navigationButtonRef,
}: {
  onOpenNavigation: () => void;
  navigationButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-30 flex h-20 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
      <button
        ref={navigationButtonRef}
        type="button"
        aria-label="Open navigation"
        onClick={onOpenNavigation}
        className="hover:bg-muted rounded-md p-2 md:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <div
        role="search"
        aria-label="Item search"
        className="bg-muted/60 text-muted-foreground flex h-11 max-w-md flex-1 items-center gap-3 rounded-lg px-3"
      >
        <Search aria-hidden="true" className="size-5" />
        <span className="truncate">Search items...</span>
        <kbd className="border-border bg-background/40 ml-auto hidden rounded border px-2 py-0.5 text-xs sm:inline">
          ⌘ K
        </kbd>
      </div>
      <button
        type="button"
        className="border-border hover:bg-muted ml-auto hidden h-11 items-center gap-2 rounded-lg border px-4 sm:flex"
      >
        <Folder aria-hidden="true" className="size-4" />
        <span>New Collection</span>
      </button>
      <button
        type="button"
        aria-label="New item"
        className="bg-foreground text-background hover:bg-foreground/90 flex h-11 items-center gap-2 rounded-lg px-3 sm:px-4"
      >
        <Plus aria-hidden="true" className="size-5" />
        <span className="hidden sm:inline">New Item</span>
      </button>
    </header>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Card
      id={collection.id}
      className={cn(
        "bg-card/35 min-h-44 border-l-[3px] transition-colors hover:bg-white/[0.04]",
        accentClasses[collection.accent],
      )}
    >
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{collection.name}</h3>
          {collection.favorite && (
            <Star
              aria-label="Favorite collection"
              className="size-4 fill-yellow-400 text-yellow-400"
            />
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {collection.itemCount} items
        </p>
        <p className="text-muted-foreground mt-5 text-sm">
          {collection.description}
        </p>
        <div
          className="text-muted-foreground mt-auto flex gap-2 pt-5"
          aria-label={`${collection.name} item types`}
        >
          {collection.types.map((type) => (
            <span className="bg-muted rounded px-2 py-0.5 text-xs" key={type}>
              {type}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ItemSection({
  title,
  items,
}: {
  title: string;
  items: DashboardItem[];
}) {
  return (
    <section
      className="mt-10"
      aria-labelledby={`${title.toLowerCase().replace(" ", "-")}-heading`}
    >
      <h2
        id={`${title.toLowerCase().replace(" ", "-")}-heading`}
        className="flex items-center gap-2 text-xl font-semibold"
      >
        {title}
      </h2>
      <div
        data-testid="recent-items-grid"
        className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4"
      >
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ItemRow({ item }: { item: DashboardItem }) {
  const Icon = itemIcons[item.type];
  return (
    <Card className="bg-card/35 border-l-primary h-full border-l-[3px]">
      <CardContent className="flex h-full min-h-48 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-primary/10 grid size-11 shrink-0 place-items-center rounded-lg">
            <Icon aria-hidden="true" className="text-primary size-5" />
          </span>
          <time className="text-muted-foreground text-xs">{item.date}</time>
        </div>
        <div className="mt-5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{item.title}</h3>
            {item.favorite && (
              <Star
                aria-label="Favorite item"
                className="size-4 fill-yellow-400 text-yellow-400"
              />
            )}
          </div>
          <p className="text-muted-foreground mt-1 truncate text-sm">
            {item.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

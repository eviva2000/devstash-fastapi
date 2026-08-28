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

import { type Item, type ItemType } from "@/api/items";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ItemCreateDialog } from "@/components/items/item-create-dialog";
import { ItemDrawer } from "@/components/items/item-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { useItems, type ItemLoadState } from "@/hooks/use-items";
import { collections, type Collection } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const itemIcons: Record<ItemType, typeof Braces> = {
  snippet: Braces,
  prompt: Sparkles,
  command: Terminal,
  note: FileText,
};
const itemTypeStyles: Record<
  ItemType,
  { border: string; iconBackground: string; icon: string }
> = {
  snippet: {
    border: "border-l-blue-500",
    iconBackground: "bg-blue-500/10",
    icon: "text-blue-400",
  },
  prompt: {
    border: "border-l-violet-500",
    iconBackground: "bg-violet-500/10",
    icon: "text-violet-400",
  },
  command: {
    border: "border-l-orange-500",
    iconBackground: "bg-orange-500/10",
    icon: "text-orange-400",
  },
  note: {
    border: "border-l-yellow-400",
    iconBackground: "bg-yellow-400/10",
    icon: "text-yellow-300",
  },
};
const accentClasses = {
  blue: "border-l-blue-500",
  yellow: "border-l-yellow-400",
  orange: "border-l-orange-500",
  violet: "border-l-violet-500",
  slate: "border-l-slate-500",
};

type ItemDrawerState = { itemId: string };

export function DashboardPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [navigationDrawerOpen, setNavigationDrawerOpen] = useState(false);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [itemDrawer, setItemDrawer] = useState<ItemDrawerState | null>(null);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const newItemButtonRef = useRef<HTMLButtonElement>(null);
  const navigationDrawerWasOpen = useRef(false);
  const itemDrawerWasOpen = useRef(false);
  const itemDrawerTriggerRef = useRef<HTMLElement | null>(null);
  const createItemDialogWasOpen = useRef(false);
  const createItemDialogTriggerRef = useRef<HTMLElement | null>(null);
  const {
    items,
    state: itemState,
    error: itemError,
    retry,
    create,
    update,
    remove,
  } = useItems();
  const closeNavigationDrawer = useCallback(
    () => setNavigationDrawerOpen(false),
    [],
  );
  const closeItemDrawer = useCallback(() => setItemDrawer(null), []);
  const openItemDrawer = useCallback((state: ItemDrawerState) => {
    itemDrawerTriggerRef.current = document.activeElement as HTMLElement | null;
    setItemDrawer(state);
  }, []);
  const openCreateItemDialog = useCallback(() => {
    createItemDialogTriggerRef.current =
      document.activeElement as HTMLElement | null;
    setCreateItemDialogOpen(true);
  }, []);

  useEffect(() => {
    if (navigationDrawerWasOpen.current && !navigationDrawerOpen) {
      navigationButtonRef.current?.focus();
    }
    navigationDrawerWasOpen.current = navigationDrawerOpen;
  }, [navigationDrawerOpen]);

  useEffect(() => {
    const isOpen = itemDrawer !== null;
    if (itemDrawerWasOpen.current && !isOpen) {
      if (itemDrawerTriggerRef.current?.isConnected) {
        itemDrawerTriggerRef.current.focus();
      } else {
        newItemButtonRef.current?.focus();
      }
    }
    itemDrawerWasOpen.current = isOpen;
  }, [itemDrawer]);

  useEffect(() => {
    if (
      createItemDialogWasOpen.current &&
      !createItemDialogOpen &&
      itemDrawer === null
    ) {
      createItemDialogTriggerRef.current?.focus();
    }
    createItemDialogWasOpen.current = createItemDialogOpen;
  }, [createItemDialogOpen, itemDrawer]);

  const selectedItem = itemDrawer
    ? items.find((item) => item.id === itemDrawer.itemId)
    : undefined;
  const stats = [
    { label: "Total items", value: itemState === "ready" ? items.length : "—" },
    { label: "Collections", value: collections.length },
    { label: "Favorite items", value: 0 },
    {
      label: "Favorite collections",
      value: collections.filter((collection) => collection.favorite).length,
    },
  ];

  return (
    <main className="bg-background text-foreground flex min-h-svh">
      <DashboardSidebar
        collapsed={collapsed}
        ariaHidden={itemDrawer !== null ? true : undefined}
        onCollapse={() => setCollapsed((value) => !value)}
      />
      {navigationDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/70"
            onClick={closeNavigationDrawer}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="relative w-fit"
          >
            <DashboardSidebar mobile onClose={closeNavigationDrawer} />
          </div>
        </div>
      )}
      <section
        aria-hidden={
          navigationDrawerOpen || itemDrawer !== null ? true : undefined
        }
        className="min-w-0 flex-1"
      >
        <DashboardTopbar
          navigationButtonRef={navigationButtonRef}
          newItemButtonRef={newItemButtonRef}
          onOpenNavigation={() => setNavigationDrawerOpen(true)}
          onNewItem={openCreateItemDialog}
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
          <ItemSection
            title="Recent items"
            items={items.slice(0, 6)}
            state={itemState}
            error={itemError}
            onRetry={() => void retry()}
            onCreate={openCreateItemDialog}
            onSelect={(item) => openItemDrawer({ itemId: item.id })}
          />
        </div>
      </section>
      <ItemCreateDialog
        open={createItemDialogOpen}
        onOpenChange={setCreateItemDialogOpen}
        onCreate={create}
        onCreated={(item) => {
          setCreateItemDialogOpen(false);
          setItemDrawer({ itemId: item.id });
        }}
      />
      {selectedItem && (
        <ItemDrawer
          key={selectedItem.id}
          item={selectedItem}
          onClose={closeItemDrawer}
          onUpdate={update}
          onDelete={remove}
        />
      )}
    </main>
  );
}

function DashboardTopbar({
  onOpenNavigation,
  navigationButtonRef,
  newItemButtonRef,
  onNewItem,
}: {
  onOpenNavigation: () => void;
  navigationButtonRef: RefObject<HTMLButtonElement | null>;
  newItemButtonRef: RefObject<HTMLButtonElement | null>;
  onNewItem: () => void;
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
        ref={newItemButtonRef}
        type="button"
        aria-label="New item"
        onClick={onNewItem}
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
  state,
  error,
  onRetry,
  onCreate,
  onSelect,
}: {
  title: string;
  items: Item[];
  state: ItemLoadState;
  error: string | null;
  onRetry: () => void;
  onCreate: () => void;
  onSelect: (item: Item) => void;
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
        {state === "loading" && (
          <p
            role="status"
            className="text-muted-foreground col-span-full py-10"
          >
            Loading items…
          </p>
        )}
        {state === "error" && (
          <div
            role="alert"
            className="border-border bg-card/35 col-span-full rounded-xl border p-6"
          >
            <p>{error ?? "Items could not be loaded."}</p>
            <button
              type="button"
              onClick={onRetry}
              className="border-border hover:bg-muted mt-4 rounded-lg border px-4 py-2"
            >
              Try again
            </button>
          </div>
        )}
        {state === "ready" && items.length === 0 && (
          <div className="border-border bg-card/35 col-span-full rounded-xl border p-8 text-center">
            <h3 className="font-semibold">No items yet</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Save your first snippet, prompt, command, or note.
            </p>
            <button
              type="button"
              onClick={onCreate}
              className="bg-foreground text-background mt-5 rounded-lg px-4 py-2"
            >
              Create your first item
            </button>
          </div>
        )}
        {state === "ready" &&
          items.map((item) => (
            <ItemCard key={item.id} item={item} onSelect={onSelect} />
          ))}
      </div>
    </section>
  );
}

function ItemCard({
  item,
  onSelect,
}: {
  item: Item;
  onSelect: (item: Item) => void;
}) {
  const Icon = itemIcons[item.item_type];
  const style = itemTypeStyles[item.item_type];
  return (
    <Card className={cn("bg-card/35 h-full border-l-[3px]", style.border)}>
      <button
        type="button"
        aria-label={`Open ${item.title}`}
        onClick={() => onSelect(item)}
        className="focus-visible:ring-ring h-full rounded-xl text-left outline-none focus-visible:ring-2"
      >
        <CardContent className="flex h-full min-h-48 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-lg",
                style.iconBackground,
              )}
            >
              <Icon
                aria-hidden="true"
                data-testid="item-type-icon"
                className={cn("size-5", style.icon)}
              />
            </span>
            <time className="text-muted-foreground text-xs">
              {formatRecentDate(item.updated_at)}
            </time>
          </div>
          <div className="mt-5 min-w-0 flex-1">
            <h3 className="truncate font-semibold">{item.title}</h3>
            <p className="text-muted-foreground mt-1 line-clamp-3 text-sm whitespace-pre-wrap">
              {item.content}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                {item.item_type}
              </span>
              {item.language && (
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                  {item.language}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}

function formatRecentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

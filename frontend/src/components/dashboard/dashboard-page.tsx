import {
  Braces,
  FileText,
  Folder,
  Menu,
  Plus,
  Sparkles,
  Star,
  Terminal,
} from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { itemTypes, type Item, type ItemType } from "@/api/items";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ItemCreateDialog } from "@/components/items/item-create-dialog";
import { ItemDrawer } from "@/components/items/item-drawer";
import { GlobalSearch } from "@/components/search/global-search";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGlobalSearchItems,
  useItems,
  type ItemLoadState,
} from "@/hooks/use-items";
import { collections, type Collection } from "@/lib/mock-data";
import { snippetLanguages } from "@/lib/code-language";
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

function readItemType(value: string | null): ItemType | undefined {
  return itemTypes.find((itemType) => itemType === value);
}

function readPage(value: string | null): number {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const query = {
    q: searchParams.get("q") ?? undefined,
    itemType: readItemType(searchParams.get("type")),
    language: searchParams.get("language") ?? undefined,
    page: readPage(searchParams.get("page")),
    pageSize: 12,
  };
  const {
    items,
    total,
    state: itemState,
    error: itemError,
    retry,
    create,
    update,
    remove,
  } = useItems(query);
  const globalSearch = useGlobalSearchItems();
  const updateSearch = useCallback(
    (changes: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!("page" in changes)) next.delete("page");
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );
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
  const openCollection = useCallback(
    (collection: Collection) => {
      const search = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
      navigate(`/dashboard${search}#${collection.id}`);
      requestAnimationFrame(() => {
        document.getElementById(collection.id)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    },
    [navigate, searchParams],
  );

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
    ? (items.find((item) => item.id === itemDrawer.itemId) ??
      globalSearch.items.find((item) => item.id === itemDrawer.itemId))
    : undefined;
  const stats = [
    { label: "Total items", value: itemState === "ready" ? total : "—" },
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
          search={
            <GlobalSearch
              items={globalSearch.items}
              collections={collections}
              state={globalSearch.state}
              error={globalSearch.error}
              onSelectItem={(item) => openItemDrawer({ itemId: item.id })}
              onSelectCollection={openCollection}
            />
          }
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
          <section
            className="mt-6 flex flex-wrap gap-3"
            aria-label="Item filters"
          >
            <label className="text-muted-foreground flex items-center gap-2 text-sm">
              Type
              <select
                aria-label="Filter by type"
                value={query.itemType ?? ""}
                onChange={(event) =>
                  updateSearch({ type: event.target.value || undefined })
                }
                className="border-border bg-card text-foreground rounded-lg border px-3 py-2"
              >
                <option value="">All types</option>
                {itemTypes.map((type) => (
                  <option key={type} value={type}>
                    {type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted-foreground flex items-center gap-2 text-sm">
              Language
              <select
                aria-label="Filter by language"
                value={query.language ?? ""}
                onChange={(event) =>
                  updateSearch({ language: event.target.value || undefined })
                }
                className="border-border bg-card text-foreground rounded-lg border px-3 py-2"
              >
                <option value="">All languages</option>
                {snippetLanguages.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
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
            title={
              query.q || query.itemType || query.language
                ? "Results"
                : "Recent items"
            }
            items={items}
            total={total}
            hasFilters={Boolean(query.q || query.itemType || query.language)}
            state={itemState}
            error={itemError}
            onRetry={() => void retry()}
            onCreate={openCreateItemDialog}
            onSelect={(item) => openItemDrawer({ itemId: item.id })}
            onClearFilters={() => setSearchParams({})}
            page={query.page}
            pageSize={query.pageSize}
            onPageChange={(page) => updateSearch({ page: String(page) })}
          />
        </div>
      </section>
      <ItemCreateDialog
        open={createItemDialogOpen}
        onOpenChange={setCreateItemDialogOpen}
        onCreate={async (input) => {
          const item = await create(input);
          globalSearch.add(item);
          return item;
        }}
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
          onUpdate={async (id, input) => {
            const item = await update(id, input);
            globalSearch.replace(item);
            return item;
          }}
          onDelete={async (id) => {
            await remove(id);
            globalSearch.remove(id);
          }}
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
  search,
}: {
  onOpenNavigation: () => void;
  navigationButtonRef: RefObject<HTMLButtonElement | null>;
  newItemButtonRef: RefObject<HTMLButtonElement | null>;
  onNewItem: () => void;
  search: ReactNode;
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
      {search}
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
  total,
  hasFilters,
  state,
  error,
  onRetry,
  onCreate,
  onSelect,
  onClearFilters,
  page,
  pageSize,
  onPageChange,
}: {
  title: string;
  items: Item[];
  total: number;
  hasFilters: boolean;
  state: ItemLoadState;
  error: string | null;
  onRetry: () => void;
  onCreate: () => void;
  onSelect: (item: Item) => void;
  onClearFilters: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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
        {state === "ready" && items.length === 0 && !hasFilters && (
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
        {state === "ready" && items.length === 0 && hasFilters && (
          <div className="border-border bg-card/35 col-span-full rounded-xl border p-8 text-center">
            <h3 className="font-semibold">No matching items</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Try a different search or clear your filters.
            </p>
            <button
              type="button"
              onClick={onClearFilters}
              className="border-border hover:bg-muted mt-5 rounded-lg border px-4 py-2"
            >
              Clear filters
            </button>
          </div>
        )}
        {state === "ready" &&
          items.map((item) => (
            <ItemCard key={item.id} item={item} onSelect={onSelect} />
          ))}
      </div>
      {state === "ready" && total > pageSize && (
        <nav
          className="mt-6 flex items-center justify-between"
          aria-label="Result pages"
        >
          <p className="text-muted-foreground text-sm">
            Page {page} of {Math.ceil(total / pageSize)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="border-border hover:bg-muted rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => onPageChange(page + 1)}
              className="border-border hover:bg-muted rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </nav>
      )}
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

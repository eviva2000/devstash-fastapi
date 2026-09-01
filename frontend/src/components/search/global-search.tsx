import {
  Braces,
  FileText,
  Folder,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Item, ItemType } from "@/api/items";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandSeparator,
} from "@/components/ui/command";
import type { ItemLoadState } from "@/hooks/use-items";
import type { Collection } from "@/lib/mock-data";

const itemIcons: Record<ItemType, typeof Braces> = {
  snippet: Braces,
  prompt: Sparkles,
  command: Terminal,
  note: FileText,
};

type GlobalSearchProps = {
  items: Item[];
  collections: Collection[];
  state: ItemLoadState;
  error: string | null;
  onSelectItem: (item: Item) => void;
  onSelectCollection: (collection: Collection) => void;
};

export function GlobalSearch({
  items,
  collections,
  state,
  error,
  onSelectItem,
  onSelectCollection,
}: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    function openFromShortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearch("");
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", openFromShortcut);
    return () => document.removeEventListener("keydown", openFromShortcut);
  }, []);

  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  function selectItem(item: Item) {
    setSearch("");
    setOpen(false);
    triggerRef.current?.focus();
    onSelectItem(item);
  }

  function selectCollection(collection: Collection) {
    setSearch("");
    setOpen(false);
    triggerRef.current?.focus();
    onSelectCollection(collection);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open global search"
        onClick={() => {
          setSearch("");
          setOpen(true);
        }}
        className="bg-muted/60 text-muted-foreground hover:bg-muted focus-visible:ring-ring flex h-11 max-w-md flex-1 items-center gap-3 rounded-lg px-3 text-left outline-none focus-visible:ring-2"
      >
        <Search aria-hidden="true" className="size-5 shrink-0" />
        <span className="truncate">Search items and collections...</span>
        <kbd className="border-border bg-background/40 ml-auto hidden rounded border px-2 py-0.5 text-xs sm:inline">
          ⌘ K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSearch("");
          setOpen(nextOpen);
        }}
        title="Global search"
        description="Search prefetched items and collections."
      >
        <CommandInput
          aria-label="Search items and collections"
          placeholder="Search items and collections..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList label="Global search results">
          <CommandEmpty>No matching items or collections.</CommandEmpty>
          {state === "loading" && (
            <CommandLoading label="Loading searchable items">
              Loading searchable items…
            </CommandLoading>
          )}
          {state === "error" && (
            <p role="alert" className="px-3 py-4 text-sm text-red-300">
              {error ?? "Searchable items could not be loaded."}
            </p>
          )}
          {state === "ready" && items.length > 0 && (
            <CommandGroup heading="Items">
              {items.map((item) => {
                const Icon = itemIcons[item.item_type];
                return (
                  <CommandItem
                    key={item.id}
                    value={`item ${item.id} ${item.title}`}
                    keywords={[item.title, item.content, item.item_type]}
                    onSelect={() => selectItem(item)}
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {item.title}
                        </span>
                        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[0.65rem] uppercase">
                          {item.item_type}
                        </span>
                      </span>
                      <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                        {item.content}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          {items.length > 0 && collections.length > 0 && <CommandSeparator />}
          {collections.length > 0 ? (
            <CommandGroup heading="Collections">
              {collections.map((collection) => (
                <CommandItem
                  key={collection.id}
                  value={`collection ${collection.id} ${collection.name}`}
                  keywords={[collection.name]}
                  onSelect={() => selectCollection(collection)}
                >
                  <Folder aria-hidden="true" className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {collection.name}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {collection.itemCount} items
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <p className="text-muted-foreground px-3 py-4 text-sm">
              No collections available.
            </p>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

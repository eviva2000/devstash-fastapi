import {
  Braces,
  ChevronLeft,
  File,
  Folder,
  Image,
  Link as LinkIcon,
  LogOut,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import type { User } from "@/api/auth";
import { collections, resourceTypes } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const typeIcons = {
  snippets: Braces,
  prompts: Sparkles,
  commands: Terminal,
  notes: File,
  files: File,
  images: Image,
  links: LinkIcon,
};
const typeColors = {
  blue: "text-blue-400",
  violet: "text-violet-400",
  orange: "text-orange-400",
  yellow: "text-yellow-300",
  slate: "text-slate-400",
  pink: "text-pink-400",
  emerald: "text-emerald-400",
};

type DashboardSidebarProps = {
  collapsed?: boolean;
  mobile?: boolean;
  ariaHidden?: boolean;
  user: User;
  onCollapse?: () => void;
  onClose?: () => void;
  onLogout: () => Promise<void>;
};

export function DashboardSidebar({
  collapsed = false,
  mobile = false,
  ariaHidden,
  user,
  onCollapse,
  onClose,
  onLogout,
}: DashboardSidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  useEffect(() => {
    if (!mobile) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keepFocusInDrawer = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keepFocusInDrawer);
    return () => {
      document.removeEventListener("keydown", keepFocusInDrawer);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobile, onClose]);

  return (
    <aside
      ref={sidebarRef}
      aria-label="Dashboard navigation"
      aria-hidden={ariaHidden}
      className={cn(
        "bg-card flex h-svh shrink-0 flex-col overflow-hidden",
        mobile
          ? "w-72 shadow-2xl"
          : "border-border sticky top-0 hidden self-start border-r transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-72",
      )}
    >
      <div className="flex h-20 shrink-0 items-center gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 font-bold text-white">
            DS
          </span>
          {!collapsed && (
            <span className="text-xl font-semibold">DevStash</span>
          )}
        </Link>
        {mobile ? (
          <button
            ref={closeRef}
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="focus-visible:ring-ring ml-auto rounded-md p-2 hover:bg-white/5 focus-visible:ring-2"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onCollapse}
            className="focus-visible:ring-ring ml-auto rounded-md p-2 hover:bg-white/5 focus-visible:ring-2"
          >
            <ChevronLeft
              aria-hidden="true"
              className={cn(
                "size-5 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </button>
        )}
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
        {!collapsed && (
          <p className="text-muted-foreground px-2 pt-3 pb-2 text-xs font-semibold tracking-wider uppercase">
            Types
          </p>
        )}
        <ul className="space-y-1">
          {resourceTypes.map((type) => {
            const Icon = typeIcons[type.slug as keyof typeof typeIcons];
            return (
              <li key={type.slug}>
                <Link
                  aria-label={
                    collapsed ? `${type.label}, ${type.count} items` : undefined
                  }
                  title={collapsed ? type.label : undefined}
                  to={`/items/${type.slug}`}
                  className="focus-visible:ring-ring hover:bg-muted flex items-center rounded-lg px-2 py-2.5 focus-visible:ring-2"
                >
                  <Icon
                    aria-hidden="true"
                    className={cn("size-5 shrink-0", typeColors[type.color])}
                  />
                  {!collapsed && (
                    <>
                      <span className="ml-3">{type.label}</span>
                      <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                        {type.count}
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        {!collapsed && (
          <>
            <div className="border-border my-5 border-t" />
            <p className="text-muted-foreground px-2 pb-2 text-xs font-semibold tracking-wider uppercase">
              Favorites
            </p>
            <ul className="space-y-1">
              {collections
                .filter((collection) => collection.favorite)
                .map((collection) => (
                  <li key={collection.id}>
                    <a
                      href={`#${collection.id}`}
                      className="hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-2.5"
                    >
                      <Folder
                        aria-hidden="true"
                        className="size-5 text-slate-400"
                      />
                      <span className="truncate">{collection.name}</span>
                      <span
                        aria-label="Favorite"
                        className="ml-auto text-yellow-400"
                      >
                        ★
                      </span>
                    </a>
                  </li>
                ))}
            </ul>
            <p className="text-muted-foreground px-2 pt-6 pb-2 text-xs font-semibold tracking-wider uppercase">
              Recent collections
            </p>
            <ul className="space-y-1">
              {collections
                .filter((collection) => !collection.favorite)
                .slice(0, 3)
                .map((collection) => (
                  <li key={collection.id}>
                    <a
                      href={`#${collection.id}`}
                      className="hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-2.5"
                    >
                      <Folder
                        aria-hidden="true"
                        className="size-5 text-slate-400"
                      />
                      <span className="truncate">{collection.name}</span>
                      <span className="text-muted-foreground ml-auto text-sm">
                        {collection.itemCount}
                      </span>
                    </a>
                  </li>
                ))}
            </ul>
          </>
        )}
      </nav>
      <div className="border-border flex h-20 shrink-0 items-center gap-3 border-t px-4">
        <span className="bg-muted grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold">
          {user.email.slice(0, 2).toUpperCase()}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0">
              <strong className="block truncate text-sm">Signed in</strong>
              <span className="text-muted-foreground block truncate text-xs">
                {user.email}
              </span>
            </span>
            <button
              type="button"
              aria-label="Sign out"
              disabled={logoutPending}
              title={logoutError ?? "Sign out"}
              onClick={() => {
                setLogoutPending(true);
                setLogoutError(null);
                void onLogout()
                  .catch((error: unknown) =>
                    setLogoutError(
                      error instanceof Error
                        ? error.message
                        : "Sign out could not be completed.",
                    ),
                  )
                  .finally(() => setLogoutPending(false));
              }}
              className="hover:bg-muted ml-auto rounded-md p-2"
            >
              <LogOut aria-hidden="true" className="size-5" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

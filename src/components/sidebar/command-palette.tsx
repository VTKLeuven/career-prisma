"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import type { ComponentType } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type PaletteItem = {
  title: string;
  url: string;
  group: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
};

const OPEN_EVENT = "open-command-palette";

/** Opens the palette from anywhere (the sidebar search button, page headers). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export const isMacPlatform = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Jump-to-page palette (⌘K / Ctrl+K). The admin has two dozen sections spread
 * over collapsible groups; typing three letters beats hunting for the right
 * group, so every navigable section is listed here.
 */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.group, item.description ?? ""].some((s) => s.toLowerCase().includes(q))
    );
  }, [items, query]);

  React.useEffect(() => setActive(0), [query]);

  // Keep the highlighted row in view while arrowing through a long list.
  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (item: PaletteItem | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.url);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(filtered[active]);
    }
  };

  // Group headings in list order, while keeping one flat index for the arrows.
  let lastGroup = "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">Go to page</DialogTitle>
        <div className="flex h-12 items-center gap-2.5 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md border bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No pages match “{query.trim()}”.
            </p>
          ) : (
            filtered.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const Icon = item.icon;
              return (
                <React.Fragment key={item.url + item.title}>
                  {showGroup && (
                    <div className="px-2.5 pt-2.5 pb-1 text-xs font-medium text-muted-foreground first:pt-1">
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => go(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left",
                      index === active ? "bg-[#f0f0f2]" : ""
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background text-[#3f3f46]">
                      {Icon ? <Icon className="size-3.5" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {item.description && (
                        <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </span>
                    {index === active && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

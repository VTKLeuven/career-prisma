"use client";

import * as React from "react";
import * as OutlineIcons from "@heroicons/react/24/outline";
import type { ComponentType } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

function componentNameToValue(componentName: string): string {
  return componentName
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function iconLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const ICON_OPTIONS = Object.entries(OutlineIcons)
  .filter(([name, component]) => name.endsWith("Icon") && typeof component === "function")
  .map(([componentName, component]) => {
    const value = componentNameToValue(componentName);
    return {
      value,
      label: iconLabel(value),
      Icon: component as IconComponent,
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const ICON_BY_VALUE = new Map(ICON_OPTIONS.map((option) => [option.value, option]));

export function HeroiconSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selected = ICON_BY_VALUE.get(value);
  const filtered = ICON_OPTIONS.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-w-0 flex-1 justify-between font-normal"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? <selected.Icon className="h-5 w-5 shrink-0" /> : null}
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected?.label ?? (value ? `Unknown icon (${value})` : "Choose an icon...")}
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
        </Button>
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Remove icon"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="rounded-md border bg-background p-3 shadow-sm">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search icons..."
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5">
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.label}
                aria-label={`Select ${option.label}`}
                className={cn(
                  "relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border p-2 text-center text-xs transition-colors hover:bg-accent",
                  value === option.value && "border-primary bg-accent"
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <option.Icon className="h-6 w-6" />
                <span className="line-clamp-2 leading-tight">{option.label}</span>
                {value === option.value ? (
                  <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary" />
                ) : null}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No icons found.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SelectOption } from "@/components/admin/types";
import {
  GRANT_TYPES,
  isGrantType,
  type CVBookGrantConfig,
  type GrantType,
  type SubOptionGrant,
} from "@/lib/grants";

/**
 * "Purchasing this grants access to": one checkbox per grant type in
 * lib/grants.ts, so a type added there shows up here without touching this
 * file. A type with settings gets its own editor below its checkbox -- today
 * only the CV book, which picks the book of the year it is sold in or specific
 * books (how an older book is sold).
 */
export function SubOptionGrantsEditor({
  value,
  onChange,
  cvBooks,
}: {
  value: unknown;
  onChange: (grants: SubOptionGrant[]) => void;
  /** Every CV book, as "2025-2026 · CV Book" options, for the specific-books picker. */
  cvBooks: SelectOption[];
}) {
  const grants = (Array.isArray(value) ? value : []).filter((g): g is SubOptionGrant =>
    isGrantType((g as { type?: unknown })?.type)
  );
  const find = (type: GrantType) => grants.find((g) => g.type === type);

  const toggle = (type: GrantType, on: boolean) => {
    const rest = grants.filter((g) => g.type !== type);
    if (!on) return onChange(rest);
    const config = type === "cv_book" ? ({ scope: "sale_year" } satisfies CVBookGrantConfig) : null;
    onChange([...rest, { type, config }]);
  };

  const setConfig = (type: GrantType, config: unknown) =>
    onChange(grants.map((g) => (g.type === type ? { ...g, config } : g)));

  return (
    <div className="space-y-3 rounded-md border p-3">
      {(Object.keys(GRANT_TYPES) as GrantType[]).map((type) => {
        const definition = GRANT_TYPES[type];
        const grant = find(type);
        const id = `grant-${type}`;
        return (
          <div key={type} className="space-y-2">
            <div className="flex items-start gap-2">
              <Checkbox id={id} checked={Boolean(grant)} onCheckedChange={(on) => toggle(type, on === true)} className="mt-0.5" />
              <div className="min-w-0">
                <Label htmlFor={id} className="font-medium">{definition.label}</Label>
                <p className="text-xs text-muted-foreground">{definition.description}</p>
              </div>
            </div>
            {grant && type === "cv_book" && (
              <CVBookGrantSettings
                config={grant.config as CVBookGrantConfig | null}
                cvBooks={cvBooks}
                onChange={(config) => setConfig("cv_book", config)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CVBookGrantSettings({
  config,
  cvBooks,
  onChange,
}: {
  config: CVBookGrantConfig | null;
  cvBooks: SelectOption[];
  onChange: (config: CVBookGrantConfig) => void;
}) {
  const scope = config?.scope === "books" ? "books" : "sale_year";
  const selected = new Set(config?.scope === "books" ? config.bookIds.map(String) : []);

  const toggleBook = (bookId: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(bookId);
    else next.delete(bookId);
    onChange({ scope: "books", bookIds: Array.from(next).map(Number) });
  };

  return (
    <div className="ml-6 space-y-2 border-l pl-3">
      <RadioGroup
        value={scope}
        onValueChange={(next) =>
          onChange(next === "books" ? { scope: "books", bookIds: Array.from(selected).map(Number) } : { scope: "sale_year" })
        }
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem id="cv-book-scope-year" value="sale_year" />
          <Label htmlFor="cv-book-scope-year" className="font-normal">The CV book of the year it is sold in</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id="cv-book-scope-books" value="books" />
          <Label htmlFor="cv-book-scope-books" className="font-normal">Specific CV books (e.g. to sell an older one)</Label>
        </div>
      </RadioGroup>
      {scope === "books" && (
        <div className="space-y-1.5 pl-6">
          {cvBooks.length === 0 ? (
            <p className="text-xs text-muted-foreground">There are no CV books yet.</p>
          ) : (
            cvBooks.map((book) => (
              <div key={book.value} className="flex items-center gap-2">
                <Checkbox
                  id={`cv-book-${book.value}`}
                  checked={selected.has(book.value)}
                  onCheckedChange={(on) => toggleBook(book.value, on === true)}
                />
                <Label htmlFor={`cv-book-${book.value}`} className="font-normal">{book.label}</Label>
              </div>
            ))
          )}
          {selected.size === 0 && <p className="text-xs text-destructive">Pick at least one book.</p>}
        </div>
      )}
    </div>
  );
}

/** "Company page, CV book" -- for the sub-options table. */
export function describeGrants(grants: { type: string }[] | undefined): string {
  const labels = (grants ?? [])
    .filter((g) => isGrantType(g.type))
    .map((g) => GRANT_TYPES[g.type as GrantType].label);
  return labels.length ? labels.join(", ") : "—";
}

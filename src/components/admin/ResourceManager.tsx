"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadFileAction } from "@/app/actions/media";
import { SimpleRichTextEditor } from "@/components/admin/SimpleRichTextEditor";
import type { FieldConfig, ResourceConfig, SelectOption } from "@/components/admin/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FormValues = Record<string, unknown>;

/**
 * Rows rendered at once. Admin resources run to thousands of rows (students,
 * company reps), and rendering them all is what makes those pages crawl.
 * Filtering still searches every row -- only the rendering is paged.
 */
const PAGE_SIZE = 50;

/** Sensible empty value for a field when creating a new row. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emptyValue(field: FieldConfig<any>): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  switch (field.type) {
    case "boolean":
      return false;
    case "multiselect":
      return [];
    default:
      return "";
  }
}

/** Extracts the editing value for a field from an existing row. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function editValue(field: FieldConfig<any>, row: Record<string, unknown>): unknown {
  if (field.getEditValue) return field.getEditValue(row as never);
  const raw = row[field.name];
  if (field.type === "boolean") return Boolean(raw);
  if (field.type === "multiselect") return Array.isArray(raw) ? raw : [];
  if (field.type === "number") return raw ?? "";
  return raw ?? "";
}

export function ResourceManager<T extends Record<string, unknown>>({
  config,
  initialRows,
  autoOpenRowId,
  autoOpenCreateValues,
}: {
  config: ResourceConfig<T>;
  initialRows: T[];
  /** Opens this row's edit dialog once on mount, for deep links from elsewhere. */
  autoOpenRowId?: string | null;
  /** Fallback for a deep link whose row does not exist yet: opens the create
   *  dialog with these values prefilled. */
  autoOpenCreateValues?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<T[]>(initialRows);
  const [search, setSearch] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<T | null>(null);
  const [values, setValues] = React.useState<FormValues>({});
  const [files, setFiles] = React.useState<Record<string, File>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Async relation options, keyed by field name.
  const [asyncOptions, setAsyncOptions] = React.useState<Record<string, SelectOption[]>>({});

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // Load async option lists once.
  React.useEffect(() => {
    let alive = true;
    const loaders = config.fields.filter((f) => f.loadOptions);
    Promise.all(
      loaders.map(async (f) => {
        try {
          const opts = await f.loadOptions!();
          return [f.name, opts] as const;
        } catch {
          return [f.name, []] as const;
        }
      })
    ).then((entries) => {
      if (!alive) return;
      setAsyncOptions(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const optionsFor = (field: FieldConfig<any>): SelectOption[] =>
    field.options ?? asyncOptions[field.name] ?? [];

  // Recomputed on every value change so a conditional field appears the moment
  // the field it depends on (typically the role) is switched.
  const visibleFields = config.fields.filter(
    (field) => !field.visible || field.visible(values)
  );

  const openCreate = (prefill?: FormValues) => {
    setEditing(null);
    setError(null);
    setFiles({});
    setValues({
      ...Object.fromEntries(config.fields.map((f) => [f.name, emptyValue(f)])),
      ...prefill,
    });
    setOpen(true);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    setError(null);
    setFiles({});
    setValues(Object.fromEntries(config.fields.map((f) => [f.name, editValue(f, row)])));
    setOpen(true);
  };

  const setValue = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  // A deep link lands on the list but means one specific row, so the dialog is
  // opened for it straight away -- once, so closing it does not reopen.
  const autoOpened = React.useRef(false);
  React.useEffect(() => {
    if (autoOpened.current || config.readOnly) return;
    if (!autoOpenRowId && !autoOpenCreateValues) return;
    const row = autoOpenRowId
      ? rows.find((candidate) => config.getId(candidate) === autoOpenRowId)
      : undefined;
    if (row) {
      autoOpened.current = true;
      openEdit(row);
      return;
    }
    if (autoOpenCreateValues && config.actions.create) {
      autoOpened.current = true;
      openCreate(autoOpenCreateValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenRowId, autoOpenCreateValues, rows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: FormValues = { ...values };

      // A field the form is currently hiding no longer applies to this row, so
      // send its empty value rather than whatever was typed before the switch.
      for (const field of config.fields) {
        if (field.visible && !field.visible(values)) {
          payload[field.name] = emptyValue(field);
        }
      }

      // Upload any freshly picked files, replacing the value with the file id.
      for (const field of config.fields) {
        if (field.type !== "image" && field.type !== "file") continue;
        const file = files[field.name];
        if (!file) continue;
        const fd = new FormData();
        fd.append("file", file);
        const res = await uploadFileAction(fd);
        if (!res.success || !res.data) {
          setError(`Failed to upload ${field.label}: ${res.error ?? "unknown error"}`);
          setSaving(false);
          return;
        }
        payload[field.name] = res.data.id;
      }

      // Normalise number fields ("" -> null, else Number).
      for (const field of config.fields) {
        if (field.type !== "number") continue;
        const v = payload[field.name];
        payload[field.name] = v === "" || v == null ? null : Number(v);
      }

      if (!editing && !config.actions.create) {
        setError("Creating is not supported here.");
        setSaving(false);
        return;
      }

      const result = editing
        ? await config.actions.update(config.getId(editing), payload)
        : await config.actions.create!(payload);

      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        setSaving(false);
        return;
      }

      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  /** Resolves to true once the row is gone, so callers can close the panel. */
  const handleDelete = async (row: T): Promise<boolean> => {
    const label = config.getLabel?.(row) ?? config.singular;
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return false;
    const id = config.getId(row);
    setDeletingId(id);
    try {
      const result = await config.actions.remove(id);
      if (!result.success) {
        toast.error(result.error ?? `Failed to delete ${config.singular.toLowerCase()}`);
        return false;
      }
      setRows((prev) => prev.filter((r) => config.getId(r) !== id));
      router.refresh();
      return true;
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !config.searchKeys?.length) return rows;
    return rows.filter((row) =>
      config.searchKeys!.some((key) =>
        String(row[key] ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, search, config]);

  const [pageIndex, setPageIndex] = React.useState(0);

  // A narrower filter can leave the current page out of range; jumping back to
  // the first page is less surprising than an empty table.
  React.useEffect(() => {
    setPageIndex(0);
  }, [search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const firstRow = currentPage * PAGE_SIZE;
  const visible = React.useMemo(
    () => filtered.slice(firstRow, firstRow + PAGE_SIZE),
    [filtered, firstRow]
  );

  // "/" jumps to the filter box, as in Dopl and most list-heavy tools.
  const searchRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (!searchRef.current) return;
      e.preventDefault();
      searchRef.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canEdit = !config.readOnly;
  const canCreate = !config.readOnly && !config.hideCreate && Boolean(config.actions.create);
  const noun = config.singular.toLowerCase();

  // A click on a row opens it, unless the click landed on something that is
  // interactive in its own right (a link or button rendered inside a cell).
  const onRowClick = (e: React.MouseEvent, row: T) => {
    if (!canEdit) return;
    if ((e.target as HTMLElement).closest("a, button, input, label, [role=checkbox], [data-no-row-click]")) return;
    openEdit(row);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {config.searchKeys?.length ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder={`Search ${noun}s…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-9"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground sm:block">
                /
              </kbd>
            )}
          </div>
        ) : null}
        <span className="text-sm text-muted-foreground tabular">
          {search.trim()
            ? `${filtered.length} of ${rows.length}`
            : `${rows.length} ${rows.length === 1 ? noun : `${noun}s`}`}
        </span>
        {canCreate ? (
          <Button className="sm:ml-auto" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> New {noun}
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        <Table containerClassName="max-h-[calc(100svh-15rem)] min-h-0">
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0">
            <TableRow>
              {config.columns.map((col) => (
                <TableHead key={col.key} className="whitespace-nowrap first:pl-4">
                  {col.label}
                </TableHead>
              ))}
              {canEdit ? <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length ? (
              visible.map((row) => {
                const id = config.getId(row);
                return (
                  <TableRow
                    key={id}
                    tabIndex={canEdit ? 0 : undefined}
                    onClick={(e) => onRowClick(e, row)}
                    onKeyDown={(e) => {
                      if (canEdit && e.key === "Enter" && e.target === e.currentTarget) openEdit(row);
                    }}
                    data-state={editing && open && config.getId(editing) === id ? "selected" : undefined}
                    className={cn(
                      "group/row",
                      canEdit && "cursor-pointer outline-none focus-visible:bg-surface-hover focus-visible:shadow-[inset_2px_0_0_#1f82d1]"
                    )}
                  >
                    {config.columns.map((col, colIndex) => {
                      const content = col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "—");
                      // Only plain-text cells can carry a tooltip; a rendered
                      // cell is a node, not a string.
                      const title =
                        typeof content === "string" ? content : undefined;
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            "first:pl-4",
                            colIndex === 0 && "font-medium text-foreground",
                            !col.wrap && "max-w-[22rem]",
                            col.wrap && "whitespace-normal"
                          )}
                        >
                          <div
                            className={cn(!col.wrap && "truncate")}
                            title={title}
                          >
                            {content}
                          </div>
                        </TableCell>
                      );
                    })}
                    {canEdit ? (
                      <TableCell className="w-12 pr-2 text-right">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                            onClick={() => handleDelete(row)}
                            disabled={deletingId === id}
                            aria-label={`Delete ${noun}`}
                          >
                            {deletingId === id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={config.columns.length + (canEdit ? 1 : 0)}
                  className="h-56 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-xl border bg-background text-[#0a6cba] shadow-[0_1px_2px_rgb(16_16_20/0.04)]">
                      {search.trim() ? <Search className="size-4" /> : <Inbox className="size-4" />}
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {search.trim() ? `No ${noun}s match “${search.trim()}”` : `No ${noun}s yet`}
                    </p>
                    {search.trim() ? (
                      <Button variant="outline" size="sm" onClick={() => setSearch("")}>Clear search</Button>
                    ) : canCreate ? (
                      <Button size="sm" onClick={() => openCreate()}>
                        <Plus className="h-4 w-4" /> New {noun}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {filtered.length > PAGE_SIZE ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t bg-[#fafafa] px-4 py-2 sm:flex-row">
            <p className="text-xs text-muted-foreground tabular">
              {firstRow + 1}–{Math.min(firstRow + PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="px-1 text-xs text-muted-foreground whitespace-nowrap tabular">
                {currentPage + 1} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPageIndex((p) => Math.min(pageCount - 1, p + 1))
                }
                disabled={currentPage >= pageCount - 1}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Editing happens in a panel that slides in from the right (Dopl's
          "peek"), so the list stays in view behind it. */}
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <SheetContent
          side="right"
          className={cn(
            "w-full gap-0 p-0 sm:max-w-xl sm:rounded-l-2xl",
            config.dialogClassName
          )}
        >
          <SheetHeader className="h-14 shrink-0 flex-row items-center gap-2 border-b px-5 py-0">
            <SheetTitle className="text-base">
              {editing ? (config.getLabel?.(editing) || `Edit ${noun}`) : `New ${noun}`}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {editing ? `Edit this ${noun}` : `Create a new ${noun}`}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div
              className={cn(
                "scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5",
                config.fieldsClassName ?? "space-y-5"
              )}
            >
              {visibleFields.map((field, index) => (
                <React.Fragment key={field.name}>
                  {field.section && field.section !== visibleFields[index - 1]?.section ? (
                    <div className="col-span-full border-b pb-2 pt-3 first:pt-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {field.section}
                      </h3>
                    </div>
                  ) : null}
                  <FieldInput
                    field={field}
                    value={values[field.name]}
                    options={optionsFor(field)}
                    onChange={(v) => setValue(field.name, v)}
                    onFile={(f) => setFiles((prev) => ({ ...prev, [field.name]: f }))}
                  />
                </React.Fragment>
              ))}
            </div>

            {error ? (
              <p className="mx-5 mb-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">{error}</p>
            ) : null}

            <div className="flex shrink-0 items-center gap-2 border-t bg-[#fafafa] px-5 py-3">
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[#b91c1c] hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                  disabled={deletingId === config.getId(editing)}
                  onClick={async () => {
                    if (await handleDelete(editing)) {
                      setOpen(false);
                      setEditing(null);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ) : null}
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : editing ? (
                    "Save changes"
                  ) : (
                    `Create ${noun}`
                  )}
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Renders a single field row based on its type. */
function FieldInput({
  field,
  value,
  options,
  onChange,
  onFile,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: FieldConfig<any>;
  value: unknown;
  options: SelectOption[];
  onChange: (value: unknown) => void;
  onFile: (file: File) => void;
}) {
  const id = `field-${field.name}`;

  if (field.type === "boolean") {
    return (
      <div className={cn("flex items-center gap-2", field.className)}>
        <Checkbox
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(c) => onChange(Boolean(c))}
        />
        <Label htmlFor={id}>{field.label}</Label>
      </div>
    );
  }

  if (field.renderInput) {
    return (
      <div className={cn("flex flex-col gap-2", field.className)}>
        <Label htmlFor={id}>
          {field.label}
          {field.required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {field.renderInput({ value, options, onChange })}
        {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", field.className)}>
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </Label>

      {field.type === "richtext" ? (
        <SimpleRichTextEditor
          value={String(value ?? "")}
          onChange={(html) => onChange(html)}
          placeholder={field.placeholder}
        />
      ) : field.type === "textarea" ? (
        <Textarea
          id={id}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      ) : field.type === "select" ? (
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={field.placeholder ?? "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {!field.required ? (
              <SelectItem value="__none__">
                <span className="text-muted-foreground italic">None</span>
              </SelectItem>
            ) : null}
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "multiselect" ? (
        <MultiSelect value={value} options={options} onChange={onChange} />
      ) : field.type === "image" ? (
        <ImageInput value={value} onChange={onChange} onFile={onFile} />
      ) : field.type === "file" ? (
        <FileInput value={value} onChange={onChange} onFile={onFile} />
      ) : field.type === "time" ? (
        <Input
          id={id}
          type="time"
          value={String(value ?? "").slice(0, 5)}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "date" ? (
        <Input
          id={id}
          type="date"
          value={String(value ?? "").slice(0, 10)}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "number" ? (
        <Input
          id={id}
          type="number"
          value={value == null ? "" : String(value)}
          placeholder={field.placeholder}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
    </div>
  );
}

/** Scrollable checkbox list backing a `multiselect` field. Value is an id array. */
function MultiSelect({
  value,
  options,
  onChange,
}: {
  value: unknown;
  options: SelectOption[];
  onChange: (value: string[]) => void;
}) {
  const selected = Array.isArray(value) ? value.map(String) : [];
  const toggle = (v: string, on: boolean) =>
    onChange(on ? [...selected, v] : selected.filter((s) => s !== v));

  return (
    <div className="rounded-md border max-h-48 overflow-y-auto divide-y">
      {options.length ? (
        options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/50"
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={(c) => toggle(opt.value, Boolean(c))}
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">No options available.</p>
      )}
    </div>
  );
}

/** File picker with preview for an `image` field. Value is a file id. */
function ImageInput({
  value,
  onChange,
  onFile,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  onFile: (file: File) => void;
}) {
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPreview(null);
  }, [value]);

  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const src =
    preview ??
    (typeof value === "string" && value ? `/api/files/${value}` : null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFile(file);
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  return (
    <div className="flex items-center gap-3">
      {src ? (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Preview"
            className="h-full w-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        </div>
      ) : null}
      <div className="flex-1 space-y-1">
        <Input type="file" accept="image/*" onChange={handleChange} />
        {typeof value === "string" && value ? (
          <button
            type="button"
            className="text-xs text-destructive hover:underline"
            onClick={() => {
              onChange("");
              setPreview(null);
            }}
          >
            Remove image
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** File picker for any file type (e.g. a PDF). Value is a file id. */
function FileInput({
  value,
  onChange,
  onFile,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  onFile: (file: File) => void;
}) {
  const [picked, setPicked] = React.useState<string | null>(null);

  return (
    <div className="space-y-1">
      <Input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onFile(file);
          setPicked(file.name);
        }}
      />
      {picked ? (
        <p className="text-xs text-muted-foreground">Selected: {picked}</p>
      ) : typeof value === "string" && value ? (
        <div className="flex items-center gap-2 text-xs">
          <a
            href={`/api/files/${value}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            View current file
          </a>
          <button
            type="button"
            className="text-destructive hover:underline"
            onClick={() => onChange("")}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

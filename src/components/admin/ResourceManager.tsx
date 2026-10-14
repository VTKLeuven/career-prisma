"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DataTable, RowDeleteButton } from "@/components/admin/DataTable";
import type { FieldConfig, ResourceConfig, SelectOption } from "@/components/admin/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirmDialog } from "@/components/confirm-dialog";

type FormValues = Record<string, unknown>;

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

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<T | null>(null);
  const [prefill, setPrefill] = React.useState<FormValues | undefined>(undefined);
  // Remounts the editor for every open, so its form starts from the row.
  const [editorKey, setEditorKey] = React.useState(0);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const openCreate = (values?: FormValues) => {
    setEditing(null);
    setPrefill(values);
    setEditorKey((k) => k + 1);
    setOpen(true);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    setPrefill(undefined);
    setEditorKey((k) => k + 1);
    setOpen(true);
  };

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

  /** Resolves to true once the row is gone, so callers can close the panel. */
  const handleDelete = async (row: T): Promise<boolean> => {
    const label = config.getLabel?.(row) ?? config.singular;
    if (!(await confirmDialog({ title: `Delete ${label}?`, description: "This cannot be undone.", confirmLabel: "Delete", destructive: true }))) return false;
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

  const canEdit = !config.readOnly;
  const canCreate = !config.readOnly && !config.hideCreate && Boolean(config.actions.create);
  const noun = config.singular.toLowerCase();

  const newButton = canCreate ? (
    <Button onClick={() => openCreate()}>
      <Plus className="h-4 w-4" /> New {noun}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        rows={rows}
        columns={config.columns}
        getRowId={config.getId}
        noun={noun}
        search={{ keys: config.searchKeys }}
        defaultSort={config.defaultSort}
        onRowClick={canEdit ? openEdit : undefined}
        isRowSelected={(row) => Boolean(editing && open && config.getId(editing) === config.getId(row))}
        toolbar={newButton}
        emptyAction={newButton}
        rowActions={
          canEdit
            ? (row) => (
                <RowDeleteButton
                  onClick={() => handleDelete(row)}
                  pending={deletingId === config.getId(row)}
                  label={`Delete ${noun}`}
                />
              )
            : undefined
        }
      />

      <ResourceEditor
        key={editorKey}
        config={config}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        row={editing}
        prefill={prefill}
        deleting={editing ? deletingId === config.getId(editing) : false}
        onDelete={editing ? () => handleDelete(editing) : undefined}
      />
    </div>
  );
}

/**
 * The side panel that creates or edits one row of a ResourceConfig -- what
 * ResourceManager opens on a row click, usable on its own elsewhere (the
 * company page edits a representative with the User Management config).
 * Mount it with a new key per open: the form starts from `row` or `prefill`.
 */
export function ResourceEditor<T extends Record<string, unknown>>({
  config,
  open,
  onOpenChange,
  row,
  prefill,
  onSaved,
  onDelete,
  deleting = false,
}: {
  config: ResourceConfig<T>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row to edit; null creates a new one. */
  row: T | null;
  prefill?: FormValues;
  onSaved?: () => void;
  /** Shows a Delete button; resolves to true once the row is gone. */
  onDelete?: () => Promise<boolean>;
  deleting?: boolean;
}) {
  const router = useRouter();
  const editing = row;
  const [values, setValues] = React.useState<FormValues>(() =>
    row
      ? Object.fromEntries(config.fields.map((f) => [f.name, editValue(f, row)]))
      : { ...Object.fromEntries(config.fields.map((f) => [f.name, emptyValue(f)])), ...prefill }
  );
  const [files, setFiles] = React.useState<Record<string, File>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const noun = config.singular.toLowerCase();

  // Async relation options, keyed by field name.
  const [asyncOptions, setAsyncOptions] = React.useState<Record<string, SelectOption[]>>({});

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

  const setValue = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));

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

      onOpenChange(false);
      onSaved?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Editing happens in a panel that slides in from the right (Dopl's
          "peek"), so the list stays in view behind it. */}
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
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
              {editing && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[#b91c1c] hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                  disabled={deleting}
                  onClick={async () => {
                    if (await onDelete?.()) onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ) : null}
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
    </>
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

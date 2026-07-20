"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Loader2, Search } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadFileAction } from "@/app/actions/media";
import type { FieldConfig, ResourceConfig, SelectOption } from "@/components/admin/types";

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
}: {
  config: ResourceConfig<T>;
  initialRows: T[];
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

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setFiles({});
    setValues(Object.fromEntries(config.fields.map((f) => [f.name, emptyValue(f)])));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: FormValues = { ...values };

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

  const handleDelete = async (row: T) => {
    const label = config.getLabel?.(row) ?? config.singular;
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    const id = config.getId(row);
    setDeletingId(id);
    try {
      const result = await config.actions.remove(id);
      if (!result.success) {
        alert(result.error ?? `Failed to delete ${config.singular.toLowerCase()}`);
        return;
      }
      setRows((prev) => prev.filter((r) => config.getId(r) !== id));
      router.refresh();
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {config.searchKeys?.length ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Filter ${config.singular.toLowerCase()}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        ) : null}
        {!config.hideCreate && config.actions.create ? (
          <Button className="sm:ml-auto" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add {config.singular}
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((col) => (
                <TableHead key={col.key} className="whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((row) => {
                const id = config.getId(row);
                return (
                  <TableRow key={id}>
                    {config.columns.map((col) => (
                      <TableCell key={col.key} className="align-top">
                        {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                      </TableCell>
                    ))}
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(row)}
                        disabled={deletingId === id}
                      >
                        {deletingId === id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={config.columns.length + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  No {config.singular.toLowerCase()}s yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${config.singular}` : `Add ${config.singular}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {config.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={values[field.name]}
                options={optionsFor(field)}
                onChange={(v) => setValue(field.name, v)}
                onFile={(f) => setFiles((prev) => ({ ...prev, [field.name]: f }))}
              />
            ))}

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : editing ? (
                  "Save changes"
                ) : (
                  `Create ${config.singular}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(c) => onChange(Boolean(c))}
        />
        <Label htmlFor={id}>{field.label}</Label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </Label>

      {field.type === "textarea" ? (
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

  const src =
    preview ??
    (typeof value === "string" && value ? `/api/files/${value}` : null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFile(file);
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

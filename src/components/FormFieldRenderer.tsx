"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, FileIcon } from "lucide-react";
import type { FormField } from "@/lib/schema";

type MasterOption = { value: string; label: string };
type Master = { id: string; name: string };
type FacultyItem = { id: string; name: string; masters?: Array<{ master_id: Master | string | null } | Master>; faculty_master?: unknown[]; faculty_masters?: unknown[] };

/** Normalize for matching: trim, collapse spaces, lowercase, strip content in brackets () [] {} */
function normalizeForMatch(s: string): string {
  return s
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function buildMasterDegreeOptions(
  masters: Master[],
  faculties: FacultyItem[] | null,
  includeFaculties: boolean
): MasterOption[] {
  if (!includeFaculties || !faculties || faculties.length === 0) {
    return masters.map((m) => ({ value: m.id, label: m.name }));
  }
  // Sort: faculties with masters first, then those without, "Other" always last
  const sortedFaculties = [...faculties].sort((a, b) => {
    const aName = (a.name ?? "").trim();
    const bName = (b.name ?? "").trim();
    const aIsOther = /^others?$/i.test(aName);
    const bIsOther = /^others?$/i.test(bName);
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    if (aIsOther && bIsOther) return 0;
    const aMasters = (a.masters ?? a.faculty_master ?? a.faculty_masters ?? []) as unknown[];
    const bMasters = (b.masters ?? b.faculty_master ?? b.faculty_masters ?? []) as unknown[];
    const aHasMasters = aMasters.length > 0;
    const bHasMasters = bMasters.length > 0;
    if (aHasMasters && !bHasMasters) return -1;
    if (!aHasMasters && bHasMasters) return 1;
    return 0;
  });
  const options: MasterOption[] = [];
  for (const faculty of sortedFaculties) {
    const facultyName = faculty.name ?? "";
    const isOther = /^others?$/i.test(facultyName.trim());
    const mastersList = (faculty.masters ?? faculty.faculty_master ?? faculty.faculty_masters ?? []) as Array<{ master_id?: Master | string | null } | Master>;
    const resolvedMasters: Master[] = mastersList
      .map((item) => {
        if (item && typeof item === "object" && "master_id" in item) {
          const mid = (item as { master_id: Master | string | null }).master_id;
          if (mid && typeof mid === "object" && "id" in mid) return mid as Master;
          if (mid && typeof mid === "string") return masters.find((m) => m.id === mid) ?? null;
          return null;
        }
        return (item && typeof item === "object" && "id" in item) ? (item as Master) : null;
      })
      .filter((m): m is Master => m != null && typeof m === "object" && "id" in m && "name" in m);

    if (resolvedMasters.length === 0) {
      options.push({
        value: `fac:${faculty.id}`,
        label: isOther ? "Other" : `Fac. ${facultyName}`,
      });
    } else {
      for (const m of resolvedMasters) {
        options.push({
          value: `fac:${faculty.id}:${m.id}`,
          label: isOther ? `${facultyName} - ${m.name}` : `Fac. ${facultyName} - ${m.name}`,
        });
      }
    }
  }
  return options;
}

function MasterDegreesField({
  field,
  value,
  onChange,
  error,
  disabled,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [masters, setMasters] = useState<Master[]>([]);
  const [faculties, setFaculties] = useState<FacultyItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const includeFaculties = field.masterDegreesIncludeFaculties ?? false;
  const isMultiple = field.masterDegreesMultiple ?? false;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [mastersRes, facultiesRes] = await Promise.all([
          fetch("/api/masters"),
          includeFaculties ? fetch("/api/faculties") : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const mastersData = await mastersRes.json();
        setMasters(Array.isArray(mastersData) ? mastersData : []);
        if (facultiesRes?.ok) {
          const facultiesData = await facultiesRes.json();
          setFaculties(Array.isArray(facultiesData) ? facultiesData : []);
        } else {
          setFaculties(null);
        }
      } catch {
        if (!cancelled) setMasters([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [includeFaculties]);

  let options = buildMasterDegreeOptions(masters, faculties, includeFaculties);
  const legacyOpts = (field.options ?? []).filter(
    (o): o is string => typeof o === "string" && o.trim().length > 0
  );
  // When "Add faculties" is on but faculties API returned no faculty-formatted options, use field.options
  const hasFacFormatFromApi = options.some((o) => /^fac\.\s/i.test(o.label.trim()));
  if (includeFaculties && !hasFacFormatFromApi && legacyOpts.some((o) => /^fac\.\s/i.test(o.trim()))) {
    options = legacyOpts.map((o) => ({ value: o, label: o }));
  } else {
    const seenNormalized = new Set(options.map((o) => normalizeForMatch(o.label)));
    for (const leg of legacyOpts) {
      const norm = normalizeForMatch(leg);
      if (!seenNormalized.has(norm)) {
        options = [...options, { value: leg, label: leg }];
        seenNormalized.add(norm);
      }
    }
  }

  const inputClassName = error ? "border-destructive" : "";

  // Match stored value by option value OR label (for migration from checkbox/select with same option names)
  // Normalize spaces so "fac.  Architecture  -  X" matches "fac. Architecture - X"
  const findOptionByValueOrLabel = (v: string) =>
    options.find(
      (o) =>
        o.value === v ||
        o.label === v ||
        normalizeForMatch(o.value) === normalizeForMatch(v) ||
        normalizeForMatch(o.label) === normalizeForMatch(v)
    );

  // Normalize stored values from label format to value format (fac:facId:masterId) when loading
  // e.g. converted checkbox data ["Fac. X - Y"] -> ["fac:1:12"]
  useEffect(() => {
    if (loading || options.length === 0) return;
    const items = Array.isArray(value) ? value : value != null && value !== "" ? [value] : [];
    const isCanonical = (s: string) => /^fac:[^:]+:[^:]+$/.test(s) || /^fac:[^:]+$/.test(s) || /^[0-9a-f-]{36}$/i.test(s);
    if (items.every((item) => isCanonical(String(item).trim()))) return;
    const normalized: string[] = [];
    let needsUpdate = false;
    for (const item of items) {
      const s = String(item).trim();
      if (!s) continue;
      const opt = options.find(
        (o) =>
          o.value === s ||
          o.label === s ||
          normalizeForMatch(o.value) === normalizeForMatch(s) ||
          normalizeForMatch(o.label) === normalizeForMatch(s)
      );
      if (opt) {
        normalized.push(opt.value);
        if (opt.value !== s) needsUpdate = true;
      } else {
        normalized.push(s);
      }
    }
    if (needsUpdate) {
      onChange(isMultiple ? normalized : normalized[0] ?? "");
    }
  }, [loading, options.length, value, isMultiple, onChange]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-2">Loading master degrees...</div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No master degrees are configured. Ask an administrator to add masters and faculties.
      </div>
    );
  }

  if (isMultiple) {
    const currentValues: string[] = Array.isArray(value)
      ? (value as unknown[]).map((v) => String(v))
      : value != null && value !== ""
        ? [String(value)]
        : [];
    return (
      <div className="space-y-2">
        {options.map((opt, index) => {
          const checked = currentValues.some(
            (v) =>
              v === opt.value ||
              v === opt.label ||
              normalizeForMatch(v) === normalizeForMatch(opt.value) ||
              normalizeForMatch(v) === normalizeForMatch(opt.label)
          );
          return (
            <div key={opt.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.id}-${index}`}
                checked={checked}
                onCheckedChange={(isChecked) => {
                  const matchesOpt = (val: string) =>
                    val === opt.value ||
                    val === opt.label ||
                    normalizeForMatch(val) === normalizeForMatch(opt.value) ||
                    normalizeForMatch(val) === normalizeForMatch(opt.label);
                  if (isChecked === true) {
                    const without = currentValues.filter((v) => !matchesOpt(v));
                    onChange([...without, opt.value]);
                  } else {
                    onChange(currentValues.filter((v) => !matchesOpt(v)));
                  }
                }}
                disabled={disabled}
              />
              <Label htmlFor={`${field.id}-${index}`} className="text-sm font-normal cursor-pointer">
                {opt.label}
              </Label>
            </div>
          );
        })}
      </div>
    );
  }

  const strValue = value != null && value !== "" ? String(value) : "";
  const EMPTY_SENTINEL = "__empty__";
  const hasEmpty = !field.required;
  const matchingOption = strValue ? findOptionByValueOrLabel(strValue) : null;
  const selectValue =
    strValue === ""
      ? (hasEmpty ? EMPTY_SENTINEL : undefined)
      : matchingOption
        ? matchingOption.value
        : strValue;

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onChange(v === EMPTY_SENTINEL ? "" : v)}
      required={field.required}
      disabled={disabled}
    >
      <SelectTrigger id={field.id} className={inputClassName}>
        <SelectValue placeholder={field.placeholder || "Select a master degree"} />
      </SelectTrigger>
      <SelectContent>
        {hasEmpty && <SelectItem value={EMPTY_SENTINEL}>(Empty)</SelectItem>}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
        {strValue && !options.some((o) => o.value === strValue) && (
          <SelectItem value={strValue}>{strValue}</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

function FileDisplay({ fileId }: { fileId: string }) {
  const [fileInfo, setFileInfo] = useState<{
    type: string;
    filename: string | null;
  } | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileUrl = `/api/files/${fileId}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/files/${fileId}/info`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setFileInfo({
            type: data.type ?? "application/octet-stream",
            filename: data.filename ?? null,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  const isImage = fileInfo ? fileInfo.type?.toLowerCase().startsWith("image/") : null;
  const isPdf = fileInfo?.type?.toLowerCase() === "application/pdf";

  return (
    <div className="flex flex-col gap-2">
      {/* Image preview */}
      {isImage === true && !imageError && (
        <div className="relative rounded-lg border bg-muted overflow-hidden flex items-center justify-center min-h-[120px] max-h-48">
          <img
            src={fileUrl}
            alt="File preview"
            className="max-w-full max-h-48 object-contain"
            onLoad={() => setImageError(false)}
            onError={() => setImageError(true)}
          />
        </div>
      )}
      {/* PDF preview */}
      {isPdf && (
        <div className="rounded-lg border bg-muted overflow-hidden min-h-[200px] max-h-64">
          <iframe
            src={`${fileUrl}#toolbar=0`}
            title="PDF preview"
            className="w-full h-64 border-0"
          />
        </div>
      )}
      {/* Generic file preview (doc, xlsx, etc.) */}
      {fileInfo && !isImage && !isPdf && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-background">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {fileInfo.filename || "Uploaded file"}
            </p>
            <p className="text-xs text-muted-foreground">{fileInfo.type}</p>
          </div>
        </div>
      )}
      {/* Fallback when metadata not yet loaded - try image first */}
      {!fileInfo && !imageError && (
        <div className="relative rounded-lg border bg-muted overflow-hidden flex items-center justify-center min-h-[120px] max-h-48">
          <img
            src={fileUrl}
            alt="File preview"
            className="max-w-full max-h-48 object-contain"
            onLoad={() => setImageError(false)}
            onError={() => setImageError(true)}
          />
        </div>
      )}
      {!fileInfo && imageError && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted">
          <FileIcon className="h-6 w-6 shrink-0 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">File uploaded</span>
        </div>
      )}
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center gap-1 w-fit"
      >
        <Download className="h-3 w-3 shrink-0" />
        <span>View/Download</span>
      </a>
    </div>
  );
}

export function FormFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}) {
  const inputClassName = error ? "border-destructive" : "";

  switch (field.type) {
    case "textarea": {
      const textareaValue = value != null && value !== "" ? String(value) : "";
      const wordLimit = field.validation?.wordLimit;
      const wordCount = countWords(textareaValue);
      const isOverLimit = wordLimit && wordCount > wordLimit;

      return (
        <div className="space-y-2">
          <Textarea
            id={field.id}
            name={field.name}
            value={textareaValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={isOverLimit ? "border-destructive" : inputClassName}
            rows={4}
            disabled={disabled}
          />
          {wordLimit && (
            <div className="flex items-center justify-between text-xs">
              <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
                {wordCount} / {wordLimit} words
              </span>
              {isOverLimit && <span className="text-destructive font-medium">Word limit exceeded</span>}
            </div>
          )}
        </div>
      );
    }

    case "email":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="email"
          value={value != null && value !== "" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "number":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="number"
          value={value != null && value !== "" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClassName}
          min={field.validation?.min}
          max={field.validation?.max}
          disabled={disabled}
        />
      );

    case "date":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="date"
          value={value != null && value !== "" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "date-range": {
      const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
      const dateRangeValue = {
        start: raw.start != null && raw.start !== "" ? String(raw.start) : "",
        end: raw.end != null && raw.end !== "" ? String(raw.end) : "",
      };
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor={`${field.id}-start`} className="text-sm">Start Date</Label>
            <Input
              id={`${field.id}-start`}
              name={`${field.name}_start`}
              type="date"
              value={dateRangeValue.start || ""}
              onChange={(e) => onChange({ ...dateRangeValue, start: e.target.value })}
              required={field.required}
              className={inputClassName}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${field.id}-end`} className="text-sm">End Date</Label>
            <Input
              id={`${field.id}-end`}
              name={`${field.name}_end`}
              type="date"
              value={dateRangeValue.end || ""}
              onChange={(e) => onChange({ ...dateRangeValue, end: e.target.value })}
              required={field.required}
              min={dateRangeValue.start || undefined}
              className={inputClassName}
              disabled={disabled}
            />
          </div>
        </div>
      );
    }

    case "time":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="time"
          value={value != null && value !== "" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "linkedin":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="url"
          value={value != null && value !== "" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "https://linkedin.com/in/username"}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "master-degrees":
      return (
        <MasterDegreesField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case "select": {
      const options = field.options || [];
      const strValue = value != null && value !== "" ? String(value) : "";
      // Radix Select requires value to match a SelectItem; empty string has no matching item.
      // Use sentinel for optional fields so user can clear selection.
      const EMPTY_SENTINEL = "__empty__";
      const hasEmpty = !field.required;
      const selectValue =
        strValue === ""
          ? (hasEmpty ? EMPTY_SENTINEL : undefined)
          : options.includes(strValue)
            ? strValue
            : strValue; // value not in options (e.g. schema changed) - add as fallback item below

      return (
        <Select
          value={selectValue}
          onValueChange={(v) => onChange(v === EMPTY_SENTINEL ? "" : v)}
          required={field.required}
          disabled={disabled}
        >
          <SelectTrigger id={field.id} className={inputClassName}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {hasEmpty && (
              <SelectItem value={EMPTY_SENTINEL}>(Empty)</SelectItem>
            )}
            {options.map((option, index) => (
              <SelectItem key={index} value={option}>
                {option}
              </SelectItem>
            ))}
            {/* If stored value is not in options (e.g. form schema changed), show it so it displays */}
            {strValue && !options.includes(strValue) && (
              <SelectItem value={strValue}>{strValue}</SelectItem>
            )}
          </SelectContent>
        </Select>
      );
    }

    case "checkbox": {
      const options = field.options || [];
      if (options.length === 0) {
        const isChecked = value === true || value === "true" || value === "yes" || value === 1;
        return (
          <Checkbox
            id={field.id}
            checked={isChecked}
            onCheckedChange={(checked) => onChange(checked === true)}
            disabled={disabled}
          />
        );
      }
      // Multi-option checkbox: value is array of strings. Normalize for DB/JSON (array, single string, or null).
      const currentValues: string[] = Array.isArray(value)
        ? (value as unknown[]).map((v) => String(v))
        : value != null && value !== ""
          ? [String(value)]
          : [];
      return (
        <div className="space-y-2">
          {options.map((option, index) => {
            const checked = currentValues.some((v) => String(v) === option);
            return (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${index}`}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    if (isChecked === true) {
                      onChange([...currentValues.filter((v) => String(v) !== option), option]);
                    } else {
                      onChange(currentValues.filter((v) => String(v) !== option));
                    }
                  }}
                  disabled={disabled}
                />
                <Label htmlFor={`${field.id}-${index}`} className="text-sm font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            );
          })}
        </div>
      );
    }

    case "radio": {
      const radioValue = value != null && value !== "" ? String(value) : "";
      return (
        <RadioGroup value={radioValue} onValueChange={onChange} required={field.required} disabled={disabled}>
          {(field.options || []).map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem id={`${field.id}-${index}`} value={option} disabled={disabled} />
              <Label
                htmlFor={`${field.id}-${index}`}
                className="text-sm font-normal cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    case "file": {
      const maxFileSize = field.validation?.maxFileSize || 50 * 1024 * 1024;
      const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024));
      const isMultiple = field.multiple || false;
      const hasFiles =
        value != null &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0);

      return (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex-1 min-w-0 space-y-2">
            <Input
              id={field.id}
              name={field.name}
              type="file"
              multiple={isMultiple}
              disabled={disabled}
              required={field.required && !value}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;

                const oversizedFiles = files.filter((file) => file.size > maxFileSize);
                if (oversizedFiles.length > 0) {
                  alert(`Some files exceed the maximum size of ${maxFileSizeMB}MB. Please select smaller files.`);
                  e.target.value = "";
                  return;
                }

                if (field.validation?.allowedFileTypes && field.validation.allowedFileTypes.length > 0) {
                  const invalidFiles = files.filter(
                    (file) =>
                      !field.validation!.allowedFileTypes!.some(
                        (type) => file.type === type || file.name.toLowerCase().endsWith(type.replace("*", ""))
                      )
                  );
                  if (invalidFiles.length > 0) {
                    alert(
                      `Some files have invalid types. Allowed types: ${field.validation.allowedFileTypes.join(", ")}`
                    );
                    e.target.value = "";
                    return;
                  }
                }

                try {
                  const uploadedIds: string[] = [];
                  for (const file of files) {
                    const formData = new FormData();
                    formData.append("file", file);
                    const response = await fetch("/api/upload", { method: "POST", body: formData });
                    if (!response.ok) {
                      const err = await response.json().catch(() => ({}));
                      throw new Error(err.error || "Upload failed");
                    }
                    const result = await response.json();
                    if (!result.id) throw new Error("Upload succeeded but no file ID returned");
                    uploadedIds.push(result.id);
                  }
                  onChange(isMultiple ? uploadedIds : uploadedIds[0]);
                } catch (error) {
                  console.error("File upload error:", error);
                  alert(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
                  e.target.value = "";
                }
              }}
              className={inputClassName}
            />
            <p className="text-xs text-muted-foreground">
              Max {maxFileSizeMB}MB{isMultiple ? " (multiple allowed)" : ""}
            </p>
            {hasFiles ? (
              <p className="text-sm text-muted-foreground font-medium">
                ✓ {isMultiple && Array.isArray(value) ? `${(value as string[]).length} file(s) uploaded` : "File uploaded"}
              </p>
            ) : null}
          </div>
          {hasFiles ? (
            <div className="shrink-0 w-full sm:w-auto sm:min-w-[200px] space-y-2">
              {isMultiple && Array.isArray(value) ? (
                (value as string[]).map((id, idx) => (
                  <div key={idx}>
                    <FileDisplay fileId={typeof id === "string" ? id : String(id)} />
                  </div>
                ))
              ) : (
                <FileDisplay fileId={typeof value === "string" ? value : String(value)} />
              )}
            </div>
          ) : null}
        </div>
      );
    }

    case "text":
    default:
      return (
        <Input
          id={field.id}
          name={field.name}
          type="text"
          value={value != null && value !== "" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );
  }
}

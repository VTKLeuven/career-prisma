"use client";

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
import { Download } from "lucide-react";
import type { FormField } from "@/lib/schema";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

function FileDisplay({ fileId }: { fileId: string }) {
  return (
    <a
      href={`/api/files/${fileId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline flex items-center gap-1"
    >
      <Download className="h-3 w-3" />
      <span>View/Download</span>
    </a>
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

      return (
        <div className="space-y-2">
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
          {value ? (
            <div className="text-sm space-y-2">
              {isMultiple && Array.isArray(value) ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground font-medium">✓ {value.length} file(s) uploaded:</p>
                  <ul className="space-y-1">
                    {value.map((id, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <FileDisplay fileId={typeof id === "string" ? id : String(id)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">✓ File uploaded:</span>
                  <FileDisplay fileId={typeof value === "string" ? value : String(value)} />
                </div>
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

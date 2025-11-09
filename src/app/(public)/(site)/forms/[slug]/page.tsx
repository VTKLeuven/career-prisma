"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPublicFormBySlugAction, submitFormResponseAction } from "@/app/actions/forms";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { FormField, FormSchema } from "@/lib/schema";
import { formatDateBE, formatDateTimeBE } from "@/lib/date-utils";

type PublicForm = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  metadata?: {
    deadline?: string;
    max_entries?: number;
    [key: string]: unknown;
  };
  activeVersion: {
    id: string;
    version_number: number;
    schema: FormSchema;
  };
  isFull?: boolean; // Indicates if form has reached max capacity
};

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadForm = React.useCallback(async () => {
    setLoading(true);
    try {
      const formData = await fetchPublicFormBySlugAction(slug);
      if (!formData) {
        // Form not found or no active version
        setForm(null);
      } else {
        setForm(formData);
      }
    } catch (error) {
      console.error("Error loading form:", error);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form) return false;

    form.activeVersion.schema.fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.name];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.name] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form || !validateForm()) {
      return;
    }

    // Check deadline (with time)
    if (form.metadata?.deadline) {
      const deadline = new Date(form.metadata.deadline);
      const now = new Date();
      if (now > deadline) {
        alert(`This form's deadline has passed. The deadline was ${formatDateTimeBE(deadline)}.`);
        return;
      }
    }

    // Note: Max entries check is handled server-side in submitFormResponseAction
    // Client-side check removed since we can't count responses with public permissions

    setSubmitting(true);
    try {
      await submitFormResponseAction({
        form_version_id: form.activeVersion.id,
        data: formData,
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit form. Please try again.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const isDeadlinePassed = React.useMemo(() => {
    if (!form?.metadata?.deadline) {
      return false;
    }
    try {
      const deadline = new Date(form.metadata.deadline);
      const now = new Date();
      const passed = now > deadline;
      console.log('[PublicFormPage] Deadline check:', {
        deadline: form.metadata.deadline,
        deadlineDate: deadline.toISOString(),
        now: now.toISOString(),
        passed
      });
      return passed;
    } catch (error) {
      console.error('[PublicFormPage] Error parsing deadline:', error);
      return false;
    }
  }, [form?.metadata?.deadline]);

  const isFormFull = React.useMemo(() => {
    return form?.isFull === true;
  }, [form?.isFull]);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-2">Form Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The form you&apos;re looking for doesn&apos;t exist or is not currently available.
              </p>
              <Button onClick={() => router.push("/")}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFormFull && form.metadata?.max_entries) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-2">Form Full</h2>
              <p className="text-muted-foreground mb-4">
                This form has reached its maximum capacity and is no longer accepting new entries.
              </p>
              <Button onClick={() => router.push("/")}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
              <p className="text-muted-foreground mb-4">
                Your response has been submitted successfully.
              </p>
              <Button onClick={() => router.push("/")}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{form.name}</CardTitle>
              {form.description && (
                <CardDescription className="mt-2">{form.description}</CardDescription>
              )}
              {form.metadata?.deadline && (
                <div className="mt-2">
                  <Badge variant="secondary">
                    Deadline: {formatDateTimeBE(form.metadata.deadline)}
                    {isDeadlinePassed && " (Passed)"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isDeadlinePassed && form.metadata?.deadline && (
            <div className="mb-4 p-4 bg-muted border border-border rounded-md">
              <p className="text-muted-foreground">
                This form's deadline has passed. Submissions are no longer accepted. The deadline was {formatDateTimeBE(form.metadata.deadline)}.
              </p>
            </div>
          )}
          {isFormFull && form.metadata?.max_entries && (
            <div className="mb-4 p-4 bg-muted border border-border rounded-md">
              <p className="text-muted-foreground">
                This form has reached its maximum capacity and is no longer accepting new entries.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {(() => {
              // Group fields by layout rows
              const rows: FormField[][] = [];
              let currentRow: FormField[] = [];
              let currentRowWidth = 0;

              form.activeVersion.schema.fields.forEach((field) => {
                const layout = field.layout || 'full';
                const width = layout === 'half' ? 0.5 : layout === 'third' ? 1/3 : layout === 'two-thirds' ? 2/3 : 1;

                // If adding this field would exceed 1, start a new row
                if (currentRowWidth + width > 1 && currentRow.length > 0) {
                  rows.push(currentRow);
                  currentRow = [];
                  currentRowWidth = 0;
                }

                currentRow.push(field);
                currentRowWidth += width;

                // If the row is full or field is full width, finalize the row
                if (currentRowWidth >= 1 || layout === 'full') {
                  rows.push(currentRow);
                  currentRow = [];
                  currentRowWidth = 0;
                }
              });

              // Add any remaining fields
              if (currentRow.length > 0) {
                rows.push(currentRow);
              }

              const getColSpanClass = (layout: string) => {
                switch (layout) {
                  case 'half': return 'md:col-span-6';
                  case 'third': return 'md:col-span-4';
                  case 'two-thirds': return 'md:col-span-8';
                  default: return 'md:col-span-12';
                }
              };

              return rows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {row.map((field) => {
                    const layout = field.layout || 'full';
                    
                    return (
                      <div key={field.id} className={`space-y-2 ${getColSpanClass(layout)}`}>
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <FormFieldRenderer
                          field={field}
                          value={formData[field.name]}
                          onChange={(value) => handleFieldChange(field.name, value)}
                          error={errors[field.name]}
                          disabled={isDeadlinePassed || isFormFull}
                        />
                        {errors[field.name] && (
                          <p className="text-sm text-destructive">{errors[field.name]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || isDeadlinePassed || isFormFull}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FormFieldRenderer({
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
    case "textarea":
      return (
        <Textarea
          id={field.id}
          name={field.name}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClassName}
          rows={4}
          disabled={disabled}
        />
      );

    case "email":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="email"
          value={(value as string) || ""}
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
          value={(value as string) || ""}
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
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "date-range":
      const dateRangeValue = value as { start?: string; end?: string } || {};
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
              onChange={(e) => {
                const newValue = { ...dateRangeValue, end: e.target.value };
                onChange(newValue);
              }}
              required={field.required}
              min={dateRangeValue.start || undefined}
              className={inputClassName}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case "time":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="time"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );

    case "select":
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={onChange}
          required={field.required}
          disabled={disabled}
        >
          <SelectTrigger id={field.id} className={inputClassName}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option, index) => (
              <SelectItem key={index} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          {(field.options || []).map((option, index) => {
            const checked = Array.isArray(value) && value.includes(option);
            return (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${index}`}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const currentValues = (Array.isArray(value) ? value : []) as string[];
                    if (isChecked) {
                      onChange([...currentValues, option]);
                    } else {
                      onChange(currentValues.filter((v) => v !== option));
                    }
                  }}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`${field.id}-${index}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            );
          })}
        </div>
      );

    case "radio":
      return (
        <RadioGroup
          value={(value as string) || ""}
          onValueChange={onChange}
          required={field.required}
          disabled={disabled}
        >
          {(field.options || []).map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem
                id={`${field.id}-${index}`}
                value={option}
                disabled={disabled}
              />
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

    case "file":
      const maxFileSize = field.validation?.maxFileSize || 50 * 1024 * 1024; // Default 50MB
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
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;

              // Validate file sizes
              const oversizedFiles = files.filter(file => file.size > maxFileSize);
              if (oversizedFiles.length > 0) {
                alert(`Some files exceed the maximum size of ${maxFileSizeMB}MB. Please select smaller files.`);
                e.target.value = '';
                return;
              }

              // Validate file types if specified
              if (field.validation?.allowedFileTypes && field.validation.allowedFileTypes.length > 0) {
                const invalidFiles = files.filter(file => 
                  !field.validation!.allowedFileTypes!.some(type => 
                    file.type === type || file.name.toLowerCase().endsWith(type.replace('*', ''))
                  )
                );
                if (invalidFiles.length > 0) {
                  alert(`Some files have invalid types. Allowed types: ${field.validation.allowedFileTypes.join(', ')}`);
                  e.target.value = '';
                  return;
                }
              }

              try {
                const uploadedIds: string[] = [];
                
                // Upload files sequentially
                for (const file of files) {
                  const formData = new FormData();
                  formData.append('file', file);

                  const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
                    throw new Error(errorData.error || 'Upload failed');
                  }

                  const result = await response.json();
                  uploadedIds.push(result.id);
                }

                // Store file ID(s)
                if (isMultiple) {
                  onChange(uploadedIds);
                } else {
                  onChange(uploadedIds[0]);
                }
              } catch (error) {
                console.error('File upload error:', error);

                // Check if it's a permission error
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('permission') || errorMessage.includes('FORBIDDEN')) {
                  alert('File upload failed: Directus permissions not configured.\n\nPlease ask an administrator to enable CREATE permission for Public role on directus_files collection.');
                } else {
                  alert(`Failed to upload file: ${errorMessage}. Please try again or contact support.`);
                }

                // Clear the file input
                e.target.value = '';
              }
            }}
            required={field.required}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            Maximum file size: {maxFileSizeMB}MB{isMultiple ? ' (multiple files allowed)' : ''}
          </p>
          {value ? (
            <div className="text-sm text-muted-foreground">
              {isMultiple && Array.isArray(value) ? (
                <div className="space-y-1">
                  <p>✓ {value.length} file(s) uploaded:</p>
                  <ul className="list-disc list-inside ml-2">
                    {value.map((id, idx) => (
                      <li key={idx}>File {idx + 1}: {id}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>✓ File uploaded: {typeof value === 'string' ? value : 'File selected'}</p>
              )}
            </div>
          ) : null}
        </div>
      );

    case "text":
    default:
      return (
        <Input
          id={field.id}
          name={field.name}
          type="text"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClassName}
          disabled={disabled}
        />
      );
  }
}


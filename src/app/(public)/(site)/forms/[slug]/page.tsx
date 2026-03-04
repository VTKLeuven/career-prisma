"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { CheckCircle2, Loader2, Download } from "lucide-react";
import type { FormField, FormSchema } from "@/lib/schema";
import { formatDateBE, formatDateTimeBE } from "@/lib/date-utils";
import { getDirectusImageUrl } from "@/components/Images";
import NextImage from "next/image";

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
  isFull?: boolean;
  requiresLogin?: boolean;
  isAuthenticated?: boolean;
  studentEmail?: string;
  /** Student's latest response (any version) - for version-upgrade: show only new fields */
  existingResponse?: { form_version_id: string; data: Record<string, unknown> } | null;
};

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const redirectTo = searchParams.get("redirectTo");

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** When student filled old version: fields that need new input (not in old response) */
  const [fieldsToShowForUpgrade, setFieldsToShowForUpgrade] = useState<Set<string> | null>(null);

  const loadForm = React.useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await fetchPublicFormBySlugAction(slug);
      if (!fetched) {
        setForm(null);
      } else {
        setForm(fetched);

        // Prefill from existing response (any version - old or latest)
        const isOldVersion = fetched.existingResponse && fetched.existingResponse.form_version_id !== fetched.activeVersion.id;
        const oldData = fetched.existingResponse?.data ?? {};
        const merged: Record<string, unknown> = {};
        const fieldsToShow: string[] = [];
        for (const field of fetched.activeVersion?.schema?.fields ?? []) {
          const val = oldData[field.name];
          const hasOld = val !== undefined && val !== null && val !== "" && (!Array.isArray(val) || val.length > 0);
          merged[field.name] = hasOld ? val : undefined;
          if (!hasOld) fieldsToShow.push(field.name);
        }
        setFormData(merged);

        // Pre-fill email from student account if not already set
        if (fetched.studentEmail && fetched.activeVersion?.schema?.fields) {
          const emailField = fetched.activeVersion.schema.fields.find(f => f.name === 'email' && f.type === 'email');
          if (emailField && merged[emailField.name] == null) {
            setFormData((prev) => ({ ...prev, [emailField.name]: fetched.studentEmail }));
          }
        }

        setFieldsToShowForUpgrade(isOldVersion ? new Set(fieldsToShow) : null);

        // If old version response and all fields already filled → auto-submit new response
        if (isOldVersion && fieldsToShow.length === 0) {
          setSubmitting(true);
          try {
            await submitFormResponseAction({
              form_version_id: fetched.activeVersion.id,
              data: merged,
            });
            setSubmitted(true);
          } catch (e) {
            console.error("Auto-submit version upgrade failed:", e);
          } finally {
            setSubmitting(false);
          }
        }
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

  // Check if login is required and redirect if needed
  useEffect(() => {
    if (form && form.requiresLogin && !form.isAuthenticated) {
      // Redirect to login with return URL
      const currentPath = `/forms/${slug}`;
      router.push(`/student-login?redirectTo=${encodeURIComponent(currentPath)}`);
    }
  }, [form, slug, router]);

  // Helper function to count words
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

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
      
      // Validate word limit for textarea fields
      if (field.type === "textarea" && field.validation?.wordLimit) {
        const value = formData[field.name] as string;
        if (value) {
          const wordCount = countWords(value);
          if (wordCount > field.validation.wordLimit) {
            newErrors[field.name] = `${field.label} exceeds the word limit of ${field.validation.wordLimit} words (${wordCount} words entered)`;
          }
        }
      }

      // Validate LinkedIn profile URL format
      if (field.type === "linkedin") {
        const value = formData[field.name] as string;
        if (value && !/^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?(\?.*)?$/i.test(value.trim())) {
          newErrors[field.name] = `${field.label} must be a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username)`;
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

  // Show loading state while redirecting to login
  if (form && form.requiresLogin && !form.isAuthenticated) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to login...</p>
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
              {redirectTo ? (
                <Button onClick={() => router.push(redirectTo)}>Continue</Button>
              ) : (
                <Button onClick={() => router.push("/")}>Go Home</Button>
              )}
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
          {fieldsToShowForUpgrade !== null && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This form was updated. Your previous answers have been prefilled. Please review and complete any new questions.
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
                    const imageUrl = field.image ? getDirectusImageUrl(field.image) : null;
                    
                    return (
                      <div key={field.id} className={`space-y-2 ${getColSpanClass(layout)}`}>
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.description && (
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                        )}
                        {imageUrl && (
                          <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden border">
                            <NextImage
                              src={imageUrl}
                              alt={field.label || "Field image"}
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
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
              <Button type="button" variant="outline" onClick={() => router.push("/")}>
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

// Helper function to count words
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Component to display file with preview and download link
function FileDisplay({ fileId }: { fileId: string }) {
  const [isImage, setIsImage] = useState<boolean | null>(null);
  const downloadUrl = `/api/files/${fileId}`;

  return (
    <div className="flex flex-col gap-2">
      {isImage !== false && (
        <div className="relative w-24 h-24 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
          <img
            src={downloadUrl}
            alt="File preview"
            className="max-w-full max-h-full object-contain"
            onLoad={() => setIsImage(true)}
            onError={() => setIsImage(false)}
          />
        </div>
      )}
      <a
        href={downloadUrl}
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
      const textareaValue = (value as string) || "";
      const wordLimit = field.validation?.wordLimit;
      const wordCount = countWords(textareaValue);
      const isOverLimit = wordLimit && wordCount > wordLimit;
      
      return (
        <div className="space-y-2">
          <Textarea
            id={field.id}
            name={field.name}
            value={textareaValue}
            onChange={(e) => {
              // Allow typing freely - validation happens on submit
              onChange(e.target.value);
            }}
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
              {isOverLimit && (
                <span className="text-destructive font-medium">
                  Word limit exceeded
                </span>
              )}
            </div>
          )}
        </div>
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

    case "linkedin":
      return (
        <Input
          id={field.id}
          name={field.name}
          type="url"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "https://linkedin.com/in/username"}
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
                  console.log('[Form] Starting upload for file:', file.name, 'Size:', file.size, 'bytes');
                  const formData = new FormData();
                  formData.append('file', file);

                  let response: Response;
                  try {
                    response = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData,
                    });
                  } catch (fetchError) {
                    console.error('[Form] Fetch error (network/connection issue):', fetchError);
                    const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
                    if (fetchErrorMessage.includes('Failed to fetch') || fetchErrorMessage.includes('NetworkError')) {
                      throw new Error('Network error: Unable to connect to the server. This may indicate the file is too large for the server configuration or there is a network issue.');
                    }
                    throw new Error(`Upload failed: ${fetchErrorMessage}`);
                  }

                  if (!response.ok) {
                    // Try to get error message from response
                    let errorMessage = 'Upload failed';
                    try {
                      const errorData = await response.json();
                      errorMessage = errorData.error || errorData.message || errorData.details || `Upload failed with status ${response.status}`;
                      console.error('[Form] Upload error response:', errorData);
                    } catch (jsonError) {
                      // If JSON parsing fails, try to get text
                      try {
                        const errorText = await response.text();
                        errorMessage = errorText || `Upload failed with status ${response.status}`;
                        console.error('[Form] Upload error text:', errorText);
                      } catch (textError) {
                        errorMessage = `Upload failed with status ${response.status}: ${response.statusText}`;
                        console.error('[Form] Could not parse error response');
                      }
                    }
                    throw new Error(errorMessage);
                  }

                  const result = await response.json();
                  if (!result.id) {
                    throw new Error('Upload succeeded but no file ID was returned');
                  }
                  console.log('[Form] Upload successful, file ID:', result.id);
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


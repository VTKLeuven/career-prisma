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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { FormField, FormSchema } from "@/lib/schema";
import { formatDateBE } from "@/lib/date-utils";

type PublicForm = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  metadata?: {
    deadline?: string;
    [key: string]: unknown;
  };
  activeVersion: {
    id: string;
    version_number: number;
    schema: FormSchema;
  };
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

    // Check deadline
    if (form.metadata?.deadline) {
      const deadline = new Date(form.metadata.deadline);
      const now = new Date();
      if (now > deadline) {
        alert(`This form's deadline has passed. The deadline was ${formatDateBE(deadline)}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await submitFormResponseAction({
        form_version_id: form.activeVersion.id,
        data: formData,
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isDeadlinePassed = form?.metadata?.deadline 
    ? new Date(form.metadata.deadline) < new Date()
    : false;

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
                  <Badge variant={isDeadlinePassed ? "destructive" : "secondary"}>
                    Deadline: {formatDateBE(form.metadata.deadline)}
                    {isDeadlinePassed && " (Passed)"}
                  </Badge>
                </div>
              )}
            </div>
            <Badge variant="outline">v{form.activeVersion.version_number}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isDeadlinePassed && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-destructive font-medium">
                This form's deadline has passed. Submissions are no longer accepted.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {form.activeVersion.schema.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <FormFieldRenderer
                  field={field}
                  value={formData[field.name]}
                  onChange={(value) => handleFieldChange(field.name, value)}
                  error={errors[field.name]}
                />
                {errors[field.name] && (
                  <p className="text-sm text-destructive">{errors[field.name]}</p>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || isDeadlinePassed}>
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
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
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
        />
      );

    case "select":
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={onChange}
          required={field.required}
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
        <div className="space-y-2">
          {(field.options || []).map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${field.id}-${index}`}
                name={field.name}
                value={option}
                checked={value === option}
                onChange={(e) => onChange(e.target.value)}
                required={field.required}
                className="cursor-pointer"
              />
              <Label
                htmlFor={`${field.id}-${index}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      );

    case "file":
      return (
        <div className="space-y-2">
          <Input
            id={field.id}
            name={field.name}
            type="file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  // Upload to Directus via API route
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

                  // Store the Directus file ID
                  onChange(result.id);
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
              }
            }}
            required={field.required}
            className={inputClassName}
          />
          {value ? (
            <p className="text-sm text-muted-foreground">
              ✓ File uploaded: {typeof value === 'string' ? value : 'File selected'}
            </p>
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
        />
      );
  }
}


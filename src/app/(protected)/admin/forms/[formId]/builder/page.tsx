"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchFormByIdAction,
  fetchFormVersionsAction,
  createFormVersionAction,
} from "@/app/actions/forms";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Type, 
  FileText, 
  Mail, 
  Hash, 
  List, 
  CheckSquare, 
  CircleDot, 
  Upload, 
  Calendar,
  ChevronUp,
  ChevronDown,
  GripVertical,
  X,
  Image as ImageIcon,
  Linkedin
} from "lucide-react";
import type { Form, FormVersion, FormField, FormSchema } from "@/lib/schema";
import Link from "next/link";
import { getDirectusImageUrl } from "@/components/Images";
import NextImage from "next/image";

type FieldType = "text" | "textarea" | "email" | "number" | "select" | "checkbox" | "radio" | "file" | "date" | "date-range" | "time" | "linkedin";

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "textarea", label: "Text Area", icon: FileText },
  { value: "email", label: "Email", icon: Mail },
  { value: "number", label: "Number", icon: Hash },
  { value: "select", label: "Select Dropdown", icon: List },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "radio", label: "Radio Buttons", icon: CircleDot },
  { value: "file", label: "File Upload", icon: Upload },
  { value: "date", label: "Date", icon: Calendar },
  { value: "date-range", label: "Date Range", icon: Calendar },
  { value: "time", label: "Time", icon: Calendar },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
];

const getFieldIcon = (type: FieldType) => {
  const fieldType = FIELD_TYPES.find(ft => ft.value === type);
  return fieldType?.icon || Type;
};

export default function FormBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<Form | null>(null);
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<FormVersion | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const loadForm = React.useCallback(async () => {
    setLoading(true);
    try {
      const [formData, versionsData] = await Promise.all([
        fetchFormByIdAction(formId),
        fetchFormVersionsAction(formId),
      ]);

      setForm(formData);
      setVersions(versionsData);

      const active = versionsData.find((v) => v.is_active);
      setActiveVersion(active ?? null);

      if (active) {
        setFields(active.schema.fields ?? []);
      }
    } catch (error) {
      console.error("Error loading form:", error);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const addField = () => {
    const fieldNumber = fields.length + 1;
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: `field_${fieldNumber}`,
      label: "",
      type: "text",
      required: false,
      placeholder: "",
    };
    setFields([...fields, newField]);
  };

  const generateFieldName = (label: string): string => {
    if (!label) return '';
    // Convert to lowercase, replace spaces and special chars with underscores, remove multiple underscores
    return label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    const currentField = newFields[index];
    
    // Auto-generate field name from label if label is being updated
    if (updates.label !== undefined && updates.label !== currentField.label) {
      const generatedName = generateFieldName(updates.label);
      if (generatedName) {
        updates.name = generatedName;
      }
    }
    
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    
    if (sourceIndex === targetIndex) return;

    const newFields = [...fields];
    const [removed] = newFields.splice(sourceIndex, 1);
    newFields.splice(targetIndex, 0, removed);
    setFields(newFields);
  };

  const handleSave = async (isActive: boolean) => {
    setSaving(true);
    try {
      const schema: FormSchema = { fields };
      await createFormVersionAction({
        form_id: formId,
        schema,
        is_active: isActive,
      });

      setShowSaveDialog(false);
      router.push("/admin/forms");
    } catch (error) {
      console.error("Error saving form:", error);
      alert("Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>;
  }

  if (!form) {
    return <div className="container mx-auto p-8">Form not found</div>;
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/forms">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{form.name}</h1>
            <p className="text-muted-foreground">Build your form by adding and configuring fields</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeVersion && (
            <Badge variant="outline">
              Current: v{activeVersion.version_number}
            </Badge>
          )}
          <Button onClick={() => setShowSaveDialog(true)} disabled={fields.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            Save Version
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr,300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
              <CardDescription>Drag to reorder, click to edit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fields yet. Add your first field to get started.
                </div>
              ) : (
                fields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(index)}
                    className="cursor-move"
                  >
                    <FieldEditor
                      field={field}
                      index={index}
                      onUpdate={(updates) => updateField(index, updates)}
                      onRemove={() => removeField(index)}
                      onMoveUp={() => moveField(index, "up")}
                      onMoveDown={() => moveField(index, "down")}
                      isFirst={index === 0}
                      isLast={index === fields.length - 1}
                    />
                  </div>
                ))
              )}
              <Button onClick={addField} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Field
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your form will look</CardDescription>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add fields to see preview</p>
              ) : (
                (() => {
                  // Group fields by layout rows (same logic as public form)
                  const rows: FormField[][] = [];
                  let currentRow: FormField[] = [];
                  let currentRowWidth = 0;

                  fields.forEach((field) => {
                    const layout = field.layout || 'full';
                    const width = layout === 'half' ? 0.5 : layout === 'third' ? 1/3 : layout === 'two-thirds' ? 2/3 : 1;

                    if (currentRowWidth + width > 1 && currentRow.length > 0) {
                      rows.push(currentRow);
                      currentRow = [];
                      currentRowWidth = 0;
                    }

                    currentRow.push(field);
                    currentRowWidth += width;

                    if (currentRowWidth >= 1 || layout === 'full') {
                      rows.push(currentRow);
                      currentRow = [];
                      currentRowWidth = 0;
                    }
                  });

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

                  return (
                    <div className="space-y-4">
                      {rows.map((row, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          {row.map((field) => {
                            const layout = field.layout || 'full';
                            const imageUrl = field.image ? getDirectusImageUrl(field.image) : null;
                            return (
                              <div key={field.id} className={`space-y-2 ${getColSpanClass(layout)}`}>
                                <Label>
                                  {field.label || "Untitled Field"}
                                  {field.required && <span className="text-destructive ml-1">*</span>}
                                </Label>
                                {field.description && (
                                  <p className="text-sm text-muted-foreground">{field.description}</p>
                                )}
                                {imageUrl && (
                                  <div className="relative w-full h-32 bg-muted rounded-md overflow-hidden border">
                                    <NextImage
                                      src={imageUrl}
                                      alt={field.label || "Field image"}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                )}
                                <FormFieldPreview field={field} />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SaveVersionDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSave}
        saving={saving}
        currentVersion={versions.length > 0 ? versions[0].version_number : 0}
      />
    </div>
  );
}

function FieldEditor({
  field,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: FormField;
  index: number;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [optionsText, setOptionsText] = useState((field.options ?? []).join("\n"));
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Sync optionsText when field.options changes externally
  useEffect(() => {
    setOptionsText((field.options ?? []).join("\n"));
  }, [field.options]);

  // Load image preview when field.image changes
  useEffect(() => {
    if (field.image) {
      const imageUrl = getDirectusImageUrl(field.image);
      setImagePreview(imageUrl || null);
    } else {
      setImagePreview(null);
    }
  }, [field.image]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    try {
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
      onUpdate({ image: result.id });
    } catch (error) {
      console.error('Image upload error:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      e.target.value = "";
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    onUpdate({ image: undefined });
    setImagePreview(null);
  };

  return (
    <Card className={expanded ? "border-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveUp}
                disabled={isFirst}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveDown}
                disabled={isLast}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {React.createElement(getFieldIcon(field.type), { className: "h-5 w-5 text-muted-foreground" })}
                <div>
                  <p className="font-medium">{field.label || "Untitled Field"}</p>
                  <p className="text-sm text-muted-foreground">
                    {field.type} {field.required && "• Required"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                {React.createElement(getFieldIcon(field.type), { className: "h-3 w-3" })}
                {field.type}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`field-${index}-label`}>Label</Label>
                <Input
                  id={`field-${index}-label`}
                  value={field.label}
                  onChange={(e) => onUpdate({ label: e.target.value })}
                  placeholder="Field Label"
                />
                {field.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Field ID: <code className="bg-muted px-1 py-0.5 rounded">{field.name}</code>
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`field-${index}-type`}>Field Type</Label>
                <Select value={field.type} onValueChange={(value) => onUpdate({ type: value as FieldType })}>
                  <SelectTrigger id={`field-${index}-type`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`field-${index}-placeholder`}>Placeholder</Label>
              <Input
                id={`field-${index}-placeholder`}
                value={field.placeholder ?? ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Placeholder text..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`field-${index}-layout`}>Field Width</Label>
              <Select 
                value={field.layout || 'full'} 
                onValueChange={(value) => onUpdate({ layout: value as 'full' | 'half' | 'third' | 'two-thirds' })}
              >
                <SelectTrigger id={`field-${index}-layout`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Width</SelectItem>
                  <SelectItem value="half">Half Width (2 columns)</SelectItem>
                  <SelectItem value="third">Third Width (3 columns)</SelectItem>
                  <SelectItem value="two-thirds">Two Thirds Width</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Controls how wide the field appears. Half-width fields can appear side-by-side.
              </p>
            </div>

            {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
              <div className="space-y-1">
                <Label htmlFor={`field-${index}-options`}>Options (one per line)</Label>
                <Textarea
                  id={`field-${index}-options`}
                  value={optionsText}
                  onChange={(e) => {
                    // Update local state immediately so Enter works
                    setOptionsText(e.target.value);
                  }}
                  onBlur={() => {
                    // Process options when user leaves the field
                    const options = optionsText
                      .split("\n")
                      .map(opt => opt.trim())
                      .filter(Boolean);
                    onUpdate({ options });
                  }}
                  placeholder="Enter each option on a new line"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Press Enter after each option to add it on a new line
                </p>
              </div>
            )}

            {field.type === "textarea" && (
              <div className="space-y-1">
                <Label htmlFor={`field-${index}-wordLimit`}>Word Limit</Label>
                <Input
                  id={`field-${index}-wordLimit`}
                  type="number"
                  value={field.validation?.wordLimit ?? ""}
                  onChange={(e) => {
                    const wordLimit = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    onUpdate({
                      validation: {
                        ...field.validation,
                        wordLimit: wordLimit && wordLimit > 0 ? wordLimit : undefined,
                      },
                    });
                  }}
                  placeholder="No limit"
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Set a maximum number of words allowed in this textarea field. Leave empty for no limit.
                </p>
              </div>
            )}

            {field.type === "file" && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${index}-multiple`}
                    checked={field.multiple ?? false}
                    onCheckedChange={(checked) => onUpdate({ multiple: checked as boolean })}
                  />
                  <Label htmlFor={`field-${index}-multiple`} className="font-normal">
                    Allow multiple file uploads
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`field-${index}-maxFileSize`}>Max File Size (MB)</Label>
                  <Input
                    id={`field-${index}-maxFileSize`}
                    type="number"
                    value={field.validation?.maxFileSize ? Math.round(field.validation.maxFileSize / (1024 * 1024)) : 50}
                    onChange={(e) => {
                      const mb = parseInt(e.target.value, 10) || 50;
                      const bytes = mb * 1024 * 1024;
                      onUpdate({
                        validation: {
                          ...field.validation,
                          maxFileSize: bytes,
                        },
                      });
                    }}
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum file size in megabytes (default: 50MB)
                  </p>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor={`field-${index}-description`}>Description</Label>
              <Textarea
                id={`field-${index}-description`}
                value={field.description ?? ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Optional description to show with this field (useful for material-related forms)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Add a description to help users understand what this field is for
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`field-${index}-image`}>Field Image</Label>
              {imagePreview ? (
                <div className="relative border rounded-md p-2">
                  <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
                    <NextImage
                      src={imagePreview}
                      alt="Field preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="mt-2 w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    id={`field-${index}-image`}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload an image to show what this field represents (especially useful for material-related forms)
                  </p>
                  {uploadingImage && (
                    <p className="text-xs text-muted-foreground">Uploading...</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id={`field-${index}-required`}
                checked={field.required ?? false}
                onCheckedChange={(checked) => onUpdate({ required: checked as boolean })}
              />
              <Label htmlFor={`field-${index}-required`} className="font-normal">
                Required field
              </Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FormFieldPreview({ field }: { field: FormField }) {
  const FieldIcon = getFieldIcon(field.type);
  
  switch (field.type) {
    case "textarea":
      const wordLimit = field.validation?.wordLimit;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Text Area</span>
            {wordLimit && (
              <span className="text-xs">(Max {wordLimit} words)</span>
            )}
          </div>
          <Textarea placeholder={field.placeholder} disabled />
          {wordLimit && (
            <p className="text-xs text-muted-foreground">
              Word limit: {wordLimit} words
            </p>
          )}
        </div>
      );
    case "select":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Select Dropdown</span>
          </div>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
          </Select>
        </div>
      );
    case "checkbox":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Checkbox Group</span>
          </div>
          <div className="space-y-2">
            {(field.options ?? ["Option 1"]).map((opt, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Checkbox disabled />
                <Label>{opt}</Label>
              </div>
            ))}
          </div>
        </div>
      );
    case "radio":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Radio Buttons</span>
          </div>
          <RadioGroup value="" disabled>
            {(field.options ?? ["Option 1"]).map((opt, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`preview-${i}`} />
                <Label htmlFor={`preview-${i}`}>{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    case "file":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>File Upload</span>
          </div>
          <Input type="file" disabled />
        </div>
      );
    case "date":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Date Picker</span>
          </div>
          <Input type="date" disabled />
        </div>
      );
    case "date-range":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Date Range Picker</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" disabled placeholder="Start" />
            <Input type="date" disabled placeholder="End" />
          </div>
        </div>
      );
    case "time":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Time Picker</span>
          </div>
          <Input type="time" disabled />
        </div>
      );
    case "email":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Email Input</span>
          </div>
          <Input type="email" placeholder={field.placeholder} disabled />
        </div>
      );
    case "number":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Number Input</span>
          </div>
          <Input type="number" placeholder={field.placeholder} disabled />
        </div>
      );
    case "linkedin":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>LinkedIn Profile URL</span>
          </div>
          <Input type="url" placeholder="https://linkedin.com/in/username" disabled />
        </div>
      );
    case "text":
    default:
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FieldIcon className="h-4 w-4" />
            <span>Text Input</span>
          </div>
          <Input type="text" placeholder={field.placeholder} disabled />
        </div>
      );
  }
}

function SaveVersionDialog({
  open,
  onOpenChange,
  onSave,
  saving,
  currentVersion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (isActive: boolean) => void;
  saving: boolean;
  currentVersion: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save New Version</DialogTitle>
          <DialogDescription>
            This will create version {currentVersion + 1} of your form.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Do you want to make this the active version? The active version is what users will see when
            they fill out the form.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => onSave(false)} disabled={saving}>
            Save as Draft
          </Button>
          <Button onClick={() => onSave(true)} disabled={saving}>
            {saving ? "Saving..." : "Save & Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import type { Form, FormVersion, FormField, FormSchema } from "@/lib/schema";
import Link from "next/link";

type FieldType = "text" | "textarea" | "email" | "number" | "select" | "checkbox" | "radio" | "file" | "date";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio Buttons" },
  { value: "file", label: "File Upload" },
  { value: "date", label: "Date" },
];

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
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
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
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={index}
                    onUpdate={(updates) => updateField(index, updates)}
                    onRemove={() => removeField(index)}
                    onMoveUp={() => moveField(index, "up")}
                    onMoveDown={() => moveField(index, "down")}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                  />
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
            <CardContent className="space-y-4">
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.label || "Untitled Field"}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <FormFieldPreview field={field} />
                </div>
              ))}
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">Add fields to see preview</p>
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

  return (
    <Card className={expanded ? "border-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              disabled={isFirst}
              className="h-6 w-6 p-0"
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              disabled={isLast}
              className="h-6 w-6 p-0"
            >
              ↓
            </Button>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{field.label || "Untitled Field"}</p>
                <p className="text-sm text-muted-foreground">
                  {field.type} {field.required && "• Required"}
                </p>
              </div>
              <Badge variant="outline">{field.type}</Badge>
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
                <Label htmlFor={`field-${index}-name`}>Field Name (ID)</Label>
                <Input
                  id={`field-${index}-name`}
                  value={field.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="field_name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`field-${index}-type`}>Field Type</Label>
                <Select value={field.type} onValueChange={(value) => onUpdate({ type: value as FieldType })}>
                  <SelectTrigger id={`field-${index}-type`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`field-${index}-label`}>Label</Label>
              <Input
                id={`field-${index}-label`}
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Field Label"
              />
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

            {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
              <div className="space-y-1">
                <Label htmlFor={`field-${index}-options`}>Options (one per line)</Label>
                <Textarea
                  id={`field-${index}-options`}
                  value={(field.options ?? []).join("\n")}
                  onChange={(e) => onUpdate({ options: e.target.value.split("\n").filter(Boolean) })}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                />
              </div>
            )}

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
  switch (field.type) {
    case "textarea":
      return <Textarea placeholder={field.placeholder} disabled />;
    case "select":
      return (
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
        </Select>
      );
    case "checkbox":
      return (
        <div className="space-y-2">
          {(field.options ?? ["Option 1"]).map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Checkbox disabled />
              <Label>{opt}</Label>
            </div>
          ))}
        </div>
      );
    case "radio":
      return (
        <div className="space-y-2">
          {(field.options ?? ["Option 1"]).map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <input type="radio" disabled />
              <Label>{opt}</Label>
            </div>
          ))}
        </div>
      );
    default:
      return <Input type={field.type} placeholder={field.placeholder} disabled />;
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


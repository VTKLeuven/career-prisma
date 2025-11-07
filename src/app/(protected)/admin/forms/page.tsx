"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  fetchFormsAction,
  createFormAction,
  updateFormAction,
  deleteFormAction,
  setActiveVersionAction,
  fetchFormVersionsAction,
  debugFormsQueryAction,
} from "@/app/actions/forms";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Plus, Trash2, Edit, FileText, Clock } from "lucide-react";
import { useUser } from "@/providers/UserProvider";
import type { FormSchema } from "@/lib/schema";

type FormRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
  activeVersion: {
    version_number: number;
  } | null;
  versionCount: number;
};

export default function AdminFormsPage() {
  const { user } = useUser();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadForms = async () => {
    console.log('[AdminFormsPage] Loading forms...');
    setLoading(true);
    try {
      const data = await fetchFormsAction();
      console.log('[AdminFormsPage] Loaded', data.length, 'forms');
      console.log('[AdminFormsPage] Raw forms data:', JSON.stringify(data, null, 2));

      // Log each form's details explicitly
      data.forEach((form, idx) => {
        console.log(`[AdminFormsPage] Form ${idx + 1}:`, {
          name: form.name,
          slug: form.slug,
          activeVersion: form.activeVersion,
          versionCount: form.versionCount,
          hasActiveVersion: !!form.activeVersion,
          rawForm: form,
        });
      });

      setForms(data);
    } catch (error) {
      console.error("[AdminFormsPage] Error loading forms:", error);
    } finally {
      setLoading(false);
    }
  };

  const runDebugQuery = async () => {
    console.log('[AdminFormsPage] Running debug query...');
    try {
      const result = await debugFormsQueryAction();
      console.log('[AdminFormsPage] Debug result:', result);
      alert(`Debug complete! Check console and terminal for detailed logs.

Query 1 fields: ${result.query1Keys.join(', ')}
Query 2 fields: ${result.query2Keys.join(', ')}
Query 3 fields: ${result.query3Keys.join(', ')}

Has versions in Query 2: ${result.hasVersionsInQuery2}
Has versions in Query 3: ${result.hasVersionsInQuery3}`);
    } catch (error) {
      console.error('[AdminFormsPage] Debug error:', error);
      alert('Debug failed - check console');
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  if (!user?.admin) {
    return <div className="p-8">Access Denied</div>;
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Forms Management</h1>
          <p className="text-muted-foreground">Create and manage forms for external users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runDebugQuery}>
            🐛 Debug Directus
          </Button>
          <Button variant="outline" onClick={loadForms} disabled={loading}>
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </Button>
          <CreateFormDialog onFormCreated={loadForms} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Forms</CardTitle>
          <CardDescription>
            Manage your forms, versions, and view responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : forms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No forms yet. Create your first form to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Versions</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{form.slug}</code>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{form.description}</TableCell>
                    <TableCell>
                      {form.activeVersion ? (
                        <Badge variant="default">Active (v{form.activeVersion.version_number})</Badge>
                      ) : (
                        <Badge variant="secondary">No Active Version</Badge>
                      )}
                    </TableCell>
                    <TableCell>{form.versionCount}</TableCell>
                    <TableCell>{new Date(form.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <FormActionsMenu form={form} onUpdate={loadForms} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateFormDialog({ onFormCreated }: { onFormCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create initial empty schema
      const initialSchema: FormSchema = {
        fields: [],
      };

      await createFormAction({
        name,
        slug,
        description,
        initialSchema,
      });

      setOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      onFormCreated();
    } catch (error) {
      console.error("Error creating form:", error);
      alert("Failed to create form");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-")) {
      setSlug(value.toLowerCase().replace(/\s+/g, "-"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Form</DialogTitle>
          <DialogDescription>
            Create a new form that external users can fill out.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Form Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Company Registration"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., company-registration"
              required
            />
            <p className="text-xs text-muted-foreground">
              Will be accessible at: /form/{slug}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this form..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Form"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormActionsMenu({ form, onUpdate }: { form: FormRow; onUpdate: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/admin/forms/${form.id}/builder`}>
              <FileText className="mr-2 h-4 w-4" />
              Form Builder
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setVersionsOpen(true)}>
            <Clock className="mr-2 h-4 w-4" />
            Manage Versions
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/forms/${form.slug}`} target="_blank" rel="noopener noreferrer">
              Test Form (Public View)
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/admin/forms/${form.id}/responses`}>
              View Responses
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditFormDialog
        form={form}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={onUpdate}
      />
      <VersionsDialog
        form={form}
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        onUpdate={onUpdate}
      />
      <DeleteFormDialog
        form={form}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onUpdate}
      />
    </>
  );
}

function EditFormDialog({
  form,
  open,
  onOpenChange,
  onUpdate,
}: {
  form: FormRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}) {
  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [description, setDescription] = useState(form.description);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(form.name);
      setSlug(form.slug);
      setDescription(form.description);
    }
  }, [open, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateFormAction(form.id, { name, slug, description });
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating form:", error);
      alert("Failed to update form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Form</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Form Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-slug">Slug</Label>
            <Input
              id="edit-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFormDialog({
  form,
  open,
  onOpenChange,
  onDeleted,
}: {
  form: FormRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteFormAction(form.id);
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Failed to delete form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Form</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{form.name}&quot;? This action cannot be undone.
            All versions and responses will also be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionsDialog({
  form,
  open,
  onOpenChange,
  onUpdate,
}: {
  form: FormRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}) {
  const [versions, setVersions] = useState<Array<{
    id: string;
    version_number: number;
    is_active: boolean;
    created_at: string;
    schema: { fields: Array<unknown> };
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const loadVersions = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFormVersionsAction(form.id);
      setVersions(data);
    } catch (error) {
      console.error("Error loading versions:", error);
    } finally {
      setLoading(false);
    }
  }, [form.id]);

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, loadVersions]);

  const handleActivate = async (versionId: string) => {
    setActivating(versionId);
    try {
      console.log('[VersionsDialog] Activating version:', versionId);
      await setActiveVersionAction(versionId);
      console.log('[VersionsDialog] Activation complete, reloading versions...');
      await loadVersions();
      console.log('[VersionsDialog] Versions reloaded, calling onUpdate...');
      onUpdate();
      console.log('[VersionsDialog] Update complete');

      // Show success message
      alert('Version activated successfully! The form list will refresh.');
    } catch (error) {
      console.error("[VersionsDialog] Error activating version:", error);
      alert(`Failed to activate version: ${error}`);
    } finally {
      setActivating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Versions - {form.name}</DialogTitle>
          <DialogDescription>
            View and activate different versions of your form
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No versions yet. Create your first version in the form builder.
            </div>
          ) : (
            versions.map((version) => (
              <Card key={version.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Version {version.version_number}</h4>
                        {version.is_active && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {version.schema.fields.length} field(s) • Created{" "}
                        {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!version.is_active && (
                      <Button
                        size="sm"
                        onClick={() => handleActivate(version.id)}
                        disabled={activating === version.id}
                      >
                        {activating === version.id ? "Activating..." : "Activate"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


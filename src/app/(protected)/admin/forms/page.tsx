"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const EditorContent = dynamic(
  () => import("@tiptap/react").then((mod) => mod.EditorContent),
  { ssr: false }
);
import {
  fetchFormsAction,
  createFormAction,
  updateFormAction,
  deleteFormAction,
  setActiveVersionAction,
  fetchFormVersionsAction,
  updateFormVersionAction,
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
import { MoreHorizontal, Plus, Trash2, Edit, FileText, Clock, Copy, Check, Power, ChevronUp, ChevronDown } from "lucide-react";
import { useUser } from "@/providers/UserProvider";
import type { FormSchema, FormField, Form, CareerEvent } from "@/lib/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateBE, formatDateTimeBE, utcToLocalDateTimeLocal, localDateTimeLocalToUtc } from "@/lib/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchEventsAction } from "@/app/actions/events";

type FormRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active?: boolean;
  metadata?: {
    deadline?: string;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
  activeVersion: {
    id: string;
    version_number: number;
  } | null;
  versionCount: number;
  submissionCount: number;
};

export default function AdminFormsPage() {
  const { user } = useUser();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadForms = async () => {
    setLoading(true);
    try {
      const data = await fetchFormsAction();
      console.log('[AdminFormsPage] Loaded forms:', data.map(f => ({ 
        id: f.id, 
        name: f.name, 
        metadata: f.metadata,
        deadline: f.metadata?.deadline 
      })));
      setForms(data);
    } catch (error) {
      console.error("[AdminFormsPage] Error loading forms:", error);
    } finally {
      setLoading(false);
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
          <Button variant="outline" onClick={loadForms} disabled={loading} size="default">
            {loading ? "Refreshing..." : "Refresh"}
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
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.name}</TableCell>
                    <TableCell>
                      <SlugCell slug={form.slug} />
                    </TableCell>
                    <TableCell>
                      {form.is_active === false ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : form.activeVersion ? (
                        <Badge variant="default">Active (v{form.activeVersion.version_number})</Badge>
                      ) : (
                        <Badge variant="secondary">No Active Version</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {form.metadata?.deadline ? (
                        <span className={new Date(form.metadata.deadline) < new Date() ? 'text-destructive' : ''}>
                          {formatDateTimeBE(form.metadata.deadline)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No deadline</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {form.metadata?.max_entries
                        ? `${form.submissionCount}/${form.metadata.max_entries}`
                        : form.submissionCount}
                    </TableCell>
                    <TableCell>{formatDateBE(form.updated_at)}</TableCell>
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
  const [deadline, setDeadline] = useState("");
  const [maxEntries, setMaxEntries] = useState<string>("");
  const [isEventRegistration, setIsEventRegistration] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventEmailSubject, setEventEmailSubject] = useState("Event Registration Confirmation");
  const [eventEmailContent, setEventEmailContent] = useState("Thank you for registering! We look forward to seeing you at the event.");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [loading, setLoading] = useState(false);

  // TipTap editor for email content - only create when dialog is open and on client
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const emailEditor = useEditor({
    extensions: [StarterKit],
    content: eventEmailContent,
    onUpdate({ editor }) {
      setEventEmailContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "border rounded-md p-3 bg-background text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring [&>p:last-child]:mb-0 [&>ul:last-child]:mb-0 [&>ol:last-child]:mb-0",
      },
    },
    immediatelyRender: false,
    editable: open && isClient, // Only editable when dialog is open and on client
  });

  // Update editor content when dialog opens
  useEffect(() => {
    if (open && isClient && emailEditor && isEventRegistration) {
      emailEditor.commands.setContent(eventEmailContent);
      emailEditor.setEditable(true);
    } else if (!open && emailEditor) {
      emailEditor.setEditable(false);
    }
  }, [open, isClient, emailEditor, isEventRegistration, eventEmailContent]);

  // Update email subject when form name changes and event registration is enabled
  useEffect(() => {
    if (isEventRegistration && name.trim()) {
      // Capitalize first letter of form name
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      // Only update if subject is still the default or empty
      if (!eventEmailSubject || eventEmailSubject === "Event Registration Confirmation") {
        setEventEmailSubject(`${capitalizedName} - Registration Confirmation`);
      }
    }
  }, [name, isEventRegistration]);

  // Load events when dialog opens and event registration is enabled
  useEffect(() => {
    if (open && isEventRegistration && events.length === 0 && !eventsLoading) {
      setEventsLoading(true);
      fetchEventsAction()
        .then((loadedEvents) => {
          setEvents(loadedEvents || []);
        })
        .catch((err) => {
          console.error("Error loading events:", err);
        })
        .finally(() => {
          setEventsLoading(false);
        });
    }
  }, [open, isEventRegistration, events.length, eventsLoading]);

  const formDomain = process.env.NEXT_PUBLIC_FORM_DOMAIN || "http://localhost:3000";
  const formUrl = `${formDomain}/forms/${slug || "your-slug"}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create initial schema - if event registration, add firstname, lastname, email fields
      let initialFields: FormField[] = [];
      
      if (isEventRegistration) {
        initialFields = [
          {
            id: `field_${Date.now()}_1`,
            name: "firstname",
            label: "First Name",
            type: "text",
            required: true,
            placeholder: "Enter your first name",
            layout: "half",
          },
          {
            id: `field_${Date.now()}_2`,
            name: "lastname",
            label: "Last Name",
            type: "text",
            required: true,
            placeholder: "Enter your last name",
            layout: "half",
          },
          {
            id: `field_${Date.now()}_3`,
            name: "email",
            label: "Email",
            type: "email",
            required: true,
            placeholder: "Enter your email address",
            layout: "full",
          },
        ];
      }

      const initialSchema: FormSchema = {
        fields: initialFields,
      };

      const metadata: { [key: string]: unknown } = {};
      
      if (isEventRegistration) {
        metadata.is_event_registration = true;
        if (selectedEventId && selectedEventId !== "none") {
          metadata.event_id = selectedEventId;
        }
        metadata.event_email_subject = eventEmailSubject || 'Event Registration Confirmation';
        metadata.event_email_content = eventEmailContent || 'Thank you for registering!';
        if (eventDate) {
          metadata.event_date = localDateTimeLocalToUtc(eventDate);
        }
        if (eventEndDate) {
          metadata.event_end_date = localDateTimeLocalToUtc(eventEndDate);
        }
        if (eventLocation) {
          metadata.event_location = eventLocation;
        }
      }
      
      if (maxEntries && maxEntries.trim() !== "") {
        const maxEntriesNum = parseInt(maxEntries, 10);
        if (!isNaN(maxEntriesNum) && maxEntriesNum > 0) {
          metadata.max_entries = maxEntriesNum;
        }
      }

      if (deadline) {
        // Convert datetime-local value to UTC ISO string
        metadata.deadline = localDateTimeLocalToUtc(deadline);
      }

      await createFormAction({
        name,
        slug,
        description,
        initialSchema,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      setOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      setDeadline("");
      setMaxEntries("");
      setIsEventRegistration(false);
      setSelectedEventId("");
      setEventEmailSubject("Event Registration Confirmation");
      setEventEmailContent("Thank you for registering! We look forward to seeing you at the event.");
      setEventDate("");
      setEventEndDate("");
      setEventLocation("");
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
        <Button size="default">
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Create New Form</DialogTitle>
          <DialogDescription>
            Create a new form that external users can fill out.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-2">
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
                Will be accessible at: <code className="bg-muted px-1 py-0.5 rounded">{formUrl}</code>
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
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Set a deadline (date and time) for form submissions. After this time, users cannot submit the form. Date format: dd/mm/yyyy. Time format: 24-hour (e.g., 23:59).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-entries">Maximum Number of Entries (Optional)</Label>
            <Input
              id="max-entries"
              type="number"
              value={maxEntries}
              onChange={(e) => setMaxEntries(e.target.value)}
              placeholder="e.g., 100"
              min="1"
            />
              <p className="text-xs text-muted-foreground">
                Set a maximum number of submissions allowed. Once this limit is reached, the form will be closed to new submissions.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="event-registration"
                checked={isEventRegistration}
                onCheckedChange={(checked: boolean) => setIsEventRegistration(checked)}
              />
              <Label htmlFor="event-registration" className="font-normal cursor-pointer">
                Use as event registration (sends confirmation emails)
            </Label>
          </div>

          {isEventRegistration && (
            <div className="space-y-4 p-4 bg-muted rounded-md border-t">
              <h3 className="font-semibold text-sm">Event Registration Settings</h3>
                <div className="space-y-2">
                  <Label htmlFor="event-select">Link to Event (Optional)</Label>
                  <Select
                    value={selectedEventId || "none"}
                    onValueChange={(value) => setSelectedEventId(value === "none" ? "" : value)}
                    disabled={eventsLoading}
                  >
                    <SelectTrigger id="event-select" className="w-full">
                      <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (no event linked)</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this registration form to an event so attending companies can see scans for this specific event.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-email-subject">Email Subject</Label>
                  <Input
                    id="event-email-subject"
                    value={eventEmailSubject}
                  onChange={(e) => setEventEmailSubject(e.target.value)}
                  placeholder="Event Registration Confirmation"
                />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-email-content">Email Content</Label>
                  {open && isClient && emailEditor && isEventRegistration ? (
                  <div className="[&_.ProseMirror]:mb-0 [&_.ProseMirror]:pb-0">
                    <EditorContent editor={emailEditor} />
                  </div>
                ) : (
                  <Textarea
                    id="event-email-content"
                    value={eventEmailContent}
                    onChange={(e) => {
                      setEventEmailContent(e.target.value);
                      // Also update editor if it exists
                      if (emailEditor && isClient) {
                        emailEditor.commands.setContent(e.target.value);
                      }
                    }}
                    placeholder="Thank you for registering! We look forward to seeing you at the event."
                    rows={6}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    This content will be sent in the confirmation email. Use {`{firstname}`} and {`{lastname}`} to personalize. You can format text with bold, italic, lists, etc.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-date">Event Start Date & Time</Label>
                <Input
                  id="event-date"
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used for the calendar button in confirmation emails.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end-date">Event End Date & Time</Label>
                <Input
                  id="event-end-date"
                  type="datetime-local"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used for the calendar button in confirmation emails. If not set, defaults to 1 hour after start time.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-location">Event Location (Optional)</Label>
                <Input
                  id="event-location"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g., Main Conference Hall, Brussels"
                />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
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
          <ToggleFormStatusMenuItem form={form} onUpdate={onUpdate} />
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
  const [deadline, setDeadline] = useState(
    form.metadata?.deadline ? utcToLocalDateTimeLocal(form.metadata.deadline as string) : ''
  );
  const [deadlineDateDisplay, setDeadlineDateDisplay] = useState("");
  const [deadlineTimeDisplay, setDeadlineTimeDisplay] = useState("");
  const [maxEntries, setMaxEntries] = useState(
    form.metadata?.max_entries ? String(form.metadata.max_entries) : ''
  );
  const [eventEmailSubject, setEventEmailSubject] = useState(
    (form.metadata?.event_email_subject as string) || ''
  );
  const [eventEmailContent, setEventEmailContent] = useState(
    (form.metadata?.event_email_content as string) || ''
  );
  const [eventDate, setEventDate] = useState(
    form.metadata?.event_date ? utcToLocalDateTimeLocal(form.metadata.event_date as string) : ''
  );
  const [eventEndDate, setEventEndDate] = useState(
    form.metadata?.event_end_date ? utcToLocalDateTimeLocal(form.metadata.event_end_date as string) : ''
  );
  const [eventLocation, setEventLocation] = useState(
    (form.metadata?.event_location as string) || ''
  );
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEventRegistration, setIsEventRegistration] = useState(
    form.metadata?.is_event_registration === true
  );

  // TipTap editor for email content - only create when dialog is open and on client
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load events when dialog opens and event registration is enabled
  useEffect(() => {
    if (open && isEventRegistration && events.length === 0 && !eventsLoading) {
      setEventsLoading(true);
      fetchEventsAction()
        .then((loadedEvents) => {
          setEvents(loadedEvents || []);
        })
        .catch((err) => {
          console.error("Error loading events:", err);
        })
        .finally(() => {
          setEventsLoading(false);
        });
    }
  }, [open, isEventRegistration, events.length, eventsLoading]);

  const emailEditor = useEditor({
    extensions: [StarterKit],
    content: eventEmailContent,
    onUpdate({ editor }) {
      setEventEmailContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "border rounded-md p-3 bg-background text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring [&>p:last-child]:mb-0 [&>ul:last-child]:mb-0 [&>ol:last-child]:mb-0",
      },
    },
    immediatelyRender: false,
    editable: open && isClient, // Only editable when dialog is open and on client
  });

  // Update editor content when form changes or dialog opens
  useEffect(() => {
    if (open && isClient && emailEditor && isEventRegistration) {
      const content = (form.metadata?.event_email_content as string) || '';
      emailEditor.commands.setContent(content);
      setEventEmailContent(content);
      emailEditor.setEditable(true);
    } else if (!open && emailEditor) {
      emailEditor.setEditable(false);
    }
  }, [open, isClient, form, emailEditor, isEventRegistration]);

  useEffect(() => {
    if (open) {
      setName(form.name);
      setSlug(form.slug);
      setDescription(form.description);
      setDeadline(form.metadata?.deadline ? utcToLocalDateTimeLocal(form.metadata.deadline as string) : '');
      setMaxEntries(form.metadata?.max_entries ? String(form.metadata.max_entries) : '');
      setIsEventRegistration(form.metadata?.is_event_registration === true);
      setSelectedEventId((form.metadata?.event_id as string) || '');
      setEventEmailSubject((form.metadata?.event_email_subject as string) || '');
      setEventEmailContent((form.metadata?.event_email_content as string) || '');
      setEventDate(form.metadata?.event_date ? utcToLocalDateTimeLocal(form.metadata.event_date as string) : '');
      setEventEndDate(form.metadata?.event_end_date ? utcToLocalDateTimeLocal(form.metadata.event_end_date as string) : '');
      setEventLocation((form.metadata?.event_location as string) || '');
    }
  }, [open, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update form basic info
      await updateFormAction(form.id, { 
        name, 
        slug, 
        description,
      });
      
      // Update metadata on the active form version if it exists
      if (form.activeVersion?.id) {
        // Build metadata object preserving all existing fields
        let metadata: { [key: string]: unknown } | undefined = form.metadata ? { ...form.metadata } : undefined;
        
        if (deadline) {
          // Convert datetime-local value to UTC ISO string
          metadata = { ...metadata, deadline: localDateTimeLocalToUtc(deadline) };
        } else if (metadata?.deadline) {
          delete metadata.deadline;
        }
        
        if (maxEntries && maxEntries.trim() !== "") {
          const maxEntriesNum = parseInt(maxEntries, 10);
          if (!isNaN(maxEntriesNum) && maxEntriesNum > 0) {
            metadata = { ...metadata, max_entries: maxEntriesNum };
          } else if (metadata?.max_entries) {
            delete metadata.max_entries;
          }
        } else if (metadata?.max_entries) {
          delete metadata.max_entries;
        }

        // Update event registration fields if this is an event registration form
        if (isEventRegistration) {
          metadata = {
            ...metadata,
            is_event_registration: true,
            ...(selectedEventId && selectedEventId !== "none" ? { event_id: selectedEventId } : {}),
            event_email_subject: eventEmailSubject || 'Event Registration Confirmation',
            event_email_content: eventEmailContent || 'Thank you for registering!',
            ...(eventDate ? { event_date: localDateTimeLocalToUtc(eventDate) } : {}),
            ...(eventEndDate ? { event_end_date: localDateTimeLocalToUtc(eventEndDate) } : {}),
            ...(eventLocation ? { event_location: eventLocation } : {}),
          };
          // Remove event_id if it was cleared
          if ((!selectedEventId || selectedEventId === "none") && metadata.event_id) {
            delete metadata.event_id;
          }
        } else {
          // If unchecked, remove event registration flag but keep other metadata
          if (metadata) {
            const { is_event_registration, ...restMetadata } = metadata;
            metadata = Object.keys(restMetadata).length > 0 ? restMetadata : undefined;
          }
        }
        
        // Clean up empty metadata
        if (metadata && Object.keys(metadata).length === 0) {
          metadata = undefined;
        }
        
        // Update the active version's metadata
        await updateFormVersionAction(form.activeVersion.id, { metadata });
      }
      
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating form:", error);
      alert("Failed to update form");
    } finally {
      setLoading(false);
    }
  };

  const formDomain = process.env.NEXT_PUBLIC_FORM_DOMAIN || "http://localhost:3000";
  const formUrl = `${formDomain}/forms/${slug || "your-slug"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Edit Form</DialogTitle>
          <DialogDescription>
            Update form details and settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-2">
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
              <Label htmlFor="edit-slug">Slug (URL)</Label>
              <Input
                id="edit-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            <p className="text-xs text-muted-foreground">
              Will be accessible at: <code className="bg-muted px-1 py-0.5 rounded">{formUrl}</code>
            </p>
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
            <div className="space-y-2">
              <Label htmlFor="edit-deadline">Deadline (Optional)</Label>
              <Input
                id="edit-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Set a deadline (date and time) for form submissions. After this time, users cannot submit the form. Date format: dd/mm/yyyy. Time format: 24-hour (e.g., 23:59).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-max-entries">Maximum Number of Entries (Optional)</Label>
            <Input
              id="edit-max-entries"
              type="number"
              value={maxEntries}
              onChange={(e) => setMaxEntries(e.target.value)}
              placeholder="e.g., 100"
              min="1"
            />
            <p className="text-xs text-muted-foreground">
              Set a maximum number of submissions allowed. Once this limit is reached, the form will be closed to new submissions.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-event-registration"
                checked={isEventRegistration}
                onCheckedChange={(checked: boolean) => setIsEventRegistration(checked)}
              />
              <Label htmlFor="edit-event-registration" className="font-normal cursor-pointer">
                Use as event registration (sends confirmation emails)
              </Label>
            </div>

            {isEventRegistration && (
              <div className="space-y-4 p-4 bg-muted rounded-md border-t">
                <h3 className="font-semibold text-sm">Event Registration Settings</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-event-select">Link to Event (Optional)</Label>
                  <Select
                    value={selectedEventId || "none"}
                    onValueChange={(value) => setSelectedEventId(value === "none" ? "" : value)}
                    disabled={eventsLoading}
                  >
                    <SelectTrigger id="edit-event-select" className="w-full">
                      <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (no event linked)</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this registration form to an event so attending companies can see scans for this specific event.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-event-email-subject">Email Subject</Label>
                  <Input
                    id="edit-event-email-subject"
                    value={eventEmailSubject}
                    onChange={(e) => setEventEmailSubject(e.target.value)}
                    placeholder="Event Registration Confirmation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-event-email-content">Email Content</Label>
                  {open && isClient && emailEditor && isEventRegistration ? (
                    <div className="[&_.ProseMirror]:mb-0 [&_.ProseMirror]:pb-0">
                      <EditorContent editor={emailEditor} />
                    </div>
                  ) : (
                    <Textarea
                      id="edit-event-email-content"
                      value={eventEmailContent}
                      onChange={(e) => {
                        setEventEmailContent(e.target.value);
                        // Also update editor if it exists
                        if (emailEditor && isClient) {
                          emailEditor.commands.setContent(e.target.value);
                        }
                      }}
                      placeholder="Thank you for registering! We look forward to seeing you at the event."
                      rows={6}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    This content will be sent in the confirmation email. Use {`{firstname}`} and {`{lastname}`} to personalize. You can format text with bold, italic, lists, etc.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-event-date">Event Start Date & Time</Label>
                  <Input
                    id="edit-event-date"
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for the calendar button in confirmation emails.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-event-end-date">Event End Date & Time</Label>
                <Input
                  id="edit-event-end-date"
                  type="datetime-local"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used for the calendar button in confirmation emails. If not set, defaults to 1 hour after start time.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-event-location">Event Location (Optional)</Label>
                  <Input
                    id="edit-event-location"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g., Main Conference Hall, Brussels"
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
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

function ToggleFormStatusMenuItem({ form, onUpdate }: { form: FormRow; onUpdate: () => void }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setToggling(true);
    try {
      // If form is currently active (is_active is true or undefined), disable it
      // If form is disabled (is_active is false), enable it
      const newStatus = form.is_active === false ? true : false;
      await updateFormAction(form.id, { is_active: newStatus });
      onUpdate();
    } catch (error) {
      console.error("Error toggling form status:", error);
      alert(`Failed to update form status: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setToggling(false);
    }
  };

  const isActive = form.is_active !== false; // Default to true if undefined

  return (
    <DropdownMenuItem onClick={handleToggle} disabled={toggling}>
      <Power className={`mr-2 h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
      {isActive ? 'Disable Form' : 'Enable Form'}
    </DropdownMenuItem>
  );
}

function SlugCell({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const domain = process.env.NEXT_PUBLIC_FORM_DOMAIN || "http://localhost:3000";
  const formUrl = `${domain}/forms/${slug}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(formUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={formUrl}
              onClick={handleClick}
              className="text-sm bg-muted px-2 py-1 rounded hover:underline cursor-pointer"
              target="_blank"
              rel="noopener noreferrer"
            >
              {slug}
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to open form</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copied!" : "Copy URL"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
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
      await setActiveVersionAction(versionId);
      await loadVersions();
      onUpdate();
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Versions - {form.name}</DialogTitle>
          <DialogDescription>
            View and activate different versions of your form
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
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
                        {formatDateTimeBE(version.created_at)}
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


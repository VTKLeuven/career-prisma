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
  updateFormVersionAction,
} from "@/app/actions/forms";
import { Card, CardContent } from "@/components/ui/card";
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
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnConfig } from "@/components/admin/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Plus, Trash2, Edit, FileText, Clock, Copy, Check, Power, Building2, RefreshCw, Hammer, Inbox } from "lucide-react";
import { useUser } from "@/providers/UserProvider";
import type { FormSchema, FormField, CareerEvent } from "@/lib/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateBE, formatDateTimeBE, utcToLocalDateTimeLocal, localDateTimeLocalToUtc } from "@/lib/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchEventsAction, fetchOptionsForEventAction } from "@/app/actions/events";
import { slugifyEventName } from "@/lib/utils/slugify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { SimpleRichTextEditor } from "@/components/admin/SimpleRichTextEditor";
import { toast } from "sonner";

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
  created_at: string | null;
  updated_at: string | null;
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
  // The form whose details dialog is open; a row click opens it.
  const [editingId, setEditingId] = useState<string | null>(null);

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
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader
        title="Forms"
        description="Create and manage forms for students and companies"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/forms/company-completion">
                <Building2 className="h-4 w-4" />
                Company Completion
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={loadForms} disabled={loading} aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <CreateFormDialog />
          </>
        }
      />

      <DataTable
        rows={forms}
        columns={FORM_COLUMNS}
        getRowId={(form) => form.id}
        noun="form"
        search={{ keys: ["slug", "description"] }}
        loading={loading}
        containerClassName="roomy:max-h-[calc(100svh-17rem)]"
        emptyMessage="No forms yet. Create your first form to get started"
        onRowClick={(form) => setEditingId(form.id)}
        isRowSelected={(form) => editingId === form.id}
        rowActions={(form) => (
          <FormRowActions
            form={form}
            onUpdate={loadForms}
            editOpen={editingId === form.id}
            onEditOpenChange={(open) => setEditingId(open ? form.id : null)}
          />
        )}
      />
    </div>
  );
}

function formStatus(form: FormRow): "disabled" | "active" | "inactive" {
  if (form.is_active === false) return "disabled";
  return form.activeVersion ? "active" : "inactive";
}

function formMaxEntries(form: FormRow): number | null {
  return form.metadata?.max_entries ? Number(form.metadata.max_entries) : null;
}

/**
 * The forms list. Clicking anywhere on a row opens its details; the builder,
 * responses and the public form are one hover-click away on the right.
 */
const FORM_COLUMNS: ColumnConfig<FormRow>[] = [
  {
    key: "name",
    label: "Name",
    render: (form) => (
      <>
        <div className="truncate font-medium text-foreground" title={form.name}>{form.name}</div>
        {form.description ? (
          <div className="truncate text-xs font-normal text-muted-foreground" title={form.description}>{form.description}</div>
        ) : null}
      </>
    ),
  },
  {
    key: "slug",
    label: "Link",
    render: (form) => <SlugCell slug={form.slug} metadata={form.metadata} />,
  },
  {
    key: "status",
    label: "Status",
    value: formStatus,
    filter: {
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "No active version" },
        { value: "disabled", label: "Disabled" },
      ],
    },
    render: (form) =>
      form.is_active === false ? (
        <Badge variant="muted">
          <span className="size-1.5 rounded-full bg-[#a1a1aa]" /> Disabled
        </Badge>
      ) : form.activeVersion ? (
        <Badge variant="success">
          <span className="size-1.5 rounded-full bg-[#16a34a]" /> Active · v{form.activeVersion.version_number}
        </Badge>
      ) : (
        <Badge variant="warning">No active version</Badge>
      ),
  },
  {
    key: "deadline",
    label: "Deadline",
    value: (form) => (form.metadata?.deadline ? new Date(form.metadata.deadline) : null),
    render: (form) => {
      const deadline = form.metadata?.deadline;
      if (!deadline) return <span className="text-muted-foreground">—</span>;
      return (
        <span className={`tabular ${new Date(deadline) < new Date() ? "text-[#b91c1c]" : ""}`}>
          {formatDateTimeBE(deadline)}
        </span>
      );
    },
  },
  {
    key: "submissionCount",
    label: "Submissions",
    render: (form) => {
      const max = formMaxEntries(form);
      if (!max) return <span className="tabular">{form.submissionCount}</span>;
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#f0f0f2]">
            <div
              className={`h-full rounded-full ${form.submissionCount >= max ? "bg-[#d97706]" : "bg-[#1f82d1]"}`}
              style={{ width: `${Math.min(100, (form.submissionCount / max) * 100)}%` }}
            />
          </div>
          <span className="text-[13px] tabular">
            {form.submissionCount}
            <span className="text-muted-foreground">/{max}</span>
          </span>
        </div>
      );
    },
  },
  {
    key: "updated",
    label: "Updated",
    className: "text-muted-foreground tabular",
    value: (form) => {
      const at = form.updated_at ?? form.created_at;
      return at ? new Date(at) : null;
    },
    render: (form) => formatDateBE(form.updated_at ?? form.created_at) || "—",
  },
];

function FormRowActions({ form, onUpdate, editOpen, onEditOpenChange }: {
  form: FormRow;
  onUpdate: () => void;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" asChild>
              <Link href={`/admin/forms/${form.id}/builder`} aria-label="Form builder">
                <Hammer className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Form builder</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" asChild>
              <Link href={`/admin/forms/${form.id}/responses`} aria-label="Responses">
                <Inbox className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Responses</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <FormActionsMenu form={form} onUpdate={onUpdate} editOpen={editOpen} onEditOpenChange={onEditOpenChange} />
    </>
  );
}

// Confirmation-email fields shared by the create and edit dialogs, so the two
// cannot drift apart again.
function ConfirmationEmailFields({
  idPrefix,
  subject,
  onSubjectChange,
  subjectPlaceholder,
  content,
  onContentChange,
  contentPlaceholder,
  hint,
}: {
  idPrefix: string;
  subject: string;
  onSubjectChange: (value: string) => void;
  subjectPlaceholder: string;
  content: string;
  onContentChange: (html: string) => void;
  contentPlaceholder: string;
  hint: React.ReactNode;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-subject`}>Email Subject</Label>
        <Input
          id={`${idPrefix}-subject`}
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={subjectPlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label>Email Content</Label>
        <SimpleRichTextEditor
          value={content}
          onChange={onContentChange}
          placeholder={contentPlaceholder}
          ariaLabel="Email content"
        />
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </>
  );
}

type EmailFieldsProps = {
  idPrefix: string;
  subject: string;
  onSubjectChange: (value: string) => void;
  content: string;
  onContentChange: (html: string) => void;
};

function EventEmailFields(props: EmailFieldsProps) {
  return (
    <ConfirmationEmailFields
      {...props}
      subjectPlaceholder="Event Registration Confirmation"
      contentPlaceholder="Thank you for registering! We look forward to seeing you at the event."
      hint={<>This content will be sent in the confirmation email. Use {`{firstname}`} and {`{lastname}`} to personalize. You can format text with bold, italic, lists, etc.</>}
    />
  );
}

function CompanyFormEmailFields(props: EmailFieldsProps) {
  return (
    <ConfirmationEmailFields
      {...props}
      subjectPlaceholder="[Form Name] Submission Confirmation"
      contentPlaceholder="Thank you for submitting the [form name] form!"
      hint={<>This content will be sent in the confirmation email. Use {`{submitter_name}`} and {`{form_name}`} to personalize. You can format text with bold, italic, lists, etc.</>}
    />
  );
}

// Fills in a name-based subject and body for a company form's confirmation
// email, but only while they are still empty or the generic default.
// Functional updates, so it never overwrites what the admin typed.
function fillCompanyFormEmailDefaults(
  name: string,
  setSubject: React.Dispatch<React.SetStateAction<string>>,
  setContent: React.Dispatch<React.SetStateAction<string>>,
) {
  if (!name.trim()) return;
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

  setSubject((current) =>
    !current.trim() || current === "Form Submission Confirmation"
      ? `${capitalizedName} Submission Confirmation`
      : current
  );
  setContent((current) =>
    !current.trim() || current === "Thank you for your submission!"
      ? `<p>Dear,</p>
<p>Thank you for submitting the ${capitalizedName} form!</p>
<p>If you have any questions, please don't hesitate to contact us.</p>
<p>Best regards,</p>
<p>The VTK Career Team</p>`
      : current
  );
}

function CreateFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxEntries, setMaxEntries] = useState<string>("");
  const [isEventRegistration, setIsEventRegistration] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventEmailSubject, setEventEmailSubject] = useState("Event Registration Confirmation");
  const [eventEmailContent, setEventEmailContent] = useState("Thank you for registering! We look forward to seeing you at the event.");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [isCompanyForm, setIsCompanyForm] = useState(false);
  const [selectedCompanyFormEventId, setSelectedCompanyFormEventId] = useState<string>("");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [sendCompanyFormEmail, setSendCompanyFormEmail] = useState(false);
  const [companyFormEmailSubject, setCompanyFormEmailSubject] = useState("");
  const [companyFormEmailContent, setCompanyFormEmailContent] = useState("");
  const [options, setOptions] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (isCompanyForm) fillCompanyFormEmailDefaults(name, setCompanyFormEmailSubject, setCompanyFormEmailContent);
  }, [name, isCompanyForm]);

  // Load events when dialog opens and event registration or company form is enabled
  useEffect(() => {
    if (open && (isEventRegistration || isCompanyForm) && events.length === 0 && !eventsLoading) {
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
  }, [open, isEventRegistration, isCompanyForm, events.length, eventsLoading]);

  // Load options when company form event is selected
  useEffect(() => {
    if (!open || !isCompanyForm) {
      setOptions([]);
      setSelectedOptionIds([]);
      return;
    }

    if (!selectedCompanyFormEventId || selectedCompanyFormEventId === "none") {
      setOptions([]);
      setSelectedOptionIds([]);
      return;
    }

    // Only fetch if we don't already have options for this event
    if (optionsLoading) return;

    setOptionsLoading(true);
    fetchOptionsForEventAction(selectedCompanyFormEventId)
      .then((loadedOptions) => {
        setOptions(loadedOptions);
      })
      .catch((err) => {
        console.error("Error loading options:", err);
        setOptions([]);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
  }, [open, isCompanyForm, selectedCompanyFormEventId]);

  // Use window.location.origin for client-side, or fallback to env var or localhost
  const formDomain = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_FORM_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  const getFormUrl = () => {
    if (isCompanyForm && selectedCompanyFormEventId && selectedCompanyFormEventId !== "none") {
      return `${formDomain}/forms/company/${selectedCompanyFormEventId}/${slug || "your-slug"}`;
    }
    return `${formDomain}/forms/${slug || "your-slug"}`;
  };
  const formUrl = getFormUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create initial schema - if event registration, add email field
      let initialFields: FormField[] = [];
      
      if (isEventRegistration) {
        initialFields = [
          {
            id: `field_${Date.now()}_1`,
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

      if (isCompanyForm) {
        metadata.is_company_form = true;
        if (selectedCompanyFormEventId && selectedCompanyFormEventId !== "none") {
          metadata.event_id = selectedCompanyFormEventId;
        }
        if (selectedOptionIds.length > 0) {
          metadata.option_ids = selectedOptionIds;
        }
        metadata.send_company_form_email = sendCompanyFormEmail;
        if (sendCompanyFormEmail) {
          metadata.company_form_email_subject = companyFormEmailSubject || 'Form Submission Confirmation';
          metadata.company_form_email_content = companyFormEmailContent || 'Thank you for your submission!';
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

      // Event registration forms automatically require student login
      if (isEventRegistration) {
        metadata.requires_login = true;
      }

      const created = await createFormAction({
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
      setIsEventRegistration(true);
      setSelectedEventId("");
      setEventEmailSubject("Event Registration Confirmation");
      setEventEmailContent("Thank you for registering! We look forward to seeing you at the event.");
      setEventDate("");
      setEventEndDate("");
      setEventLocation("");
      setIsCompanyForm(false);
      setSelectedCompanyFormEventId("");
      setSelectedOptionIds([]);
      setSendCompanyFormEmail(false);
      setCompanyFormEmailSubject("Form Submission Confirmation");
      setCompanyFormEmailContent("Thank you for your submission!");
      setOptions([]);
      // A new form has no fields yet, so go straight to building it.
      router.push(`/admin/forms/${created.id}/builder`);
    } catch (error) {
      console.error("Error creating form:", error);
      toast.error("Failed to create form");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from name (handles accents: "Café Form" → "cafe-form")
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === slugifyEventName(name)) {
      setSlug(slugifyEventName(value));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="default">
          <Plus className="h-4 w-4" />
          New form
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
            <div className="space-y-2">
              <Label htmlFor="form-type">Form Type</Label>
              <Select
                value={isCompanyForm ? "company" : isEventRegistration ? "student" : "general"}
                onValueChange={(value) => {
                  setIsEventRegistration(value === "student");
                  setIsCompanyForm(value === "company");
                }}
              >
                <SelectTrigger id="form-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student form (event registration, sends confirmation emails)</SelectItem>
                  <SelectItem value="company">Company form (for events)</SelectItem>
                  <SelectItem value="general">General form (public, no login)</SelectItem>
                </SelectContent>
              </Select>
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
                <EventEmailFields
                  idPrefix="event-email"
                  subject={eventEmailSubject}
                  onSubjectChange={setEventEmailSubject}
                  content={eventEmailContent}
                  onContentChange={setEventEmailContent}
                />
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

            {isCompanyForm && (
              <div className="space-y-4 p-4 bg-muted rounded-md border-t">
                <h3 className="font-semibold text-sm">Company Form Settings</h3>
                <div className="space-y-2">
                  <Label htmlFor="company-form-event-select">Event *</Label>
                  <Select
                    value={selectedCompanyFormEventId || "none"}
                    onValueChange={(value) => setSelectedCompanyFormEventId(value === "none" ? "" : value)}
                    disabled={eventsLoading}
                  >
                    <SelectTrigger id="company-form-event-select" className="w-full">
                      <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select an event</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                      {selectedCompanyFormEventId && !events.some((e) => e.id === selectedCompanyFormEventId) && selectedCompanyFormEventId !== "none" && (
                        <SelectItem value={selectedCompanyFormEventId}>(Current: loading or deleted)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the event this form is for. Companies registered for this event will see this form.
                  </p>
                </div>

                {selectedCompanyFormEventId && selectedCompanyFormEventId !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="company-form-options">Career Event Options *</Label>
                    {optionsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading options...</div>
                    ) : options.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No options found for this event.</div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {options.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`option-${option.id}`}
                              checked={selectedOptionIds.includes(option.id)}
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setSelectedOptionIds([...selectedOptionIds, option.id]);
                                } else {
                                  setSelectedOptionIds(selectedOptionIds.filter((id) => id !== option.id));
                                }
                              }}
                            />
                            <Label htmlFor={`option-${option.id}`} className="text-sm font-normal cursor-pointer flex-1">
                              {option.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select which career event options this form applies to. Companies with these options will be assigned to this form.
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-company-form-email"
                    checked={sendCompanyFormEmail}
                    onCheckedChange={(checked) => setSendCompanyFormEmail(checked === true)}
                  />
                  <Label htmlFor="send-company-form-email" className="font-normal cursor-pointer">
                    Send confirmation email
                  </Label>
                </div>

                {sendCompanyFormEmail && (
                  <CompanyFormEmailFields
                    idPrefix="company-form-email"
                    subject={companyFormEmailSubject}
                    onSubjectChange={setCompanyFormEmailSubject}
                    content={companyFormEmailContent}
                    onContentChange={setCompanyFormEmailContent}
                  />
                )}
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

function FormActionsMenu({
  form,
  onUpdate,
  editOpen,
  onEditOpenChange: setEditOpen,
}: {
  form: FormRow;
  onUpdate: () => void;
  /** The row owns this so a click anywhere on it can open the details. */
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="More actions">
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
            <a 
              href={
                form.metadata?.is_company_form && form.metadata?.event_id
                  ? `/forms/company/${form.metadata.event_id}/${form.slug}`
                  : `/forms/${form.slug}`
              } 
              target="_blank" 
              rel="noopener noreferrer"
            >
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
  const [isCompanyForm, setIsCompanyForm] = useState(
    form.metadata?.is_company_form === true
  );
  const [selectedCompanyFormEventId, setSelectedCompanyFormEventId] = useState<string>(
    (form.metadata?.event_id as string) || ""
  );
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(
    (form.metadata?.option_ids as string[]) || []
  );
  const [sendCompanyFormEmail, setSendCompanyFormEmail] = useState(
    form.metadata?.send_company_form_email === true
  );
  const [isCompulsory, setIsCompulsory] = useState(
    form.metadata?.is_compulsory === true
  );
  const [companyFormEmailSubject, setCompanyFormEmailSubject] = useState(
    (form.metadata?.company_form_email_subject as string) || "Form Submission Confirmation"
  );
  const [companyFormEmailContent, setCompanyFormEmailContent] = useState(
    (form.metadata?.company_form_email_content as string) || "Thank you for your submission!"
  );
  const [options, setOptions] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Load events when dialog opens and event registration or company form is enabled
  useEffect(() => {
    if (open && (isEventRegistration || isCompanyForm) && events.length === 0 && !eventsLoading) {
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
  }, [open, isEventRegistration, isCompanyForm, events.length, eventsLoading]);

  // Load options when company form event is selected
  useEffect(() => {
    if (!open || !isCompanyForm) {
      setOptions([]);
      return;
    }

    if (!selectedCompanyFormEventId || selectedCompanyFormEventId === "none") {
      setOptions([]);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (optionsLoading) return;

    setOptionsLoading(true);
    fetchOptionsForEventAction(selectedCompanyFormEventId)
      .then((loadedOptions) => {
        setOptions(loadedOptions);
      })
      .catch((err) => {
        console.error("Error loading options:", err);
        setOptions([]);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCompanyForm, selectedCompanyFormEventId]);

  useEffect(() => {
    if (open) {
      setName(form.name);
      setSlug(form.slug);
      setDescription(form.description);
      setDeadline(form.metadata?.deadline ? utcToLocalDateTimeLocal(form.metadata.deadline as string) : '');
      setMaxEntries(form.metadata?.max_entries ? String(form.metadata.max_entries) : '');
      setIsEventRegistration(form.metadata?.is_event_registration === true);
      setIsCompanyForm(form.metadata?.is_company_form === true);
      setSelectedEventId((form.metadata?.event_id as string) || '');
      setSelectedCompanyFormEventId((form.metadata?.event_id as string) || '');
      setSelectedOptionIds((form.metadata?.option_ids as string[]) || []);
      setSendCompanyFormEmail(form.metadata?.send_company_form_email === true);
      setIsCompulsory(form.metadata?.is_compulsory === true);
      setCompanyFormEmailSubject((form.metadata?.company_form_email_subject as string) || 'Form Submission Confirmation');
      setCompanyFormEmailContent((form.metadata?.company_form_email_content as string) || 'Thank you for your submission!');
      setEventEmailSubject((form.metadata?.event_email_subject as string) || '');
      setEventEmailContent((form.metadata?.event_email_content as string) || '');
      setEventDate(form.metadata?.event_date ? utcToLocalDateTimeLocal(form.metadata.event_date as string) : '');
      setEventEndDate(form.metadata?.event_end_date ? utcToLocalDateTimeLocal(form.metadata.event_end_date as string) : '');
      setEventLocation((form.metadata?.event_location as string) || '');
    }
  }, [open, form]);

  // Declared after the reset above so it sees the values that reset just set.
  useEffect(() => {
    if (open && isCompanyForm) fillCompanyFormEmailDefaults(name, setCompanyFormEmailSubject, setCompanyFormEmailContent);
  }, [name, isCompanyForm, open]);

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
            requires_login: true, // Event registration forms automatically require student login
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
          // Remove company form fields if switching to event registration
          if (metadata.is_company_form) delete metadata.is_company_form;
          if (metadata.option_ids) delete metadata.option_ids;
          if (metadata.send_company_form_email) delete metadata.send_company_form_email;
          if (metadata.company_form_email_subject) delete metadata.company_form_email_subject;
          if (metadata.company_form_email_content) delete metadata.company_form_email_content;
        } else {
          // If unchecked, remove event registration flag and requires_login (since login is only for event registration) but keep other metadata
          if (metadata) {
            const { is_event_registration, requires_login, event_email_subject, event_email_content, event_date, event_end_date, event_location, ...restMetadata } = metadata;
            metadata = Object.keys(restMetadata).length > 0 ? restMetadata : undefined;
          }
        }

        // Update company form fields if this is a company form
        if (isCompanyForm) {
          metadata = {
            ...metadata,
            is_company_form: true,
            ...(selectedCompanyFormEventId && selectedCompanyFormEventId !== "none" ? { event_id: selectedCompanyFormEventId } : {}),
            ...(selectedOptionIds.length > 0 ? { option_ids: selectedOptionIds } : {}),
            send_company_form_email: sendCompanyFormEmail,
            ...(isCompulsory ? { is_compulsory: true } : {}),
            ...(sendCompanyFormEmail ? {
              company_form_email_subject: companyFormEmailSubject || 'Form Submission Confirmation',
              company_form_email_content: companyFormEmailContent || 'Thank you for your submission!',
            } : {}),
          };
          // Remove event_id if it was cleared
          if ((!selectedCompanyFormEventId || selectedCompanyFormEventId === "none") && metadata.event_id) {
            delete metadata.event_id;
          }
          // Remove option_ids if empty
          if (selectedOptionIds.length === 0 && metadata.option_ids) {
            delete metadata.option_ids;
          }
          // Remove email fields if email is disabled
          if (!sendCompanyFormEmail) {
            if (metadata.company_form_email_subject) delete metadata.company_form_email_subject;
            if (metadata.company_form_email_content) delete metadata.company_form_email_content;
          }
          // Remove event registration fields if switching to company form
          if (metadata.is_event_registration) delete metadata.is_event_registration;
          if (metadata.event_email_subject) delete metadata.event_email_subject;
          if (metadata.event_email_content) delete metadata.event_email_content;
          if (metadata.event_date) delete metadata.event_date;
          if (metadata.event_end_date) delete metadata.event_end_date;
          if (metadata.event_location) delete metadata.event_location;
        } else {
          // If unchecked, remove company form flag but keep other metadata
          if (metadata) {
            const { is_company_form, option_ids, send_company_form_email, company_form_email_subject, company_form_email_content, is_compulsory, ...restMetadata } = metadata;
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
      toast.error("Failed to update form");
    } finally {
      setLoading(false);
    }
  };

  // Use window.location.origin for client-side, or fallback to env var or localhost
  const formDomain = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_FORM_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  const getFormUrl = () => {
    if (form.metadata?.is_company_form && form.metadata?.event_id) {
      return `${formDomain}/forms/company/${form.metadata.event_id}/${slug || "your-slug"}`;
    }
    return `${formDomain}/forms/${slug || "your-slug"}`;
  };
  const formUrl = getFormUrl();

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

            <div className="space-y-2">
              <Label htmlFor="edit-form-type">Form Type</Label>
              <Select
                value={isCompanyForm ? "company" : isEventRegistration ? "student" : "general"}
                onValueChange={(value) => {
                  setIsEventRegistration(value === "student");
                  setIsCompanyForm(value === "company");
                }}
              >
                <SelectTrigger id="edit-form-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student form (event registration, sends confirmation emails)</SelectItem>
                  <SelectItem value="company">Company form (for events)</SelectItem>
                  <SelectItem value="general">General form (public, no login)</SelectItem>
                </SelectContent>
              </Select>
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
                <EventEmailFields
                  idPrefix="edit-event-email"
                  subject={eventEmailSubject}
                  onSubjectChange={setEventEmailSubject}
                  content={eventEmailContent}
                  onContentChange={setEventEmailContent}
                />
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

            {isCompanyForm && (
              <div className="space-y-4 p-4 bg-muted rounded-md border-t">
                <h3 className="font-semibold text-sm">Company Form Settings</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-company-form-event-select">Event *</Label>
                  <Select
                    value={selectedCompanyFormEventId || "none"}
                    onValueChange={(value) => setSelectedCompanyFormEventId(value === "none" ? "" : value)}
                    disabled={eventsLoading}
                  >
                    <SelectTrigger id="edit-company-form-event-select" className="w-full">
                      <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select an event</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                      {selectedCompanyFormEventId && !events.some((e) => e.id === selectedCompanyFormEventId) && selectedCompanyFormEventId !== "none" && (
                        <SelectItem value={selectedCompanyFormEventId}>(Current: loading or deleted)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the event this form is for. Companies registered for this event will see this form.
                  </p>
                </div>

                {selectedCompanyFormEventId && selectedCompanyFormEventId !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-company-form-options">Career Event Options *</Label>
                    {optionsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading options...</div>
                    ) : options.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No options found for this event.</div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {options.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-option-${option.id}`}
                              checked={selectedOptionIds.includes(option.id)}
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setSelectedOptionIds([...selectedOptionIds, option.id]);
                                } else {
                                  setSelectedOptionIds(selectedOptionIds.filter((id) => id !== option.id));
                                }
                              }}
                            />
                            <Label htmlFor={`edit-option-${option.id}`} className="text-sm font-normal cursor-pointer flex-1">
                              {option.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select which career event options this form applies to. Companies with these options will be assigned to this form.
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-is-compulsory"
                    checked={isCompulsory}
                    onCheckedChange={(checked) => setIsCompulsory(checked === true)}
                  />
                  <Label htmlFor="edit-is-compulsory" className="font-normal cursor-pointer">
                    This version is mandatory
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  When mandatory, companies must complete this version or a newer one. Earlier versions do not count. Incomplete mandatory forms will show in the company dashboard and admin completion overview.
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-send-company-form-email"
                    checked={sendCompanyFormEmail}
                    onCheckedChange={(checked) => setSendCompanyFormEmail(checked === true)}
                  />
                  <Label htmlFor="edit-send-company-form-email" className="font-normal cursor-pointer">
                    Send confirmation email
                  </Label>
                </div>

                {sendCompanyFormEmail && (
                  <CompanyFormEmailFields
                    idPrefix="edit-company-form-email"
                    subject={companyFormEmailSubject}
                    onSubjectChange={setCompanyFormEmailSubject}
                    content={companyFormEmailContent}
                    onContentChange={setCompanyFormEmailContent}
                  />
                )}
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
      toast.error("Failed to delete form");
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
      toast.error(`Failed to update form status: ${error instanceof Error ? error.message : String(error)}`);
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

function SlugCell({ slug, metadata }: { slug: string; metadata?: { is_company_form?: boolean; event_id?: string; [key: string]: unknown } }) {
  const [copied, setCopied] = useState(false);
  // Use window.location.origin for client-side, or fallback to env var or localhost
  const domain = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_FORM_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  const getFormUrl = () => {
    if (metadata?.is_company_form && metadata?.event_id) {
      return `${domain}/forms/company/${metadata.event_id}/${slug}`;
    }
    return `${domain}/forms/${slug}`;
  };
  const formUrl = getFormUrl();

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
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={formUrl}
              onClick={handleClick}
              className="block max-w-[16rem] truncate rounded-md bg-[#f5f5f6] px-2 py-0.5 text-[13px] text-[#52525b] transition-colors hover:bg-[#ececee] hover:text-foreground"
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
              className="h-6 w-6 p-0 text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
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
      toast.success('Version activated successfully! The form list will refresh.');
    } catch (error) {
      console.error("[VersionsDialog] Error activating version:", error);
      toast.error(`Failed to activate version: ${error}`);
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


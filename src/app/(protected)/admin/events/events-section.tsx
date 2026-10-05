"use client";

import * as React from "react";
import { fetchEventsAction, fetchEventSetupStatusesAction, findCompaniesWithEventOptions, addCompaniesToEventPageAction, createEventAction, updateEventAction, deleteEventAction } from "@/app/actions/events";
import { uploadFileAction } from "@/app/actions/media";
import { createMatchingSoftwareAction } from "@/app/actions/matching-software";
import { fetchAcademicYearsAction } from "@/app/actions/cv-book";
import { fetchFormsAction } from "@/app/actions/forms";
import type { EventSetupStatus } from "@/lib/repos/event-page";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { IconPlus } from "@tabler/icons-react";
import type { CareerEvent, Company, HeaderButtonType } from "@/lib/schema";
import { SimpleRichTextEditor } from "@/components/admin/SimpleRichTextEditor";
import { toast } from "sonner";

export function EventsSection({ academicYearId }: { academicYearId?: string }) {
  const [events, setEvents] = React.useState<CareerEvent[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, EventSetupStatus>>({});
  const [loading, setLoading] = React.useState(true);

  // The events, then every card's setup status in one call (each card used to
  // ask for its own with four server actions, which run one at a time).
  const load = React.useCallback(async () => {
    const rows = (await fetchEventsAction(academicYearId ? { academicYearId } : undefined)) ?? [];
    const status = await fetchEventSetupStatusesAction(rows.map((e) => e.id));
    return { rows, status };
  }, [academicYearId]);

  const refresh = React.useCallback(() => {
    return load()
      .then(({ rows, status }) => { setEvents(rows); setStatuses(status); })
      .catch(console.error);
  }, [load]);

  React.useEffect(() => {
    let alive = true;
    load()
      .then(({ rows, status }) => { if (!alive) return; setEvents(rows); setStatuses(status); })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, [load]);

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl">Annual event editions</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Dates and operational settings for the selected academic year.
          </p>
        </div>
        <EventFormDialog onSaved={refresh} defaultAcademicYearId={academicYearId} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 grid place-items-center text-sm text-muted-foreground">Loading events…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {events.map(e => <EventCard key={e.id ?? e.name} event={e} status={statuses[e.id]} onChanged={refresh} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Create/Edit dialog for a career event. Omitting `event` makes it a create form. */
function EventFormDialog({
  event,
  onSaved,
  defaultAcademicYearId,
}: {
  event?: CareerEvent;
  onSaved?: () => void;
  defaultAcademicYearId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const isEdit = !!event;

  const [form, setForm] = React.useState({
    name: "",
    description: "",
    location: "",
    date: "",
    start_hour: "",
    end_hour: "",
    shout: "",
    status: "draft",
    num_of_companies: "",
    num_of_students: "",
    image: "" as string | undefined,
    academic_year_id: "",
  });
  const [eventAcademicYears, setEventAcademicYears] = React.useState<Array<{ id: string; name: string; start_of_year: string; end_of_year: string }>>([]);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedFile(null);
    setForm({
      name: event?.name ?? "",
      description: (event?.description as string) ?? "",
      location: (event?.location as string) ?? "",
      date: event?.date ? String(event.date).slice(0, 10) : "",
      start_hour: event?.start_hour ? String(event.start_hour).slice(0, 5) : "",
      end_hour: event?.end_hour ? String(event.end_hour).slice(0, 5) : "",
      shout: (event?.shout as string) ?? "",
      status: (event?.status as string) ?? "draft",
      num_of_companies: event?.num_of_companies != null ? String(event.num_of_companies) : "",
      num_of_students: event?.num_of_students != null ? String(event.num_of_students) : "",
      image: (event?.image as string) ?? "",
      academic_year_id: String(event?.academic_year_id ?? event?.academic_year?.id ?? defaultAcademicYearId ?? ""),
    });
    fetchAcademicYearsAction().then((years) => {
      const available = years ?? [];
      setEventAcademicYears(available);
      setForm((current) => {
        if (current.academic_year_id) return current;
        const now = Date.now();
        const active = available.find((year) =>
          new Date(year.start_of_year).getTime() <= now && new Date(year.end_of_year).getTime() >= now
        ) ?? available[0];
        return { ...current, academic_year_id: active ? String(active.id) : "" };
      });
    });
  }, [open, event, defaultAcademicYearId]);

  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let imageId = form.image;
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        const res = await uploadFileAction(fd);
        if (!res.success || !res.data) {
          setError("Failed to upload image: " + (res.error ?? "unknown error"));
          setSaving(false);
          return;
        }
        imageId = res.data.id;
      }

      const payload = {
        name: form.name,
        description: form.description,
        location: form.location || null,
        date: form.date || null,
        start_hour: form.start_hour || null,
        end_hour: form.end_hour || null,
        shout: form.shout || null,
        status: form.status,
        num_of_companies: form.num_of_companies,
        num_of_students: form.num_of_students,
        image: imageId || null,
        academic_year_id: form.academic_year_id,
      };

      const result = isEdit
        ? await updateEventAction(event!.id, payload)
        : await createEventAction(payload);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        setSaving(false);
        return;
      }
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">Edit</Button>
        ) : (
          <Button size="sm"><IconPlus className="mr-1 h-4 w-4" /> New event series</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit annual event edition" : "Create a new event series"}</DialogTitle>
          {!isEdit ? (
            <DialogDescription>
              Only use this for a genuinely new recurring event. To create next year’s Jobfair,
              close this dialog and use “Create annual editions” on the Events page. A draft
              public event page is created automatically.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-name">Name*</Label>
            <Input id="ev-name" value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Academic year*</Label>
            <Select value={form.academic_year_id} onValueChange={value => set("academic_year_id", value)} required disabled={isEdit}>
              <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
              <SelectContent>
                {eventAcademicYears.map((year) => (
                  <SelectItem key={year.id} value={String(year.id)}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-desc">Description</Label>
            <SimpleRichTextEditor
              value={form.description}
              onChange={description => set("description", description)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-location">Location</Label>
              <Input id="ev-location" value={form.location} onChange={e => set("location", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-start">Start hour</Label>
              <Input id="ev-start" type="time" value={form.start_hour} onChange={e => set("start_hour", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-end">End hour</Label>
              <Input id="ev-end" type="time" value={form.end_hour} onChange={e => set("end_hour", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-companies"># Companies</Label>
              <Input id="ev-companies" type="number" value={form.num_of_companies} onChange={e => set("num_of_companies", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-students"># Students</Label>
              <Input id="ev-students" type="number" value={form.num_of_students} onChange={e => set("num_of_students", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-shout">Shout</Label>
            <Input id="ev-shout" value={form.shout} onChange={e => set("shout", e.target.value)} placeholder="Short highlight banner text" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-status">Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger id="ev-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-image">Image</Label>
            <div className="flex items-center gap-3">
              {(selectedFile || form.image) && (
                <div className="h-16 w-16 overflow-hidden rounded border bg-muted shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedFile ? URL.createObjectURL(selectedFile) : `/api/files/${form.image}`}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={e => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                </div>
              )}
              <Input id="ev-image" type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save changes" : "Create event series"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventCard({ event, status, onChanged }: { event: CareerEvent; status?: EventSetupStatus; onChanged?: () => void }) {
  const hours = [event.start_hour, event.end_hour].filter(Boolean).join(" – ");
  // Loaded with the list by EventsSection; the card keeps local copies it can
  // update after a change.
  const loading = !status;
  const hasEventPage = status?.hasEventPage ?? false;
  const hasFloorplan = status?.hasFloorplan ?? null;
  const hasCompanyGuide = status?.hasCompanyGuide ?? null;
  const hasSchedules = status?.hasSchedules ?? null;
  const [hasMatchingSoftware, setHasMatchingSoftware] = React.useState<boolean | null>(status?.hasMatchingSoftware ?? null);
  const [headerButtons, setHeaderButtons] = React.useState<HeaderButtonType[]>((status?.headerButtons ?? []) as HeaderButtonType[]);
  const [savingHeaderButtons, setSavingHeaderButtons] = React.useState(false);

  const toggleHeaderButton = async (btn: HeaderButtonType) => {
    const next = headerButtons.includes(btn)
      ? headerButtons.filter((b) => b !== btn)
      : [...headerButtons, btn];
    setHeaderButtons(next);
    setSavingHeaderButtons(true);
    try {
      const res = await fetch("/api/admin/event-page/header-buttons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, headerButtons: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (err) {
      console.error("Failed to update header buttons:", err);
      setHeaderButtons(headerButtons); // Revert
      toast.error(err instanceof Error ? err.message : "Failed to save header buttons.");
    } finally {
      setSavingHeaderButtons(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete event "${event.name}"? This cannot be undone.`)) return;
    const res = await deleteEventAction(event.id);
    if (!res.success) {
      toast.error(res.error ?? "Failed to delete event");
      return;
    }
    onChanged?.();
  };

  return (
    <Card className="border rounded-lg shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>{event.name}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-1">
              {event.academic_year?.name ?? "Annual edition"}
            </span>
            {/* One draft flag, on the event: it gates the public page too. A
                published edition carries no badge. */}
            {event.status === "published" ? null : (
              <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-800">Draft</span>
            )}
            {!loading && !hasEventPage ? (
              <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">Event page missing</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <EventFormDialog event={event} onSaved={onChanged} />
          <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete} aria-label="Delete event">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
          <span>Date</span>
          <span className="font-medium text-foreground">{String(event.date ?? "TBA")}</span>
          <span>Hours</span>
          <span className="font-medium text-foreground">{hours || "TBA"}</span>
          <span>Location</span>
          <span className="font-medium text-foreground">{String(event.location ?? "TBA")}</span>
          <span># Students</span>
          <span className="font-medium text-foreground">{String(event.num_of_students ?? "–")}</span>
        </div>
        <div className="flex flex-col gap-2 items-stretch">
          <Button variant="default" size="sm" asChild className="w-full">
            <Link href={`/admin/event-pages?year=${event.academic_year_id ?? event.academic_year?.id ?? ""}&event=${event.id}`}>
              {hasEventPage ? "Edit event page & timetable" : "Create event page"}
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/checkins/${event.id}`}>Check-ins</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/speakers">Speakers</Link>
            </Button>
          </div>
          {/* Header buttons: choose which buttons appear on the public event page header. When any are on, main nav (Home, Events, etc.) is hidden. */}
          {!loading && (
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs font-medium">Header buttons</Label>
              <p className="text-xs text-muted-foreground">Show in event page header (replaces main nav when any are on):</p>
              <div className="flex flex-wrap gap-3">
                {hasFloorplan && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={headerButtons.includes("floorplan")}
                      onCheckedChange={() => toggleHeaderButton("floorplan")}
                      disabled={savingHeaderButtons}
                    />
                    <span className="text-sm">Floorplan</span>
                  </label>
                )}
                {hasCompanyGuide && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={headerButtons.includes("company_guide")}
                      onCheckedChange={() => toggleHeaderButton("company_guide")}
                      disabled={savingHeaderButtons}
                    />
                    <span className="text-sm">Company guide</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={headerButtons.includes("cv_upload")}
                    onCheckedChange={() => toggleHeaderButton("cv_upload")}
                    disabled={savingHeaderButtons}
                  />
                  <span className="text-sm">CV Upload</span>
                </label>
                {hasMatchingSoftware && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={headerButtons.includes("matching_software")}
                      onCheckedChange={() => toggleHeaderButton("matching_software")}
                      disabled={savingHeaderButtons}
                    />
                    <span className="text-sm">Matching Software</span>
                  </label>
                )}
              </div>
            </div>
          )}
          <AddCompaniesDialog event={event} hasCompanies={status?.hasCompanies ?? false} />
          <AddCompanyGuideDialog event={event} hasCompanyGuide={hasCompanyGuide} />
          {loading ? (
            <Button variant="outline" size="sm" disabled className="w-full">
              Loading...
            </Button>
          ) : hasFloorplan ? (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/floorplan/${event.id}`}>
                Edit floorplan
              </Link>
            </Button>
          ) : (
            <AddFloorplanDialog event={event} />
          )}
          {!loading && (hasMatchingSoftware ? (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/matching-software?eventId=${event.id}`}>
                Edit matching software
              </Link>
            </Button>
          ) : (
            <AddMatchingSoftwareDialog event={event} onCreated={() => setHasMatchingSoftware(true)} />
          ))}
          {!loading && (hasSchedules ? (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/schedules?eventId=${event.id}`}>
                Edit Schedules
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/schedules?eventId=${event.id}`}>
                Add Schedules
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AddMatchingSoftwareDialog({ event, onCreated }: { event: CareerEvent; onCreated?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [academicYears, setAcademicYears] = React.useState<{ id: string; name: string; start_of_year: string; end_of_year: string }[]>([]);
  const [forms, setForms] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedYearId, setSelectedYearId] = React.useState("");
  const [selectedFormId, setSelectedFormId] = React.useState("");

  React.useEffect(() => {
    if (open) {
      Promise.all([fetchAcademicYearsAction(), fetchFormsAction()]).then(([years, formsList]) => {
        setAcademicYears(years || []);
        setForms(formsList || []);
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId) {
      setError("Please select an academic year");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await createMatchingSoftwareAction({
        year: selectedYearId,
        event: event.id,
        prerequisite_form: selectedFormId || undefined,
        active: true,
      });
      setOpen(false);
      setSelectedYearId("");
      setSelectedFormId("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <IconPlus className="h-4 w-4 mr-2" />
          Add matching software
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Matching Software</DialogTitle>
            <DialogDescription>
              Set up RIASEC matching for {event.name}. Students fill in 12 questions; optionally require a prerequisite form first.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}
          <div className="space-y-2">
            <Label>Academic Year *</Label>
            <Select value={selectedYearId} onValueChange={setSelectedYearId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name} ({y.start_of_year} - {y.end_of_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prerequisite Form (optional)</Label>
            <Select value={selectedFormId || "__none__"} onValueChange={(v) => setSelectedFormId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Students must complete this form before the matching software. Response is included in the result.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Creating..." : "Create"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddFloorplanDialog({ event }: { event: CareerEvent }) {
  const [open, setOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const year = String(fd.get("year") ?? "").trim();
    const svgFile = fd.get("svg") as File | null;

    if (!name || !year || !svgFile) {
      setError("Please fill in all fields and select an SVG file");
      return;
    }

    if (svgFile.type !== "image/svg+xml" && !svgFile.name.toLowerCase().endsWith(".svg")) {
      setError("Please select an SVG file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("svg", svgFile);
      formData.append("name", name);
      formData.append("year", year);
      formData.append("eventId", event.id);
      
      // Add background image if provided
      const backgroundInput = (e.target as HTMLFormElement).elements.namedItem("background") as HTMLInputElement;
      if (backgroundInput?.files?.[0]) {
        formData.append("background", backgroundInput.files[0]);
      }

      const response = await fetch("/api/admin/upload-floorplan", {
        method: "POST",
        body: formData,
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload floorplan");
      }

      setOpen(false);
      (e.target as HTMLFormElement).reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <IconPlus className="h-4 w-4 mr-2" />
          Add floorplan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Floorplan</DialogTitle>
            <DialogDescription>
              Upload an SVG floorplan for {event.name}. The system will extract booths automatically.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="w-full">
            <Label htmlFor="name" className="text-xs">Floorplan Name*</Label>
            <Input name="name" id="name" placeholder="Main Hall Floorplan" required />
          </div>

          <div className="w-full">
            <Label htmlFor="year" className="text-xs">Year*</Label>
            <Input name="year" id="year" placeholder="2025" required />
          </div>

          <div className="w-full">
            <Label htmlFor="svg" className="text-xs">SVG File*</Label>
            <Input
              ref={fileInputRef}
              name="svg"
              id="svg"
              type="file"
              accept="image/svg+xml,.svg"
              required
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload an SVG floorplan file. The system will extract booths automatically.
            </p>
          </div>

          <div className="w-full">
            <Label htmlFor="background" className="text-xs">Background Image (Optional)</Label>
            <Input
              name="background"
              id="background"
              type="file"
              accept="image/*"
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a background image to display behind the floorplan.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
              {uploading ? "Processing..." : "Upload & Process"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={uploading}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCompaniesDialog({ event, hasCompanies }: { event: CareerEvent; hasCompanies: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  // Whether the event page already lists companies; known from the card's
  // status, and true once companies are added here.
  const [hasExistingCompanies, setHasExistingCompanies] = React.useState(hasCompanies);

  // Load companies when dialog opens
  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      findCompaniesWithEventOptions(event.id)
        .then((companies) => {
          setCompanies(companies);
          // All companies selected by default
          setSelectedCompanyIds(new Set(companies.map((c) => c.id)));
        })
        .catch((err) => {
          console.error("Error loading companies:", err);
          setError("Failed to load companies");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Reset when dialog closes
      setCompanies([]);
      setSelectedCompanyIds(new Set());
      setSearchQuery("");
      setError(null);
    }
  }, [open, event.id]);

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCompanyIds.size === filteredCompanies.length) {
      setSelectedCompanyIds(new Set());
    } else {
      setSelectedCompanyIds(new Set(filteredCompanies.map((c) => c.id)));
    }
  };

  const filteredCompanies = React.useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(query));
  }, [companies, searchQuery]);

  const handleAdd = async () => {
    if (selectedCompanyIds.size === 0) {
      setError("Please select at least one company");
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const result = await addCompaniesToEventPageAction(
        event.id,
        Array.from(selectedCompanyIds)
      );

      if (result.success) {
        setOpen(false);
        // Update hasExistingCompanies after successful add
        setHasExistingCompanies(true);
      } else {
        setError(result.error || "Failed to add companies");
      }
    } catch (err) {
      console.error("Error adding companies:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <IconPlus className="h-4 w-4 mr-2" />
          {hasExistingCompanies ? "Edit companies" : "Add companies"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hasExistingCompanies ? "Edit Companies" : "Add Companies"} to {event.name}</DialogTitle>
          <DialogDescription>
            Select companies that have registered for this event through career event options.
            All companies are selected by default, but you can deselect any before adding.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-32 grid place-items-center text-sm text-muted-foreground">
            Loading companies...
          </div>
        ) : companies.length === 0 ? (
          <div className="h-32 grid place-items-center text-sm text-muted-foreground">
            No companies found with options for this event.
          </div>
        ) : (
          <>
            <div className="w-full">
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="border rounded-lg">
              <div className="p-3 border-b flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      filteredCompanies.length > 0 &&
                      filteredCompanies.every((c) => selectedCompanyIds.has(c.id))
                    }
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedCompanyIds.size} of {companies.length} selected
                  </span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredCompanies.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No companies match your search.
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="p-3 hover:bg-muted/50 flex items-center gap-3 cursor-pointer"
                        onClick={() => toggleCompany(company.id)}
                      >
                        <Checkbox
                          checked={selectedCompanyIds.has(company.id)}
                          onCheckedChange={() => toggleCompany(company.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm font-medium flex-1">
                          {company.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleAdd}
            disabled={adding || selectedCompanyIds.size === 0}
            className="w-full sm:w-auto"
          >
            {adding ? "Adding..." : `Add ${selectedCompanyIds.size} companies`}
          </Button>
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto" disabled={adding}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCompanyGuideDialog({ event, hasCompanyGuide }: { event: CareerEvent; hasCompanyGuide?: boolean | null }) {
  const [open, setOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const fd = new FormData(e.currentTarget);
    const pdfFile = fd.get("pdf") as File | null;

    if (!pdfFile) {
      setError("Please select a PDF file");
      return;
    }

    if (pdfFile.type !== "application/pdf" && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("eventId", event.id);

      const response = await fetch("/api/admin/upload-company-guide", {
        method: "POST",
        body: formData,
      });

      // Always try to parse as JSON first
      let result: { success?: boolean; error?: string; message?: string };
      try {
        result = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, the response is likely an error page
        // Read as text for debugging, but don't try to parse again
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500)); // Limit log size
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload company guide");
      }

      setOpen(false);
      (e.target as HTMLFormElement).reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Reload the page to show the updated state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          {hasCompanyGuide ? (
            "Edit Company Guide"
          ) : (
            <>
              <IconPlus className="h-4 w-4 mr-2" />
              Add Company Guide
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Company Guide</DialogTitle>
            <DialogDescription>
              Upload a PDF company guide for {event.name}. Only one company guide per event page.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="w-full">
            <Label htmlFor="pdf" className="text-xs">PDF File*</Label>
            <Input
              ref={fileInputRef}
              name="pdf"
              id="pdf"
              type="file"
              accept="application/pdf,.pdf"
              required
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a PDF file. This will replace any existing company guide for this event.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={uploading}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

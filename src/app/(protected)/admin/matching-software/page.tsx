"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  listMatchingSoftwareAction,
  createMatchingSoftwareAction,
} from "@/app/actions/matching-software";
import { fetchAcademicYearsAction } from "@/app/actions/cv-book";
import { fetchFormsAction } from "@/app/actions/forms";
import { fetchEventsAction } from "@/app/actions/events";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useUser } from "@/providers/UserProvider";
import type { MatchingSoftware, AcademicYear, Form, CareerEvent } from "@/lib/schema";

type MatchingSoftwareRow = MatchingSoftware & {
  year: AcademicYear;
  event: CareerEvent;
  prerequisite_form?: Form;
};

export default function AdminMatchingSoftwarePage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user?.admin) return <p>NO ACCESS</p>;

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Matching Software</h1>
          <p className="text-muted-foreground">
            Create matching software per event and year. Students fill in RIASEC questions; prerequisite form response is included.
          </p>
        </div>
        <CreateMatchingSoftwareDialog eventId={eventId ?? undefined} onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>

      <MatchingSoftwareTable key={refreshKey} eventId={eventId ?? undefined} />
    </div>
  );
}

function MatchingSoftwareTable({ eventId }: { eventId?: string }) {
  const [items, setItems] = useState<MatchingSoftwareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    listMatchingSoftwareAction(eventId ? { eventId } : undefined)
      .then((data) => {
        const transformed = (data || []).map((item) => ({
          ...item,
          year: typeof item.year === "string" ? { id: item.year } as AcademicYear : item.year,
          event: typeof item.event === "string" ? { id: item.event } as CareerEvent : item.event,
          prerequisite_form: typeof item.prerequisite_form === "string" ? { id: item.prerequisite_form } as Form : item.prerequisite_form,
        })) as MatchingSoftwareRow[];
        setItems(transformed);
      })
      .catch((err) => {
        console.error(err);
        setError(err?.message || String(err));
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-destructive font-medium">Failed to load matching software</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Check that the Directus collection is named &quot;Matching_Software&quot; (or &quot;matching_software&quot;). See DIRECTUS_MATCHING_SOFTWARE.md.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matching Software Configurations</CardTitle>
        <p className="text-sm text-muted-foreground">
          Each configuration links an event and year. Students must fill the prerequisite form before the matching software.
        </p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            No matching software yet. Create one above.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <div className="font-medium">
                    {(item.event as CareerEvent)?.name || "Unknown event"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Year: {(item.year as AcademicYear)?.name || "—"} • Prerequisite:{" "}
                    {(item.prerequisite_form as Form)?.name || "None"}
                  </div>
                </div>
                <div className="text-sm">
                  {item.active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-muted-foreground">Inactive</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateMatchingSoftwareDialog({ eventId: preselectedEventId, onCreated }: { eventId?: string; onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>(preselectedEventId ?? "");
  const [selectedFormId, setSelectedFormId] = useState<string>("");

  useEffect(() => {
    if (preselectedEventId) setSelectedEventId(preselectedEventId);
  }, [preselectedEventId]);

  useEffect(() => {
    if (open) {
      Promise.all([
        fetchAcademicYearsAction(),
        fetchFormsAction(),
        fetchEventsAction(),
      ]).then(([years, formsList, eventsList]) => {
        setAcademicYears(years || []);
        setForms(formsList || []);
        setEvents(eventsList || []);
        if (preselectedEventId && !selectedEventId) setSelectedEventId(preselectedEventId);
      });
    }
  }, [open, preselectedEventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eventToUse = selectedEventId || preselectedEventId;
    if (!selectedYearId || !eventToUse) {
      alert("Please select year and event");
      return;
    }

    setLoading(true);
    try {
      await createMatchingSoftwareAction({
        year: selectedYearId,
        event: eventToUse,
        prerequisite_form: selectedFormId || undefined,
        active: true,
      });
      setOpen(false);
      setSelectedYearId("");
      setSelectedEventId(preselectedEventId ?? "");
      setSelectedFormId("");
      onCreated?.();
    } catch (err) {
      console.error(err);
      alert("Failed to create. Ensure matching_software and student_matching_response collections exist in Directus.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Matching Software
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Matching Software</DialogTitle>
          <DialogDescription>
            Link an event and year. Optionally require a prerequisite form (e.g. event registration) before students can fill the matching software.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {!preselectedEventId && (
          <div className="space-y-2">
            <Label>Event *</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}
          <div className="space-y-2">
            <Label>Prerequisite Form (optional)</Label>
            <Select value={selectedFormId || "__none__"} onValueChange={(v) => setSelectedFormId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None - no prerequisite" />
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
              Students must fill this form before they can complete the matching software. The response is included in the matching result.
            </p>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

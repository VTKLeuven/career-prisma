"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  fetchSchedulesForEventAdminAction,
  createScheduleWithFileAction,
  deleteScheduleAction,
} from "@/app/actions/schedules";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchMastersAction } from "@/app/actions/features";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, FileText } from "lucide-react";
import { useUser } from "@/providers/UserProvider";
import { getDirectusImageUrl } from "@/components/Images";
import type { Master } from "@/lib/schema";

export default function AdminSchedulesPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user?.admin) return <p className="p-8">No access</p>;

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Schedules</h1>
          <p className="text-muted-foreground">
            Add student schedules (PDF per master) for an event. Companies with the &quot;Student Schedules&quot; sub-option see schedules for masters in their category.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to Admin</Link>
        </Button>
      </div>

      <SchedulesTable key={refreshKey} eventId={eventId ?? undefined} onChanged={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}

function SchedulesTable({ eventId, onChanged }: { eventId?: string; onChanged: () => void }) {
  const [schedules, setSchedules] = useState<Array<{ id: string; master?: Master; pdf?: { id?: string } }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId ?? "");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEventId(eventId ?? "");
  }, [eventId]);

  useEffect(() => {
    fetchEventsAction().then((list) => {
      setEvents((list ?? []).map((e) => ({ id: e.id, name: e.name })));
    });
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setSchedules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSchedulesForEventAdminAction(selectedEventId)
      .then(setSchedules)
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteScheduleAction(id);
    setDeletingId(null);
    if (result.success) onChanged();
    else alert(result.error);
  };

  const eventName = events.find((e) => e.id === selectedEventId)?.name ?? "Select event";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Schedules</CardTitle>
        <CardDescription>
          Select an event to view and manage its schedules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Event</Label>
          <Select value={selectedEventId || "__none__"} onValueChange={(v) => setSelectedEventId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select event</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEventId && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Schedules for {eventName}</h3>
              <AddScheduleDialog eventId={selectedEventId} onCreated={onChanged} />
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schedules yet. Add one above.</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => {
                  const fileId = typeof s.pdf === "string" ? s.pdf : s.pdf?.id;
                  const pdfUrl = fileId ? getDirectusImageUrl(fileId) : null;
                  const masterName = typeof s.master === "object" && s.master?.name ? s.master.name : "Unknown";
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{masterName}</span>
                        {pdfUrl && (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-vtk-blue hover:underline"
                          >
                            View PDF
                          </a>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AddScheduleDialog({ eventId, onCreated }: { eventId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [masters, setMasters] = useState<Master[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchMastersAction().then(setMasters);
      setSelectedMasterId("");
      setFile(null);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMasterId || !file) {
      setError("Please select a master and upload a PDF");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createScheduleWithFileAction(eventId, selectedMasterId, file);
    setLoading(false);
    if (result.success) {
      setOpen(false);
      onCreated();
    } else {
      setError(result.error ?? "Failed to create");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogDescription>
              Upload a PDF schedule for a study program (master). Companies with &quot;Student Schedules&quot; sub-option will see schedules for masters in their category.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}
          <div className="space-y-2">
            <Label>Master (study program) *</Label>
            <Select value={selectedMasterId} onValueChange={setSelectedMasterId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select master" />
              </SelectTrigger>
              <SelectContent>
                {masters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>PDF file *</Label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

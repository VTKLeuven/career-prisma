"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  listMatchingSoftwareAction,
  createMatchingSoftwareAction,
  updateMatchingSoftwareAction,
  getCompanyMatchCountsAction,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, RefreshCw, Loader2, BarChart3, ArrowUp, ArrowDown } from "lucide-react";
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
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingViewId, setTogglingViewId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);
  const [updateResult, setUpdateResult] = useState<{ studentsUpdated: number; companiesSynced: number; errors: string[] } | null>(null);

  const loadItems = React.useCallback(() => {
    setError(null);
    setLoading(true);
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

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleToggleActive = async (item: MatchingSoftwareRow) => {
    setTogglingId(item.id);
    try {
      await updateMatchingSoftwareAction(item.id, { active: !item.active });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, active: !i.active } : i))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleCompaniesCanViewMatches = async (item: MatchingSoftwareRow) => {
    setTogglingViewId(item.id);
    try {
      const next = !(item.companies_can_view_matches ?? false);
      await updateMatchingSoftwareAction(item.id, { companies_can_view_matches: next });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, companies_can_view_matches: next } : i))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update. Please try again.");
    } finally {
      setTogglingViewId(null);
    }
  };

  const handleFullUpdate = async (item: MatchingSoftwareRow) => {
    setSyncingId(item.id);
    setUpdateDialogOpen(true);
    setUpdateLogs(["Syncing company matches… Please wait."]);
    setUpdateResult(null);
    try {
      const id = String(item.id);
      const res = await fetch(`/api/admin/matching-software/full-update?matchingSoftwareId=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchingSoftwareId: id }),
      });
      const result = await res.json();
      setUpdateLogs(result.logs ?? []);
      setUpdateResult({
        studentsUpdated: result.studentsUpdated ?? 0,
        companiesSynced: result.companiesSynced ?? 0,
        errors: result.errors ?? [],
      });
      if (!res.ok) {
        setUpdateLogs((prev) => [...prev, `[HTTP ${res.status}] ${result.error ?? "Request failed"}`]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      setUpdateLogs((prev) => [...prev, `[Error] ${msg}`]);
      setUpdateResult({
        studentsUpdated: 0,
        companiesSynced: 0,
        errors: [`Request failed: ${msg}`],
      });
    } finally {
      setSyncingId(null);
    }
  };

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
    <>
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
                <div className="flex items-center gap-3">
                  <ViewMatchesDialog item={item} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFullUpdate(item)}
                    disabled={syncingId === item.id}
                  >
                    {syncingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">{syncingId === item.id ? "Syncing…" : "Sync company matches"}</span>
                  </Button>
                  <Checkbox
                    id={`active-${item.id}`}
                    checked={item.active ?? true}
                    onCheckedChange={() => handleToggleActive(item)}
                    disabled={togglingId === item.id}
                  />
                  <Label
                    htmlFor={`active-${item.id}`}
                    className="text-sm cursor-pointer select-none"
                  >
                    {item.active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </Label>
                  <Checkbox
                    id={`view-${item.id}`}
                    checked={item.companies_can_view_matches ?? false}
                    onCheckedChange={() => handleToggleCompaniesCanViewMatches(item)}
                    disabled={togglingViewId === item.id}
                  />
                  <Label
                    htmlFor={`view-${item.id}`}
                    className="text-sm cursor-pointer select-none"
                  >
                    {item.companies_can_view_matches ? (
                      <span className="text-green-600">Companies can view matches</span>
                    ) : (
                      <span className="text-muted-foreground">Companies can view matches</span>
                    )}
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sync company matches – log</DialogTitle>
          <DialogDescription>
            {updateResult ? (
              <span>
                Companies: {updateResult.companiesSynced} synced
                {updateResult.errors.length > 0 && ` • ${updateResult.errors.length} errors`}
              </span>
            ) : (
              "Sync company_matching_response.students from student matches. Clear students manually in Directus first if needed."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          <pre className="text-xs font-mono bg-muted/50 p-3 rounded-md whitespace-pre-wrap break-words">
            {updateLogs.length > 0 ? updateLogs.join("\n") : "No logs yet."}
          </pre>
          {updateResult && updateResult.errors.length > 0 && (
            <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <p className="font-medium">Errors:</p>
              <ul className="list-disc list-inside mt-1">
                {updateResult.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {updateResult.errors.length > 10 && (
                  <li>… and {updateResult.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

type MatchCountRow = { companyId: string; companyName: string; matchCount: number };

function ViewMatchesDialog({ item }: { item: MatchingSoftwareRow }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MatchCountRow[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "matches">("matches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (open && item.id) {
      setLoading(true);
      getCompanyMatchCountsAction(item.id)
        .then((rows) => setData(rows ?? []))
        .catch(() => setData([]))
        .finally(() => setLoading(false));
    }
  }, [open, item.id]);

  const sorted = React.useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      if (sortBy === "name") {
        const cmp = (a.companyName || a.companyId).localeCompare(b.companyName || b.companyId, undefined, { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = a.matchCount - b.matchCount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sortBy, sortDir]);

  const toggleSort = (field: "name" | "matches") => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "matches" ? "desc" : "asc");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="h-4 w-4" />
          <span className="ml-1.5">View matches</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Match counts per company</DialogTitle>
          <DialogDescription>
            {(item.event as CareerEvent)?.name || "Event"} – {(item.year as AcademicYear)?.name || "Year"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Button
            variant={sortBy === "name" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSort("name")}
          >
            Name {sortBy === "name" && (sortDir === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />)}
          </Button>
          <Button
            variant={sortBy === "matches" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSort("matches")}
          >
            Matches {sortBy === "matches" && (sortDir === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />)}
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto border rounded-md">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No companies with completed matching.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Company</th>
                  <th className="text-right p-3 font-medium">Matches</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.companyId} className="border-t">
                    <td className="p-3">{row.companyName || row.companyId || "—"}</td>
                    <td className="p-3 text-right font-medium">{row.matchCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {sorted.length} companies • Total: {sorted.reduce((s, r) => s + r.matchCount, 0)} matches
        </p>
      </DialogContent>
    </Dialog>
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

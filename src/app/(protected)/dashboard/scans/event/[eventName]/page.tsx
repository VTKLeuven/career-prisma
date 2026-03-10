"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Search, Star, Trash2, Pencil, ChevronDown } from "lucide-react";
import { formatDateTimeBE } from "@/lib/date-utils";
import { useUser } from "@/providers/UserProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchEventsAction } from "@/app/actions/events";
import type { CareerEvent } from "@/lib/schema";
import { slugifyEventName, CSV_UTF8_BOM } from "@/lib/utils/slugify";
import { Input } from "@/components/ui/input";
import { getScanningDisplayValues, hasScanningColumns, type ScanningColumns } from "@/lib/utils/scanning-columns";

type AttendantScan = {
  id: string;
  attendant_uuid: string;
  scanned_at: string;
  liked?: boolean;
  comment?: string | null;
  feedback_updated_at?: string | null;
  scanned_by: {
    name: string;
    email: string;
  };
  form_response_id: {
    data: Record<string, unknown>;
    submitted_at: string;
    form_version_id: {
      form_id: {
        id: string;
        name: string;
      };
      metadata?: {
        event_id?: string;
        scanning_columns?: ScanningColumns;
        [key: string]: unknown;
      };
    };
  };
};

function getDisplayName(scan: AttendantScan): string {
  const data = scan.form_response_id.data;
  const firstName = (data.firstname as string) || (data.name as string) || "";
  const lastName = (data.lastname as string) || (data.surname as string) || "";
  const formName = `${firstName} ${lastName}`.trim();
  if (formName && formName !== "Unknown") return formName;
  const studentFullName = (data._student_full_name as string) || "";
  if (studentFullName) return studentFullName;
  return "Unknown";
}

export default function EventScansPage() {
  const params = useParams();
  const { user } = useUser();
  const rawEventName = params.eventName as string;
  const eventName = rawEventName ? (rawEventName.includes('%') ? decodeURIComponent(rawEventName) : rawEventName) : '';

  const [scans, setScans] = useState<AttendantScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const [deletingScanId, setDeletingScanId] = useState<string | null>(null);
  const [commentEditScanId, setCommentEditScanId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    if (!eventName || !user?.company?.id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchEventAndScans() {
      try {
        const events = await fetchEventsAction();
        if (!isMounted) return;

        const normalizedEventName = slugifyEventName(eventName);
        const matchingEvent = events?.find(
          (e: CareerEvent) => slugifyEventName(e.name) === normalizedEventName
        );

        if (matchingEvent) {
          setEventId(matchingEvent.id);
          const response = await fetch(`/api/scans?eventId=${encodeURIComponent(matchingEvent.id)}`);
          if (!isMounted) return;
          if (!response.ok) throw new Error("Failed to load scans");
          const data = await response.json();
          setScans(data);
        } else {
          console.warn(`Event "${eventName}" not found, trying to match by form name`);
          const response = await fetch(`/api/scans?event=${encodeURIComponent(eventName)}`);
          if (!isMounted) return;
          if (!response.ok) throw new Error("Failed to load scans");
          const data = await response.json();
          setScans(data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading scans:", err);
        setError("Failed to load scans");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchEventAndScans();
    return () => { isMounted = false; };
  }, [eventName, user?.company?.id]);

  const handleToggleFavourite = async (scanId: string, currentLiked: boolean | undefined) => {
    const newLiked = !currentLiked;
    setScans(prev => prev.map(s => s.id === scanId ? { ...s, liked: newLiked } : s));
    try {
      const res = await fetch(`/api/scans/${scanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: newLiked }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch {
      setScans(prev => prev.map(s => s.id === scanId ? { ...s, liked: currentLiked } : s));
    }
  };

  const handleSaveComment = async () => {
    if (!commentEditScanId) return;
    setSavingComment(true);
    const scanId = commentEditScanId;
    try {
      const res = await fetch(`/api/scans/${scanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentDraft }),
      });
      if (!res.ok) throw new Error("Failed to save comment");
      setScans(prev => prev.map(s => s.id === scanId ? { ...s, comment: commentDraft } : s));
      setCommentEditScanId(null);
      setCommentDraft("");
    } catch {
      setError("Failed to save comment");
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteScan = async () => {
    if (!deletingScanId) return;
    const scanId = deletingScanId;
    setDeletingScanId(null);
    const previousScans = scans;
    setScans(prev => prev.filter(s => s.id !== scanId));
    try {
      const res = await fetch(`/api/scans/${scanId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch {
      setScans(previousScans);
      setError("Failed to delete scan");
    }
  };

  const exportToCSV = () => {
    if (scans.length === 0) {
      alert("No scans to export.");
      return;
    }

    const allFieldKeys = new Set<string>();
    scans.forEach(scan => {
      Object.keys(scan.form_response_id.data).forEach(key => {
        if (!key.startsWith('_')) {
          allFieldKeys.add(key);
        }
      });
    });

    const fieldKeys = Array.from(allFieldKeys);
    const fieldNames = fieldKeys.map(key => {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    });

    const hasFirstNameField = fieldKeys.includes('firstname') || fieldKeys.includes('name');
    const hasLastNameField = fieldKeys.includes('lastname') || fieldKeys.includes('surname');
    const shouldCombineName = hasFirstNameField && hasLastNameField;

    const finalFieldNames: string[] = [];
    const finalFieldKeys: string[] = [];

    fieldKeys.forEach(key => {
      if (shouldCombineName && (key === 'lastname' || key === 'surname')) return;
      if (shouldCombineName && (key === 'firstname' || key === 'name')) {
        finalFieldNames.push('Name');
        finalFieldKeys.push(fieldKeys.includes('firstname') ? 'firstname' : 'name');
      } else {
        finalFieldNames.push(
          key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim()
        );
        finalFieldKeys.push(key);
      }
    });

    const useScanningCols = scans.some(scan =>
      hasScanningColumns(scan.form_response_id?.form_version_id?.metadata?.scanning_columns)
    );

    const headerRow = [
      'Scanned At',
      'Scanned By',
      'Liked',
      'Comment',
      'Registration Date',
      ...(useScanningCols ? ['University', 'Faculty', 'Master', 'Year of study'] : []),
      ...finalFieldNames
    ];

    const dataRows = scans.map(scan => {
      const response = scan.form_response_id;
      const scannedBy = typeof scan.scanned_by === 'object'
        ? scan.scanned_by.name || scan.scanned_by.email
        : 'Unknown';

      const liked = scan.liked ? "Yes" : "";
      const comment = typeof scan.comment === "string" ? scan.comment : "";

      const scanDisplay = useScanningCols
        ? getScanningDisplayValues(response.data, response.form_version_id?.metadata?.scanning_columns)
        : null;
      const scanningFields = useScanningCols && scanDisplay
        ? [scanDisplay.university, scanDisplay.faculty, scanDisplay.master, scanDisplay.yearOfStudy]
        : [];

      const values = finalFieldKeys.map(key => {
        if (shouldCombineName && key === 'firstname') {
          const firstName = response.data['firstname'] || response.data['name'] || '';
          const lastName = response.data['lastname'] || response.data['surname'] || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return fullName;
        }
        const value = response.data[key];
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join('; ');
        return String(value);
      });

      return [
        formatDateTimeBE(scan.scanned_at),
        scannedBy,
        liked,
        comment,
        formatDateTimeBE(response.submitted_at),
        ...scanningFields,
        ...values
      ];
    });

    const escapeCsv = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = CSV_UTF8_BOM + [headerRow, ...dataRows]
      .map(row => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugifyEventName(eventName)}-scans-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const matchesSearch = (scan: AttendantScan, q: string): boolean => {
    if (!q.trim()) return true;
    const lower = q.trim().toLowerCase();
    const data = scan.form_response_id.data;
    const firstName = (data.firstname as string) || (data.name as string) || "";
    const lastName = (data.lastname as string) || (data.surname as string) || "";
    const name = `${firstName} ${lastName}`.trim();
    const email = (data.email as string) || "";
    const studentFullName = (data._student_full_name as string) || "";
    const studentEmail = (data._student_email as string) || "";
    const studentUsername = (data._student_username as string) || "";
    const searchable = [name, email, studentFullName, studentEmail, studentUsername]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(lower);
  };

  const filteredScans = scans
    .filter((scan) => {
      if (favouritesOnly && !scan.liked) return false;
      return matchesSearch(scan, searchQuery);
    })
    .sort((a, b) => {
      const nameA = getDisplayName(a).toLowerCase();
      const nameB = getDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const scanningCols = filteredScans.some(scan =>
    hasScanningColumns(scan.form_response_id?.form_version_id?.metadata?.scanning_columns)
  );

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{eventName} - Scans</h1>
          <p className="text-muted-foreground">View scanned attendants for this event</p>
        </div>
        <Button variant="outline" onClick={exportToCSV} disabled={scans.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scanned Attendants</CardTitle>
          <CardDescription>
            {scans.length} attendant{scans.length !== 1 ? "s" : ""} scanned for this event
          </CardDescription>
          {scans.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={favouritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFavouritesOnly(!favouritesOnly)}
              >
                <Star className={`h-4 w-4 mr-2 ${favouritesOnly ? "fill-current" : ""}`} />
                Favourites only
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No scans yet for this event.</p>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery || favouritesOnly
                  ? "No scans match your filters."
                  : "No scans yet for this event."}
              </p>
              {(searchQuery || favouritesOnly) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setFavouritesOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredScans.map((scan) => {
                const response = scan.form_response_id;
                const displayName = getDisplayName(scan);
                const email = (response.data.email as string) || "";
                const scanCols = getScanningDisplayValues(
                  response.data,
                  response.form_version_id?.metadata?.scanning_columns
                );
                const scannedBy = typeof scan.scanned_by === "object"
                  ? scan.scanned_by.name || scan.scanned_by.email
                  : "Unknown";

                return (
                  <div
                    key={scan.id}
                    className="flex min-h-[180px] flex-col rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{displayName}</p>
                        {email ? (
                          <a
                            href={`mailto:${email}`}
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline break-all"
                          >
                            {email}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={scan.liked ? "Remove from favourites" : "Add to favourites"}
                          onClick={() => handleToggleFavourite(scan.id, scan.liked)}
                        >
                          <Star
                            className={`h-4 w-4 ${scan.liked ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit comment"
                          onClick={() => {
                            setCommentEditScanId(scan.id);
                            setCommentDraft(scan.comment || "");
                          }}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Delete scan"
                          onClick={() => setDeletingScanId(scan.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {scanningCols && (scanCols.university || scanCols.faculty || scanCols.master || scanCols.yearOfStudy) && (
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {scanCols.university && <p><span className="font-medium text-foreground/80">University:</span> {scanCols.university}</p>}
                        {scanCols.faculty && <p><span className="font-medium text-foreground/80">Faculty:</span> {scanCols.faculty}</p>}
                        {scanCols.master && <p><span className="font-medium text-foreground/80">Master:</span> {scanCols.master}</p>}
                        {scanCols.yearOfStudy && <p><span className="font-medium text-foreground/80">Year:</span> {scanCols.yearOfStudy}</p>}
                      </div>
                    )}
                    <div className="mt-auto w-full pt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Scanned {formatDateTimeBE(scan.scanned_at)} by {scannedBy}
                      </p>
                      <Collapsible className="group/collapsible w-full">
                      <CollapsibleTrigger className="flex h-7 w-full cursor-pointer items-center justify-between rounded-md px-0 text-left text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                        <span>Comment</span>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="mt-1 text-sm text-muted-foreground pt-1 border-t">
                          {typeof scan.comment === "string" && scan.comment.trim() ? scan.comment : "—"}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingScanId} onOpenChange={(open) => { if (!open) setDeletingScanId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comment edit dialog */}
      <Dialog open={!!commentEditScanId} onOpenChange={(open) => { if (!open) { setCommentEditScanId(null); setCommentDraft(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit comment</DialogTitle>
            <DialogDescription>
              Add or update a comment for this scan.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Write a comment..."
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCommentEditScanId(null); setCommentDraft(""); }} disabled={savingComment}>
              Cancel
            </Button>
            <Button onClick={handleSaveComment} disabled={savingComment}>
              {savingComment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

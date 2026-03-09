"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, QrCode, Search, Download, Star, Trash2, Pencil } from "lucide-react";
import { formatDateTimeBE } from "@/lib/date-utils";
import { CSV_UTF8_BOM } from "@/lib/utils/slugify";
import { useUser } from "@/providers/UserProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchEventsAction } from "@/app/actions/events";
import type { CareerEvent } from "@/lib/schema";
import { Checkbox } from "@/components/ui/checkbox";

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

export default function AllScansPage() {
  const { user } = useUser();
  const [scans, setScans] = useState<AttendantScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanUrl, setScanUrl] = useState("");
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const [deletingScanId, setDeletingScanId] = useState<string | null>(null);
  const [commentEditScanId, setCommentEditScanId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    fetchEventsAction()
      .then((loadedEvents) => {
        setEvents(loadedEvents || []);
      })
      .catch((err) => {
        console.error("Error loading events:", err);
      });
  }, []);

  const loadScans = React.useCallback(async () => {
    if (!user?.company?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/scans");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to load scans" }));
        throw new Error(errorData.error || `Failed to load scans (${response.status})`);
      }
      const data = await response.json();
      setScans(data);
    } catch (err) {
      console.error("Error loading scans:", err);
      setError(err instanceof Error ? err.message : "Failed to load scans");
    } finally {
      setLoading(false);
    }
  }, [user?.company?.id]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const handleScan = async () => {
    if (!scanUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    const urlMatch = scanUrl.match(/\/attendant\/([a-f0-9-]+)/i);
    if (!urlMatch) {
      setError("Invalid attendant URL. Please use a URL like: /attendant/[UUID]");
      return;
    }

    const uuid = urlMatch[1];
    setScanning(true);
    setError(null);
    setScanSuccess(null);

    try {
      const response = await fetch(`/api/attendant/${uuid}/scan`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to scan attendant");
      }

      await response.json().catch(() => ({}));
      setScanUrl("");
      setScanDialogOpen(false);
      await loadScans();
      setScanSuccess("Scanned.");
    } catch (err) {
      console.error("Error scanning:", err);
      setError(err instanceof Error ? err.message : "Failed to scan attendant");
    } finally {
      setScanning(false);
    }
  };

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

    const hasStudentData = scans.some(scan => scan.form_response_id.data?._student_username || scan.form_response_id.data?._student_email);

    const headerRow = [
      'Event',
      'Name',
      'Scanned At',
      'Scanned By',
      'Liked',
      'Comment',
      'Registration Date',
      ...(hasStudentData ? ['Student University'] : []),
      ...fieldNames
    ];

    const dataRows = scans.map(scan => {
      const response = scan.form_response_id;

      let eventName = '';
      if (typeof response.form_version_id === 'object' && response.form_version_id?.metadata?.event_id) {
        const linkedEvent = events.find(e => e.id === response.form_version_id.metadata?.event_id);
        eventName = linkedEvent?.name || '';
      }
      if (!eventName && typeof response.form_version_id === 'object' && response.form_version_id?.form_id) {
        eventName = typeof response.form_version_id.form_id === 'object'
          ? response.form_version_id.form_id.name
          : '';
      }

      const scannedBy = typeof scan.scanned_by === 'object'
        ? scan.scanned_by.name || scan.scanned_by.email
        : 'Unknown';

      const liked = scan.liked ? "Yes" : "";
      const comment = typeof scan.comment === "string" ? scan.comment : "";

      const studentFields = hasStudentData ? [
        (typeof response.data._student_university === 'string' ? response.data._student_university : '') || '',
      ] : [];

      const values = fieldKeys.map(key => {
        const value = response.data[key];
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join('; ');
        return String(value);
      });

      return [
        eventName,
        getDisplayName(scan),
        formatDateTimeBE(scan.scanned_at),
        scannedBy,
        liked,
        comment,
        formatDateTimeBE(response.submitted_at),
        ...studentFields,
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
    a.download = `all-scans-${new Date().toISOString().split('T')[0]}.csv`;
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

  const filteredScans = scans.filter((scan) => {
    if (favouritesOnly && !scan.liked) return false;
    return matchesSearch(scan, searchQuery);
  });

  const hasStudentColumns = filteredScans.some(scan =>
    scan.form_response_id.data?._student_username || scan.form_response_id.data?._student_email
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
          <h1 className="text-3xl font-bold">All Scans</h1>
          <p className="text-muted-foreground">View and export all scanned attendants across all events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={scans.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <QrCode className="h-4 w-4 mr-2" />
                Scan Attendant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Scan Attendant</DialogTitle>
                <DialogDescription>
                  Enter the attendant URL or scan a QR code to add them to your scans.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scan-url">Attendant URL</Label>
                  <Input
                    id="scan-url"
                    placeholder="https://example.com/attendant/[UUID]"
                    value={scanUrl}
                    onChange={(e) => setScanUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleScan();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the attendant URL or scan a QR code
                  </p>
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScanDialogOpen(false);
                      setScanUrl("");
                      setError(null);
                    }}
                    disabled={scanning}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleScan} disabled={scanning || !scanUrl.trim()}>
                    {scanning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Scan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {scanSuccess && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded">
          {scanSuccess}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Scanned Attendants</CardTitle>
          <CardDescription>
            {scans.length} attendant{scans.length !== 1 ? "s" : ""} scanned across all events
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="favourites"
                  checked={favouritesOnly}
                  onCheckedChange={(checked) => setFavouritesOnly(checked === true)}
                />
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Favourites only
                </span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {error && !scanDialogOpen ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4 font-medium">Error loading scans</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => {
                setError(null);
                setLoading(true);
                loadScans();
              }}>
                Retry
              </Button>
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No scans yet.</p>
              <Button onClick={() => setScanDialogOpen(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                Scan Your First Attendant
              </Button>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery || favouritesOnly
                  ? "No scans match your filters."
                  : "No scans yet."}
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
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {hasStudentColumns && (
                      <TableHead>Student University</TableHead>
                    )}
                    <TableHead>Event</TableHead>
                    <TableHead>Scanned At</TableHead>
                    <TableHead>Scanned By</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScans.map((scan) => {
                    const response = scan.form_response_id;
                    const displayName = getDisplayName(scan);
                    const email = response.data.email as string || "N/A";

                    let eventName = '';
                    if (typeof response.form_version_id === 'object' && response.form_version_id?.metadata?.event_id) {
                      const linkedEvent = events.find(e => e.id === response.form_version_id.metadata?.event_id);
                      eventName = linkedEvent?.name || '';
                    }
                    if (!eventName && typeof response.form_version_id === 'object' && response.form_version_id?.form_id) {
                      eventName = typeof response.form_version_id.form_id === 'object'
                        ? response.form_version_id.form_id.name
                        : '';
                    }

                    return (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">{displayName}</TableCell>
                        <TableCell>{email}</TableCell>
                        {hasStudentColumns && (
                          <TableCell>{(typeof response.data._student_university === 'string' ? response.data._student_university : '') || 'N/A'}</TableCell>
                        )}
                        <TableCell>{eventName}</TableCell>
                        <TableCell>{formatDateTimeBE(scan.scanned_at)}</TableCell>
                        <TableCell>
                          {typeof scan.scanned_by === 'object'
                            ? scan.scanned_by.name || scan.scanned_by.email
                            : 'Unknown'}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          {typeof scan.comment === "string" && scan.comment.trim() ? (
                            <span className="text-sm text-muted-foreground truncate block">
                              {scan.comment}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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

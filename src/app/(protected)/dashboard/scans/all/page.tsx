"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, QrCode, Search, Download } from "lucide-react";
import { formatDateTimeBE } from "@/lib/date-utils";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchEventsAction } from "@/app/actions/events";
import type { CareerEvent } from "@/lib/schema";

type AttendantScan = {
  id: string;
  attendant_uuid: string;
  scanned_at: string;
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

export default function AllScansPage() {
  const { user } = useUser();
  const [scans, setScans] = useState<AttendantScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanUrl, setScanUrl] = useState("");
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CareerEvent[]>([]);

  // Load events to map event_id to event names
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

    // Extract UUID from URL
    const urlMatch = scanUrl.match(/\/attendant\/([a-f0-9-]+)/i);
    if (!urlMatch) {
      setError("Invalid attendant URL. Please use a URL like: /attendant/[UUID]");
      return;
    }

    const uuid = urlMatch[1];
    setScanning(true);
    setError(null);

    try {
      const response = await fetch(`/api/attendant/${uuid}/scan`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to scan attendant");
      }

      // Success - reload scans and close dialog
      setScanUrl("");
      setScanDialogOpen(false);
      await loadScans();
    } catch (err) {
      console.error("Error scanning:", err);
      setError(err instanceof Error ? err.message : "Failed to scan attendant");
    } finally {
      setScanning(false);
    }
  };

  const exportToCSV = () => {
    if (scans.length === 0) {
      alert("No scans to export.");
      return;
    }

    // Collect all unique field names from all responses
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

    // Check if any scan has student data
    const hasStudentData = scans.some(scan => scan.form_response_id.data?._student_username || scan.form_response_id.data?._student_email);

    // Prepare data for CSV
    const headerRow = [
      'Event', 
      'Scanned At', 
      'Scanned By', 
      'Registration Date',
      ...(hasStudentData ? ['Student Username', 'Student Email', 'Student Full Name', 'Student University', 'Student University Status'] : []),
      ...fieldNames
    ];
    
    const dataRows = scans.map(scan => {
      const response = scan.form_response_id;
      
      // Get event name: prefer from linked event_id, fall back to form name
      let eventName = '';
      if (typeof response.form_version_id === 'object' && response.form_version_id?.metadata?.event_id) {
        const linkedEvent = events.find(e => e.id === response.form_version_id.metadata?.event_id);
        eventName = linkedEvent?.name || '';
      }
      
      // Fall back to form name if no linked event found
      if (!eventName && typeof response.form_version_id === 'object' && response.form_version_id?.form_id) {
        eventName = typeof response.form_version_id.form_id === 'object' 
          ? response.form_version_id.form_id.name 
          : '';
      }
      
      const scannedBy = typeof scan.scanned_by === 'object' 
        ? scan.scanned_by.name || scan.scanned_by.email 
        : 'Unknown';

      // Add student fields if applicable
      const studentFields = hasStudentData ? [
        (typeof response.data._student_username === 'string' ? response.data._student_username : '') || '',
        (typeof response.data._student_email === 'string' ? response.data._student_email : '') || '',
        (typeof response.data._student_full_name === 'string' ? response.data._student_full_name : '') || '',
        (typeof response.data._student_university === 'string' ? response.data._student_university : '') || '',
        (typeof response.data._student_university_status === 'string' ? response.data._student_university_status : '') || '',
      ] : [];

      const values = fieldKeys.map(key => {
        const value = response.data[key];
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join('; ');
        return String(value);
      });

      return [
        eventName,
        formatDateTimeBE(scan.scanned_at),
        scannedBy,
        formatDateTimeBE(response.submitted_at),
        ...studentFields,
        ...values
      ];
    });

    const escapeCsv = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [headerRow, ...dataRows]
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

      <Card>
        <CardHeader>
          <CardTitle>All Scanned Attendants</CardTitle>
          <CardDescription>
            {scans.length} attendant{scans.length !== 1 ? "s" : ""} scanned across all events
          </CardDescription>
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
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {scans.some(scan => scan.form_response_id.data?._student_username || scan.form_response_id.data?._student_email) && (
                      <>
                        <TableHead>Student Username</TableHead>
                        <TableHead>Student Email</TableHead>
                        <TableHead>Student Full Name</TableHead>
                        <TableHead>Student University</TableHead>
                        <TableHead>Student University Status</TableHead>
                      </>
                    )}
                    <TableHead>Event</TableHead>
                    <TableHead>Scanned At</TableHead>
                    <TableHead>Scanned By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map((scan) => {
                    const response = scan.form_response_id;
                    // Support both new format (firstname/lastname) and old format (name/surname)
                    const firstName = (response.data.firstname as string) || (response.data.name as string) || "";
                    const lastName = (response.data.lastname as string) || (response.data.surname as string) || "";
                    const name = `${firstName} ${lastName}`.trim() || "Unknown";
                    const email = response.data.email as string || "N/A";
                    
                    // Get event name: prefer from linked event_id, fall back to form name
                    let eventName = '';
                    if (typeof response.form_version_id === 'object' && response.form_version_id?.metadata?.event_id) {
                      const linkedEvent = events.find(e => e.id === response.form_version_id.metadata?.event_id);
                      eventName = linkedEvent?.name || '';
                    }
                    
                    // Fall back to form name if no linked event found
                    if (!eventName && typeof response.form_version_id === 'object' && response.form_version_id?.form_id) {
                      eventName = typeof response.form_version_id.form_id === 'object' 
                        ? response.form_version_id.form_id.name 
                        : '';
                    }

                    return (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{email}</TableCell>
                        {scans.some(s => s.form_response_id.data?._student_username || s.form_response_id.data?._student_email) && (
                          <>
                            <TableCell>{(typeof response.data._student_username === 'string' ? response.data._student_username : '') || 'N/A'}</TableCell>
                            <TableCell>{(typeof response.data._student_email === 'string' ? response.data._student_email : '') || 'N/A'}</TableCell>
                            <TableCell>{(typeof response.data._student_full_name === 'string' ? response.data._student_full_name : '') || 'N/A'}</TableCell>
                            <TableCell>{(typeof response.data._student_university === 'string' ? response.data._student_university : '') || 'N/A'}</TableCell>
                            <TableCell>{(typeof response.data._student_university_status === 'string' ? response.data._student_university_status : '') || 'N/A'}</TableCell>
                          </>
                        )}
                        <TableCell>{eventName}</TableCell>
                        <TableCell>{formatDateTimeBE(scan.scanned_at)}</TableCell>
                        <TableCell>
                          {typeof scan.scanned_by === 'object' 
                            ? scan.scanned_by.name || scan.scanned_by.email 
                            : 'Unknown'}
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
    </div>
  );
}


"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Search } from "lucide-react";
import { formatDateTimeBE } from "@/lib/date-utils";
import { useUser } from "@/providers/UserProvider";
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
import { slugifyEventName, CSV_UTF8_BOM } from "@/lib/utils/slugify";
import { Input } from "@/components/ui/input";
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

export default function EventScansPage() {
  const params = useParams();
  const { user } = useUser();
  // Next.js already decodes route parameters, but handle potential double-encoding
  const rawEventName = params.eventName as string;
  const eventName = rawEventName ? (rawEventName.includes('%') ? decodeURIComponent(rawEventName) : rawEventName) : '';
  
  const [scans, setScans] = useState<AttendantScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  // Find event ID from event name first, then load scans
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
        // First, find the event by name (try exact match first, then case-insensitive)
        const events = await fetchEventsAction();
        if (!isMounted) return;

        // Match by slug (handles accents: "Café Career" matches "cafe-career")
        const normalizedEventName = slugifyEventName(eventName);
        const matchingEvent = events?.find(
          (e: CareerEvent) => slugifyEventName(e.name) === normalizedEventName
        );

        if (matchingEvent) {
          setEventId(matchingEvent.id);
          
          // Load scans using eventId (preferred method)
          const response = await fetch(`/api/scans?eventId=${encodeURIComponent(matchingEvent.id)}`);
          if (!isMounted) return;
          
          if (!response.ok) {
            throw new Error("Failed to load scans");
          }
          const data = await response.json();
          setScans(data);
        } else {
          // Event not found by name, try using eventName directly (might match form name)
          console.warn(`Event "${eventName}" not found, trying to match by form name`);
          const response = await fetch(`/api/scans?event=${encodeURIComponent(eventName)}`);
          if (!isMounted) return;
          
          if (!response.ok) {
            throw new Error("Failed to load scans");
          }
          const data = await response.json();
          setScans(data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading scans:", err);
        setError("Failed to load scans");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchEventAndScans();

    return () => {
      isMounted = false;
    };
  }, [eventName, user?.company?.id]);

  const exportToCSV = () => {
    if (scans.length === 0) {
      alert("No scans to export.");
      return;
    }

    // Get all unique field names from all responses
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

    // Check if both firstname and lastname fields exist (or name and surname for old format)
    const hasFirstNameField = fieldKeys.includes('firstname') || fieldKeys.includes('name');
    const hasLastNameField = fieldKeys.includes('lastname') || fieldKeys.includes('surname');
    const shouldCombineName = hasFirstNameField && hasLastNameField;

    // Build field names and keys, combining firstname and lastname if both exist
    const finalFieldNames: string[] = [];
    const finalFieldKeys: string[] = [];

    fieldKeys.forEach(key => {
      if (shouldCombineName && (key === 'lastname' || key === 'surname')) {
        return; // Skip lastname/surname - it will be combined with firstname/name
      }
      if (shouldCombineName && (key === 'firstname' || key === 'name')) {
        finalFieldNames.push('Name');
        // Use firstname if available, otherwise name
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

    // Check if any scan has student data
    const hasStudentData = scans.some(scan => scan.form_response_id.data?._student_username || scan.form_response_id.data?._student_email);

    // Prepare data for CSV
    const headerRow = [
      'Scanned At', 
      'Scanned By', 
      'Liked',
      'Comment',
      'Registration Date',
      ...(hasStudentData ? ['Student Username', 'Student Email', 'Student Full Name', 'Student University', 'Student University Status'] : []),
      ...finalFieldNames
    ];
    
    const dataRows = scans.map(scan => {
      const response = scan.form_response_id;
      const scannedBy = typeof scan.scanned_by === 'object' 
        ? scan.scanned_by.name || scan.scanned_by.email 
        : 'Unknown';

      const liked = scan.liked ? "Yes" : "";
      const comment = typeof scan.comment === "string" ? scan.comment : "";

      // Add student fields if applicable
      const studentFields = hasStudentData ? [
        (typeof response.data._student_username === 'string' ? response.data._student_username : '') || '',
        (typeof response.data._student_email === 'string' ? response.data._student_email : '') || '',
        (typeof response.data._student_full_name === 'string' ? response.data._student_full_name : '') || '',
        (typeof response.data._student_university === 'string' ? response.data._student_university : '') || '',
        (typeof response.data._student_university_status === 'string' ? response.data._student_university_status : '') || '',
      ] : [];

      const values = finalFieldKeys.map(key => {
        if (shouldCombineName && key === 'firstname') {
          // Combine firstname and lastname (or name and surname for old format)
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

  const filteredScans = scans.filter((scan) => {
    if (favouritesOnly && !scan.liked) return false;
    return matchesSearch(scan, searchQuery);
  });

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
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {filteredScans.some(scan => scan.form_response_id.data?._student_username || scan.form_response_id.data?._student_email) && (
                      <>
                        <TableHead>Student Username</TableHead>
                        <TableHead>Student Email</TableHead>
                        <TableHead>Student Full Name</TableHead>
                        <TableHead>Student University</TableHead>
                        <TableHead>Student University Status</TableHead>
                      </>
                    )}
                    <TableHead>Scanned At</TableHead>
                    <TableHead>Scanned By</TableHead>
                    <TableHead className="text-right">Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScans.map((scan) => {
                    const response = scan.form_response_id;
                    // Support both new format (firstname/lastname) and old format (name/surname)
                    const firstName = (response.data.firstname as string) || (response.data.name as string) || "";
                    const lastName = (response.data.lastname as string) || (response.data.surname as string) || "";
                    const name = `${firstName} ${lastName}`.trim() || "Unknown";
                    const email = response.data.email as string || "N/A";
                    const hasStudentData = response.data?._student_username || response.data?._student_email;

                    return (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{email}</TableCell>
                        {filteredScans.some(s => s.form_response_id.data?._student_username || s.form_response_id.data?._student_email) && (
                          <>
                            <TableCell>{(typeof response.data._student_username === 'string' ? response.data._student_username : '') || 'N/A'}</TableCell>
                            <TableCell>{(typeof response.data._student_email === 'string' ? response.data._student_email : '') || 'N/A'}</TableCell>
                            <TableCell>{(typeof response.data._student_full_name === 'string' ? response.data._student_full_name : '') || 'N/A'}</TableCell>
                            <TableCell>{(typeof response.data._student_university === 'string' ? response.data._student_university : '') || 'N/A'}</TableCell>
                            <TableCell>{(typeof response.data._student_university_status === 'string' ? response.data._student_university_status : '') || 'N/A'}</TableCell>
                          </>
                        )}
                        <TableCell>{formatDateTimeBE(scan.scanned_at)}</TableCell>
                        <TableCell>
                          {typeof scan.scanned_by === 'object' 
                            ? scan.scanned_by.name || scan.scanned_by.email 
                            : 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1 text-sm">
                            {scan.liked ? (
                              <span className="font-medium">Liked</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {typeof scan.comment === "string" && scan.comment.trim() ? (
                              <span className="text-muted-foreground max-w-[260px] truncate">
                                {scan.comment}
                              </span>
                            ) : null}
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
    </div>
  );
}


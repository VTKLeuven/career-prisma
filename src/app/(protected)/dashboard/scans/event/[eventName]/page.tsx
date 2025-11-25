"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
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
import * as XLSX from "xlsx";
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

export default function EventScansPage() {
  const params = useParams();
  const { user } = useUser();
  const eventName = decodeURIComponent(params.eventName as string);
  
  const [scans, setScans] = useState<AttendantScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  // Find event ID from event name
  useEffect(() => {
    if (!eventName) return;
    
    fetchEventsAction()
      .then((events) => {
        const matchingEvent = events?.find(
          (e: CareerEvent) => e.name === eventName
        );
        if (matchingEvent) {
          setEventId(matchingEvent.id);
        }
      })
      .catch((err) => {
        console.error("Error fetching events:", err);
      });
  }, [eventName]);

  const loadScans = React.useCallback(async () => {
    if (!user?.company?.id) {
      setLoading(false);
      return;
    }

    try {
      // Use eventId if available (preferred), otherwise fall back to eventName
      const url = eventId
        ? `/api/scans?eventId=${encodeURIComponent(eventId)}`
        : `/api/scans?event=${encodeURIComponent(eventName)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load scans");
      }
      const data = await response.json();
      setScans(data);
    } catch (err) {
      console.error("Error loading scans:", err);
      setError("Failed to load scans");
    } finally {
      setLoading(false);
    }
  }, [user?.company?.id, eventName, eventId]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const exportToXLSX = () => {
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

    // Prepare data for XLSX
    const headerRow = ['Scanned At', 'Scanned By', 'Registration Date', ...finalFieldNames];
    
    const dataRows = scans.map(scan => {
      const response = scan.form_response_id;
      const scannedBy = typeof scan.scanned_by === 'object' 
        ? scan.scanned_by.name || scan.scanned_by.email 
        : 'Unknown';

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
        formatDateTimeBE(response.submitted_at),
        ...values
      ];
    });

    // Create worksheet
    const worksheetData = [headerRow, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scans');

    // Generate XLSX file
    const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventName.replace(/[^a-z0-9]/gi, '-')}-scans-${new Date().toISOString().split('T')[0]}.xlsx`;
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
          <h1 className="text-3xl font-bold">{eventName} - Scans</h1>
          <p className="text-muted-foreground">View scanned attendants for this event</p>
        </div>
        <Button variant="outline" onClick={exportToXLSX} disabled={scans.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export XLSX
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scanned Attendants</CardTitle>
          <CardDescription>
            {scans.length} attendant{scans.length !== 1 ? "s" : ""} scanned for this event
          </CardDescription>
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
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
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

                    return (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{email}</TableCell>
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


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

  const loadScans = React.useCallback(async () => {
    if (!user?.company?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/scans?event=${encodeURIComponent(eventName)}`);
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
  }, [user?.company?.id, eventName]);

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

    // Check if both firstname and lastname fields exist
    const hasFirstNameField = fieldKeys.includes('firstname');
    const hasLastNameField = fieldKeys.includes('lastname');
    const shouldCombineName = hasFirstNameField && hasLastNameField;

    // Build field names and keys, combining firstname and lastname if both exist
    const finalFieldNames: string[] = [];
    const finalFieldKeys: string[] = [];

    fieldKeys.forEach(key => {
      if (shouldCombineName && key === 'lastname') {
        return; // Skip lastname - it will be combined with firstname
      }
      if (shouldCombineName && key === 'firstname') {
        finalFieldNames.push('Name');
        finalFieldKeys.push('firstname');
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
          // Combine firstname and lastname
          const firstName = response.data['firstname'] || '';
          const lastName = response.data['lastname'] || '';
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
                    const firstName = response.data.firstname as string || "";
                    const lastName = response.data.lastname as string || "";
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

